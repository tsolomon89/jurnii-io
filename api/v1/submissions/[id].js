const jwt = require('jsonwebtoken');
const {
  getLead,
  updateLead,
  readConversion,
  resolveProductDeal,
  updateSubmissionRecord
} = require('../../_utils/zoho');
const { canonicalProduct, validateLeadEnrichment } = require('../../_utils/products');

const JWT_SECRET = process.env.JWT_SECRET;

// Bounded backoff (ms). Serverless-safe; the retry-resume path makes a timeout
// harmless (a later PATCH sees the already-converted Lead and resumes).
const CONVERSION_BACKOFF = [1000, 2000, 3000, 4000, 5000];
const DEAL_BACKOFF = [800, 1500, 2500];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function fail(res, status, code, message, extra) {
  return res.status(status).json(Object.assign({ error: message || code, code }, extra || {}));
}

async function safeSubmissionUpdate(id, data) {
  try {
    await updateSubmissionRecord(id, data);
  } catch (e) {
    console.warn(`[submissions] submission mirror update skipped (${e.code || e.message})`);
  }
}

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

  if (decoded.submissionId !== id) return fail(res, 403, 'forbidden', 'Token does not match this submission.');
  if (decoded.step !== 1) return fail(res, 409, 'wrong_step', 'This step has already been completed.');

  const { company, jobTitle, phone, country, productInterest } = req.body || {};
  if (!company || !jobTitle) return fail(res, 400, 'validation', 'Missing required fields: company, jobTitle');

  const leadId = decoded.leadId;
  const product = canonicalProduct(productInterest);

  try {
    // 0. Read the Lead. REST GET returns converted leads too.
    let lead = await getLead(leadId);
    if (!lead) return fail(res, 502, 'lead_not_found', 'Your registration could not be found. Please restart.');

    let conv = readConversion(lead);

    // 1. If NOT yet converted, perform ONE enrichment update (triggers enabled)
    //    which fires process Lead. If already converted (retry), skip the update
    //    entirely and resume resolution.
    if (!conv.converted) {
      // Validate enrichment BEFORE the single conversion-triggering update. A
      // validation failure does NOT update or convert the Lead — it returns
      // Manual Review. Never a silent field drop, never a reduced second write.
      const jobTitleMode = process.env.ZOHO_LEAD_JOBTITLE_MODE === 'picklist' ? 'picklist' : 'text';
      const allowedTitles = (process.env.ZOHO_LEAD_JOBTITLE_ALLOWED || '')
        .split(',').map(s => s.trim()).filter(Boolean);
      const validation = validateLeadEnrichment({ company, jobTitle, phone, country, product, jobTitleMode, allowedTitles });
      if (!validation.ok) {
        console.warn(`[submissions] enrichment validation failed for lead ${leadId} (${validation.reason}); Lead left unconverted`);
        await safeSubmissionUpdate(id, { Error_Message: `MANUAL_REVIEW: ${validation.reason}` });
        return fail(res, 409, 'MANUAL_REVIEW', 'Some of your details need review; our team will follow up.', { reason: validation.reason });
      }

      try {
        await updateLead(leadId, validation.record); // ONE update, triggers ENABLED (no trigger override)
      } catch (e) {
        // Live picklist rejected an otherwise-valid value: Lead stays unconverted.
        console.warn(`[submissions] enrichment rejected by Zoho for lead ${leadId} (${e.code || e.message}); Lead preserved unconverted`);
        await safeSubmissionUpdate(id, { Error_Message: 'MANUAL_REVIEW: enrichment_rejected' });
        return fail(res, 409, 'MANUAL_REVIEW', 'We could not process some of your details; our team will follow up.', { reason: 'enrichment_rejected' });
      }

      // 2. Bounded backoff poll for conversion.
      for (const delay of CONVERSION_BACKOFF) {
        await sleep(delay);
        lead = await getLead(leadId);
        conv = readConversion(lead);
        if (conv.converted && conv.contactId) break;
      }
    }

    // Mirror enrichment onto the submission (best-effort; the CRM graph is authoritative).
    await safeSubmissionUpdate(id, {
      Submission_Step: 'Step 2',
      Company: company,
      Job_Title: jobTitle,
      Phone: phone,
      Country: country,
      Product_Interest: product || productInterest || ''
    });

    // 3. Conversion must have produced a Contact (+ Account). Otherwise → Manual Review.
    if (!conv.converted || !conv.contactId || !conv.accountId) {
      console.warn(`[submissions] conversion unresolved for lead ${leadId} (converted=${conv.converted} contact=${conv.contactId} account=${conv.accountId})`);
      await safeSubmissionUpdate(id, { Error_Message: 'MANUAL_REVIEW: conversion_unresolved' });
      return fail(res, 409, 'MANUAL_REVIEW', 'Your details are being processed; our team will follow up shortly.', { reason: 'conversion_unresolved' });
    }

    // 4. Resolve the exact single Product Deal from the converted graph.
    if (!product) {
      await safeSubmissionUpdate(id, { Contact_Lookup: conv.contactId, Error_Message: 'MANUAL_REVIEW: no_product_selected' });
      return fail(res, 409, 'MANUAL_REVIEW', "We'll tailor the right session for you — our team will reach out to schedule.", { reason: 'no_product_selected' });
    }

    let dealResult = await resolveProductDeal(conv.accountId, product);
    for (const delay of DEAL_BACKOFF) {
      if (dealResult.status === 'one') break;
      await sleep(delay);
      dealResult = await resolveProductDeal(conv.accountId, product);
    }

    if (dealResult.status !== 'one') {
      const reason = dealResult.status === 'many' ? 'deal_ambiguous' : 'deal_unresolved';
      console.warn(`[submissions] product deal ${reason} for account ${conv.accountId} product ${product}`);
      await safeSubmissionUpdate(id, { Contact_Lookup: conv.contactId, Error_Message: `MANUAL_REVIEW: ${reason}` });
      return fail(res, 409, 'MANUAL_REVIEW', 'Your registration is complete; our team will confirm the right session.', { reason });
    }

    const dealId = dealResult.deal.id;

    // 5. Persist resolved refs (best-effort mirror) and issue the step-2 token.
    await safeSubmissionUpdate(id, {
      Integration_Status: 'Pending',
      Contact_Lookup: conv.contactId,
      Deal_Lookup: dealId
    });

    const nextToken = jwt.sign(
      {
        submissionId: id,
        email: decoded.email,
        leadId,
        contactId: conv.contactId,
        accountId: conv.accountId,
        dealId,
        step: 2
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({ token: nextToken, step: 2, contactId: conv.contactId, dealId });
  } catch (error) {
    console.error('[submissions] error:', error.code || error.message);
    return fail(res, 502, error.code || 'submission_update_failed', 'Could not process your details. Please try again.');
  }
};
