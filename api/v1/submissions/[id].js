const jwt = require('jsonwebtoken');
const {
  getLead,
  updateLead,
  readConversion,
  getContact,
  updateContact,
  reconcileContact,
  resolveProductDeal
} = require('../../_utils/zoho');
const { canonicalProduct, validateLeadEnrichment } = require('../../_utils/products');
const { resolveAccountForContact } = require('../../_utils/account');

const JWT_SECRET = process.env.JWT_SECRET;
// Raw job title -> this text field (default Job_Title_Raw). Never the Job_Title picklist.
const JOBTITLE_RAW_FIELD = process.env.ZOHO_LEAD_JOBTITLE_RAW_FIELD || 'Job_Title_Raw';

// Bounded backoff (ms). Serverless-safe; the retry-resume path makes a timeout
// harmless (a later PATCH resumes from the already-reconciled record).
const CONVERSION_BACKOFF = [1000, 2000, 3000, 4000, 5000];
const DEAL_BACKOFF = [800, 1500, 2500];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function fail(res, status, code, message, extra) {
  return res.status(status).json(Object.assign({ error: message || code, code }, extra || {}));
}

// Resolves the exact single Product Deal for an Account with bounded backoff.
// Returns { dealId } or a fail() sentinel { error, reason }.
async function resolveDealWithBackoff(accountId, product) {
  let result = await resolveProductDeal(accountId, product);
  for (const delay of DEAL_BACKOFF) {
    if (result.status === 'one') break;
    await sleep(delay);
    result = await resolveProductDeal(accountId, product);
  }
  if (result.status === 'one') return { dealId: result.deal.id };
  return { error: true, reason: result.status === 'many' ? 'deal_ambiguous' : 'deal_unresolved' };
}

