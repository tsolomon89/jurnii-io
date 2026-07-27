const jwt = require('jsonwebtoken');
const {
  getLead,
  updateLead,
  readConversion,
  getContact,
  updateContact,
  searchContactsByEmail
} = require('../../_utils/zoho');
const { canonicalProduct, validateLeadEnrichment } = require('../../_utils/products');

const JWT_SECRET = process.env.JWT_SECRET;
// Raw job title -> this text field (default Job_Title_Raw). Never the Job_Title picklist.
const JOBTITLE_RAW_FIELD = process.env.ZOHO_LEAD_JOBTITLE_RAW_FIELD || 'Job_Title_Raw';

function fail(res, status, code, message, extra) {
  return res.status(status).json(Object.assign({ error: message || code, code }, extra || {}));
}

// The path id is the journeyId (a client-generated correlation key). CRM identity
// travels as recordType/recordId in the signed token — never the path id.
//
// Page 2 performs exactly ONE required Zoho save and returns immediately. It does
// NOT poll for Lead conversion, wait for processLead, resolve an Account/Deal/Quote,
// or block booking on downstream automation — those are reconciled by Zoho after
// the fact, and the graph is read once (best-effort) at booking time.
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
    let outcome;
    if (recordType === 'Contact') {
      outcome = await runContactPath({ recordId, company, jobTitle, phone, country, product });
    } else if (recordType === 'Lead') {
      outcome = await runLeadPath({ recordId, company, jobTitle, phone, country, product, email: decoded.email });
    } else {
      return fail(res, 400, 'validation', 'Unknown record type on token.');
    }
    if (outcome && outcome.fail) return fail(res, outcome.status, outcome.code, outcome.message, outcome.extra);

    // The step-2 token carries only the stable originating identity + (optional)
    // canonical product. contactId/accountId/dealId are deliberately absent — they
    // are resolved once, at booking time.
    const payload = {
      journeyId: id,
      recordType,
      recordId,
      email: decoded.email,
      step: 2,
      purpose: 'flow'
    };
    if (product) payload.product = product;
    const nextToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });

    return res.status(200).json({ token: nextToken, step: 2 });
  } catch (error) {
    // A save that Zoho rejected (network/auth/validation-at-Zoho) is a real error:
    // never report success when the data was not saved. 502 is retryable.
    console.error('[submissions] error:', error.code || error.message);
    return fail(res, 502, error.code || 'submission_update_failed', 'Could not save your details. Please try again.');
  }
};

// ---------------------------------------------------------------------------
// Lead path: ONE enrichment update (triggers enabled) fires WF001a Process Lead,
// which converts and builds the graph asynchronously. We do NOT wait. Retry-safe:
//   - Lead present + already converted (a prior successful save) -> success, no re-update.
//   - Lead present + unconverted -> validate + single required update.
//   - Lead absent (a prior successful save converted + removed it) -> one email recovery.
//   - Neither establishable -> retryable error (never a false success).
// ---------------------------------------------------------------------------
async function runLeadPath({ recordId, company, jobTitle, phone, country, product, email }) {
  const lead = await getLead(recordId); // throws on Zoho error -> caught by handler -> 502 (retryable)

  if (lead) {
    if (readConversion(lead).converted) return { ok: true }; // idempotent retry: save already done

    const validation = validateLeadEnrichment({
      company, jobTitle, phone, country, product,
      rawTitleField: JOBTITLE_RAW_FIELD,
      existingProducts: lead.Product_Interest
    });
    if (!validation.ok) {
      // Invalid field (e.g. an unrecognized country) is a validation error — do not advance.
      return { fail: true, status: 400, code: 'validation', message: 'Some of your details need correcting.', extra: { reason: validation.reason } };
    }
    await updateLead(recordId, validation.record); // ONE update, triggers ENABLED; throws -> 502 (retryable)
    return { ok: true };
  }

  // Lead is gone: a prior successful request already converted it. One bounded
  // recovery lookup (no sleep, no backoff) confirms the person exists.
  if (email) {
    const contacts = await searchContactsByEmail(email);
    if (contacts.length === 1 && contacts[0].id) return { ok: true };
  }

  return { fail: true, status: 502, code: 'lead_not_found', message: 'Your registration is still being set up. Please try again.' };
}

// ---------------------------------------------------------------------------
// Contact path: update the existing Contact in place (workflows suppressed) and
// return. No Account create, no reconciliation, no Deal resolution. Product_Interest
// is additive (see validateLeadEnrichment). A rejected write stays an error.
// ---------------------------------------------------------------------------
async function runContactPath({ recordId, company, jobTitle, phone, country, product }) {
  const contact = await getContact(recordId); // throws -> 502 (retryable)
  if (!contact) return { fail: true, status: 502, code: 'contact_not_found', message: 'Your registration could not be found. Please try again.' };

  const validation = validateLeadEnrichment({
    company, jobTitle, phone, country, product,
    rawTitleField: JOBTITLE_RAW_FIELD,
    includeCompany: false,
    existingProducts: contact.Product_Interest
  });
  if (!validation.ok) {
    return { fail: true, status: 400, code: 'validation', message: 'Some of your details need correcting.', extra: { reason: validation.reason } };
  }
  await updateContact(recordId, validation.record, { trigger: [] }); // persist enrichment; throws -> 502 (retryable)
  return { ok: true };
}
