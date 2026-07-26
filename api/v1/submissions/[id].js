const jwt = require('jsonwebtoken');
const {
  getLead,
  updateLead,
  readConversion,
  getContact,
  updateContact,
  getTasksForContact,
  createTask,
  resolveProductDeal
} = require('../../_utils/zoho');
const { canonicalProduct, validateLeadEnrichment } = require('../../_utils/products');

const JWT_SECRET = process.env.JWT_SECRET;
// Raw job title -> this text field (default Job_Title_Raw). Never the Job_Title picklist.
const JOBTITLE_RAW_FIELD = process.env.ZOHO_LEAD_JOBTITLE_RAW_FIELD || 'Job_Title_Raw';

// Bounded backoff (ms) for the LEAD path only — Lead conversion is asynchronous.
// The Contact path invokes no automation, so its Deal either exists now or not.
const DEAL_BACKOFF = [800, 1500, 2500];
const CONVERSION_BACKOFF = [1000, 2000, 3000, 4000, 5000];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function fail(res, status, code, message, extra) {
  return res.status(status).json(Object.assign({ error: message || code, code }, extra || {}));
}

function normalizeDeal(result) {
  if (result.status === 'one') return { dealId: result.deal.id };
  return { error: true, reason: result.status === 'many' ? 'deal_ambiguous' : 'deal_unresolved' };
}

// Lead path: the converted graph's Deal may appear a beat after conversion.
async function resolveDealWithBackoff(accountId, product) {
  let result = await resolveProductDeal(accountId, product);
  for (const delay of DEAL_BACKOFF) {
    if (result.status === 'one') break;
    await sleep(delay);
    result = await resolveProductDeal(accountId, product);
  }
  return normalizeDeal(result);
}

// Contact path: a single exact lookup — no automation is invoked, so no backoff.
async function resolveDealOnce(accountId, product) {
  return normalizeDeal(await resolveProductDeal(accountId, product));
}

// --- Contact-only Manual Review Task (mirrors createManualReview.deluge) --------
const REASON_TEXT = {
  deal_unresolved: "No matching open Product Deal exists for the Contact's current Account.",
  deal_ambiguous: 'Multiple open Product Deals match the selected product; the correct one is ambiguous.',
  no_product_selected: 'The visitor did not select a bookable product.'
};
const reviewSubject = (journeyId) => `Jurnii website manual review [${journeyId}]`;

/**
 * Creates or reuses a Contact-scoped Manual Review Task so the case is actionable
 * in CRM. Idempotent per journey via the Contact's OPEN Tasks (related-records
 * read — no Search API). No What_Id (Contact-only), so the sequence completion
 * handler deliberately ignores it. Created with trigger:[] (informational).
 */
async function ensureManualReviewTask({ journeyId, contactId, product, reason }) {
  const subject = reviewSubject(journeyId);
  const openTasks = await getTasksForContact(contactId);
  const existing = openTasks.find(t =>
    t && t.Task_Type === 'Manual Review'
    && (t.Status === 'Not Started' || t.Status === 'In Progress')
    && t.Subject === subject
  );
  if (existing) return existing.id;

  const description = [
    `[${reason}]`,
    '',
    `Journey: ${journeyId}`,
    `Product: ${product || 'Not selected'}`,
    `Reason: ${REASON_TEXT[reason] || reason}`,
    '',
    'No Deal is linked. Completing this task does not automatically advance a sequence.'
  ].join('\n');

  return createTask({
    Subject: subject,
    Status: 'In Progress',
    Who_Id: { id: contactId },
    $se_module: 'Contacts',
    Task_Type: 'Manual Review',
    Blocks_Sequence: 'Yes',
    Task_Status: 'Working',
    Task_State: 'Open',
    Description: description
  }, { trigger: [] });
}

// A Manual Review that has a resolved Contact: raise (best-effort) the Task, then 409.
async function manualReview(res, { journeyId, contactId, product, reason, message }) {
  try {
    await ensureManualReviewTask({ journeyId, contactId, product, reason });
  } catch (e) {
    console.warn(`[submissions] manual-review task not created for journey ${journeyId} (${e.code || e.message})`);
  }
  return fail(res, 409, 'MANUAL_REVIEW', message, { reason });
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
      const outcome = await runContactPath({ recordId, company, jobTitle, phone, country, product });
      if (outcome.fail) return fail(res, outcome.status, outcome.code, outcome.message, outcome.extra);
      ({ contactId, accountId } = outcome);
    } else if (recordType === 'Lead') {
      const outcome = await runLeadPath({ recordId, company, jobTitle, phone, country, product });
      if (outcome.fail) return fail(res, outcome.status, outcome.code, outcome.message, outcome.extra);
      ({ contactId, accountId } = outcome);
    } else {
      return fail(res, 400, 'validation', 'Unknown record type on token.');
    }

    // Resolve the exact single Product Deal (backoff only on the Lead path).
    if (!product) {
      console.warn(`[submissions] no product selected (contact ${contactId})`);
      return manualReview(res, { journeyId: id, contactId, product: productInterest, reason: 'no_product_selected', message: "We'll tailor the right session for you — our team will reach out to schedule." });
    }
    const deal = (recordType === 'Lead')
      ? await resolveDealWithBackoff(accountId, product)
      : await resolveDealOnce(accountId, product);
    if (deal.error) {
      console.warn(`[submissions] product deal ${deal.reason} for account ${accountId} product ${product} (contact ${contactId})`);
      return manualReview(res, { journeyId: id, contactId, product: productInterest, reason: deal.reason, message: 'Your registration is complete; our team will confirm the right session.' });
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
// Contact path (KISS): update the existing Contact and read its existing Account
// + exact Product Deal. No Account create, no reconciliation, no processContact.
// The additive Product_Interest is persisted even when the Deal is missing so the
// Manual Review Task carries the evidence a rep needs.
// ---------------------------------------------------------------------------
async function runContactPath({ recordId, company, jobTitle, phone, country, product }) {
  const contact = await getContact(recordId);
  if (!contact) return { fail: true, status: 502, code: 'contact_not_found', message: 'Your registration could not be found. Please restart.' };

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
  try {
    await updateContact(recordId, validation.record, { trigger: [] }); // persist enrichment; no reconcile
  } catch (e) {
    console.warn(`[submissions] enrichment rejected by Zoho for contact ${recordId} (${e.code || e.message})`);
    return { fail: true, status: 409, code: 'MANUAL_REVIEW', message: 'We could not process some of your details; our team will follow up.', extra: { reason: 'enrichment_rejected' } };
  }

  // Use the Contact's EXISTING Account only — never created/linked by the website.
  const accountId = (contact.Account_Name && contact.Account_Name.id) ? contact.Account_Name.id : null;
  return { contactId: recordId, accountId };
}
