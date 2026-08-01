'use strict';

const crypto = require('crypto');
const { fail, methodNotAllowed, log } = require('../../../lib/http');
const { signFlowToken } = require('../../../lib/auth');
const V = require('../../../lib/validate');
const db = require('../../../db');
const J = require('../../../db/queries/journeys');
const { isBusinessEmail } = require('../../_utils/email');

/**
 * Page 1 — POST /api/v1/submissions/start
 *
 * POSTGRES ONLY. Zero Zoho calls, no ops row, nothing queued.
 *
 * The old implementation searched Contacts and Leads here, created or updated a Lead
 * inline, and could answer `409 MANUAL_REVIEW` — turning a visitor away because of a
 * CRM data problem they had no part in. All of that is gone. Ambiguity is
 * undiscoverable at this point precisely because we make no CRM call: the visitor
 * books normally, and the worker raises a Manual Review Task later if identity turns
 * out to be ambiguous.
 *
 * The point of committing here is durability. Nothing a visitor types should depend
 * on a third party being reachable.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const body = req.body || {};
  const email = V.str(body.email);
  const emailNormalized = V.normalizeEmail(email);

  if (!email || !V.isEmail(email)) {
    return fail(res, 400, 'validation', 'Please enter a valid email address.');
  }
  if (!isBusinessEmail(email)) {
    return fail(res, 400, 'business_email_required', 'Please use your work email address.');
  }

  const firstName = V.truncate(body.firstName || body.first_name, V.LIMITS.first_name);
  const lastName = V.truncate(body.lastName || body.last_name, V.LIMITS.last_name);
  if (!firstName || !lastName) {
    return fail(res, 400, 'validation', 'Please provide your first and last name.');
  }

  // A client-supplied journeyId is honoured only when well-formed, so a retry from a
  // reloaded form resumes its own journey rather than orphaning it.
  const supplied = V.str(body.journeyId);
  if (supplied && !V.isUuid(supplied)) return fail(res, 400, 'validation', 'Invalid booking reference.');
  const journeyId = supplied || crypto.randomUUID();

  const attribution = V.sanitizeAttribution(body);

  try {
    const row = await db.withTransaction((tx) => J.upsertPage1(tx, journeyId, {
      email,
      email_normalized: emailNormalized,
      first_name: firstName,
      last_name: lastName,
      marketing_consent: body.marketingConsent === true || body.marketing_consent === true,
      ...attribution,
    }));

    if (!row) {
      // Zero rows means the §4.7 guard rejected it. Re-read to distinguish an email
      // rebind from a journey that has already moved past draft.
      const existing = await db.withTransaction((tx) => J.get(tx, journeyId));
      if (existing && existing.email_normalized !== emailNormalized) {
        return fail(res, 409, 'journey_conflict', 'Please start a new booking.');
      }
      return fail(res, 409, 'wrong_step', 'This booking has already progressed.');
    }

    log({ evt: 'submissions.start', journeyId, step: 1 });
    return res.status(200).json({
      success: true,
      journeyId,
      step: 1,
      token: signFlowToken({ journeyId, email: emailNormalized, step: 1 }),
    });
  } catch (err) {
    log({ evt: 'submissions.start.error', journeyId, code: err.code || 'unknown' });
    // Fail closed. Without a durable record there is nothing to resume, so reporting
    // success would lose the submission silently — the exact failure this work exists
    // to remove.
    return fail(res, 503, 'store_unavailable', 'We could not save your details. Please try again.');
  }
};