// The path id is the journeyId (a client-generated correlation key). CRM identity
// travels as recordType/recordId in the signed token — never the path id.
module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') return fail(res, 405, 'method_not_allowed', 'Method not allowed');

  const { id } = req.query;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return fail(res, 401, 'auth_required', 'Unauthorized');

  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch (err) {
    return fail(res, 401, 'auth_invalid', 'Unauthorized');
  }

  if (decoded.journeyId !== id) return fail(res, 403, 'forbidden', 'Token does not match this journey.');
  if (decoded.step !== 1) return fail(res, 409, 'wrong_step', 'This step has already been completed.');

  const { company, jobTitle, phone, country, productInterest } = req.body || {};
  if (!company || !jobTitle) return fail(res, 400, 'validation', 'Missing required fields: company, jobTitle');

  const { recordType, recordId } = decoded;
  const product = canonicalProduct(productInterest);

  try {
    let contactId, accountId;

    if (recordType === 'Contact') {
      const outcome = await runContactPath({ recordId, email: decoded.email, company, jobTitle, phone, country, product });
      if (outcome.fail) return fail(res, outcome.status, outcome.code, outcome.message, outcome.extra);
      ({ contactId, accountId } = outcome);
    } else if (recordType === 'Lead') {
      const outcome = await runLeadPath({ recordId, company, jobTitle, phone, country, product });
      if (outcome.fail) return fail(res, outcome.status, outcome.code, outcome.message, outcome.extra);
      ({ contactId, accountId } = outcome);
    } else {
      return fail(res, 400, 'validation', 'Unknown record type on token.');
    }

    // Resolve the exact single Product Deal (both paths converge here).
    if (!product) {
      console.warn(`[submissions] no product selected (contact ${contactId})`);
      return fail(res, 409, 'MANUAL_REVIEW', "We'll tailor the right session for you — our team will reach out to schedule.", { reason: 'no_product_selected' });
    }
    const deal = await resolveDealWithBackoff(accountId, product);
    if (deal.error) {
      console.warn(`[submissions] product deal ${deal.reason} for account ${accountId} product ${product} (contact ${contactId})`);
      return fail(res, 409, 'MANUAL_REVIEW', 'Your registration is complete; our team will confirm the right session.', { reason: deal.reason });
    }

    // Issue the step-2 token carrying the resolved graph ids.
    const nextToken = jwt.sign(
      {
        journeyId: id,
        recordType,
        recordId,
        email: decoded.email,
        contactId,
        accountId,
        dealId: deal.dealId,
        step: 2,
        purpose: 'flow'
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({ token: nextToken, step: 2, contactId, dealId: deal.dealId });
  } catch (error) {
    console.error('[submissions] error:', error.code || error.message);
    return fail(res, 502, error.code || 'submission_update_failed', 'Could not process your details. Please try again.');
  }
};

// ---------------------------------------------------------------------------
// Lead path: ONE enrichment update (triggers enabled) fires WF001a Process Lead
// which converts and builds the graph. Retry-safe (already-converted → resume).
// ---------------------------------------------------------------------------
async function runLeadPath({ recordId, company, jobTitle, phone, country, product }) {
  let lead = await getLead(recordId);
  if (!lead) return { fail: true, status: 502, code: 'lead_not_found', message: 'Your registration could not be found. Please restart.' };

  let conv = readConversion(lead);

  if (!conv.converted) {
    const validation = validateLeadEnrichment({
      company, jobTitle, phone, country, product,
      rawTitleField: JOBTITLE_RAW_FIELD,
      existingProducts: lead.Product_Interest
    });
    if (!validation.ok) {
      console.warn(`[submissions] enrichment validation failed for lead ${recordId} (${validation.reason}); Lead left unconverted`);
      return { fail: true, status: 409, code: 'MANUAL_REVIEW', message: 'Some of your details need review; our team will follow up.', extra: { reason: validation.reason } };
    }
    try {
      await updateLead(recordId, validation.record); // ONE update, triggers ENABLED
    } catch (e) {
      console.warn(`[submissions] enrichment rejected by Zoho for lead ${recordId} (${e.code || e.message}); Lead preserved unconverted`);
      return { fail: true, status: 409, code: 'MANUAL_REVIEW', message: 'We could not process some of your details; our team will follow up.', extra: { reason: 'enrichment_rejected' } };
    }

    for (const delay of CONVERSION_BACKOFF) {
      await sleep(delay);
      lead = await getLead(recordId);
      conv = readConversion(lead);
      if (conv.converted && conv.contactId) break;
    }
  }

  if (!conv.converted || !conv.contactId || !conv.accountId) {
    console.warn(`[submissions] conversion unresolved for lead ${recordId} (converted=${conv.converted} contact=${conv.contactId} account=${conv.accountId})`);
    return { fail: true, status: 409, code: 'MANUAL_REVIEW', message: 'Your details are being processed; our team will follow up shortly.', extra: { reason: 'conversion_unresolved' } };
  }
  return { contactId: conv.contactId, accountId: conv.accountId };
}

// ---------------------------------------------------------------------------
// Contact path: resolve the Account, persist enrichment (suppressed), then fire
// processContact explicitly so the existing Deluge automation builds the Deal.
// No throwaway Lead; the website never reimplements commercial logic.
// ---------------------------------------------------------------------------
async function runContactPath({ recordId, email, company, jobTitle, phone, country, product }) {
  const contact = await getContact(recordId);
  if (!contact) return { fail: true, status: 502, code: 'contact_not_found', message: 'Your registration could not be found. Please restart.' };

  const contactAccountId = (contact.Account_Name && contact.Account_Name.id) ? contact.Account_Name.id : null;

  // Resolve the canonical Account BEFORE reconciliation (never name one after the person).
  const acct = await resolveAccountForContact({ contactId: recordId, contactAccountId, email, company });
  if (acct.status === 'conflict') {
    console.warn(`[submissions] account_conflict for contact ${recordId}`);
    return { fail: true, status: 409, code: 'MANUAL_REVIEW', message: 'Your company details need review; our team will follow up.', extra: { reason: 'account_conflict' } };
  }
  if (acct.status === 'ambiguous') {
    console.warn(`[submissions] account_ambiguous for contact ${recordId}`);
    return { fail: true, status: 409, code: 'MANUAL_REVIEW', message: 'Your company details need review; our team will follow up.', extra: { reason: 'account_ambiguous' } };
  }
  const accountId = acct.accountId;

  // Build the Contact enrichment payload (NO Company field; additive Product_Interest).
  const validation = validateLeadEnrichment({
    company, jobTitle, phone, country, product,
    rawTitleField: JOBTITLE_RAW_FIELD,
    includeCompany: false,
    existingProducts: contact.Product_Interest
  });
  if (!validation.ok) {
    console.warn(`[submissions] enrichment validation failed for contact ${recordId} (${validation.reason})`);
    return { fail: true, status: 409, code: 'MANUAL_REVIEW', message: 'Some of your details need review; our team will follow up.', extra: { reason: validation.reason } };
  }
  const record = validation.record;
  // Link the resolved Account onto the Contact if it had none.
  if (!contactAccountId) record.Account_Name = { id: accountId };

  try {
    await updateContact(recordId, record, { trigger: [] }); // suppressed — reconcile explicitly
  } catch (e) {
    console.warn(`[submissions] enrichment rejected by Zoho for contact ${recordId} (${e.code || e.message})`);
    return { fail: true, status: 409, code: 'MANUAL_REVIEW', message: 'We could not process some of your details; our team will follow up.', extra: { reason: 'enrichment_rejected' } };
  }

  // Fire the existing processContact automation (deterministic; builds the Deal).
  // FAIL CLOSED: if the invocation errors we do NOT proceed to book.
  try {
    await reconcileContact(recordId);
  } catch (e) {
    console.warn(`[submissions] processContact invocation failed for contact ${recordId} (${e.code || e.message})`);
    return { fail: true, status: 409, code: 'MANUAL_REVIEW', message: 'Your details are being processed; our team will follow up shortly.', extra: { reason: 'reconcile_failed' } };
  }

  return { contactId: recordId, accountId };
}
