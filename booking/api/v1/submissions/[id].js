'use strict';

const { fail, methodNotAllowed, log } = require('../../../lib/http');
const { requireFlow, signFlowToken } = require('../../../lib/auth');
const V = require('../../../lib/validate');
const db = require('../../../db');
const J = require('../../../db/queries/journeys');
const { canonicalProduct } = require('../../_utils/products');

/**
 * Page 2 — PATCH /api/v1/submissions/{journeyId}
 *
 * TRANSACTION R1, and ZERO Zoho calls. The commit and the activation of identity
 * resolution happen in the same transaction, so there is no window in which the
 * visitor's company details are persisted but nothing will ever process them — the
 * universal outbox rule (§4.8).
 *
 * The phone triple replaces the old `{phone, country}` pair: the server re-derives
 * `phone_e164` from `{countryIso2, dialCode, nationalNumber}` and rejects a
 * disagreement, rather than concatenating a dial code onto a domestic number and
 * producing `+4407123456789`. Country is never inferred from the dial code (spec §6).
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'POST') return methodNotAllowed(res, ['PATCH', 'POST']);

  const journeyId = req.query && (req.query.id || req.query.journeyId);
  if (!journeyId || !V.isUuid(journeyId)) return fail(res, 400, 'validation', 'Invalid booking reference.');

  const auth = requireFlow(req, { journeyId, minStep: 1 });
  if (!auth.ok) return fail(res, auth.status, auth.code, 'Unauthorized');

  const body = req.body || {};

  const company = V.truncate(body.company, V.LIMITS.company);
  if (!company) return fail(res, 400, 'validation', 'Please provide your company name.');

  const phone = V.validatePhone({
    countryIso2: body.countryIso2 || body.country_iso2,
    dialCode: body.dialCode || body.dial_code,
    nationalNumber: body.nationalNumber || body.national_number,
  });
  if (!phone.ok) {
    // `country_dial_mismatch` is its own reason so the form can highlight the right
    // field instead of showing a generic validation error.
    return fail(res, 400, 'validation', 'Please check your phone number.', { reason: phone.reason });
  }

  const product = body.product || body.productInterest || body.product_interest;
  const canonical = product ? canonicalProduct(product) : null;
  if (product && !canonical) return fail(res, 400, 'validation', 'Please select a product from the list.');

  try {
    const row = await db.withTransaction((tx) => J.R1_page2Commit(tx, journeyId, {
      company,
      job_title_raw: V.truncate(body.jobTitle || body.job_title, V.LIMITS.job_title_raw),
      country_iso2: phone.country_iso2,
      country_name: phone.country_name,
      phone_dial_code: phone.phone_dial_code,
      phone_national_number: phone.phone_national_number,
      phone_e164: phone.phone_e164,
      product_interest: canonical,
    }));

    log({ evt: 'submissions.page2', journeyId, step: 2, zohoStatus: row.zoho_status });
    return res.status(200).json({
      success: true,
      journeyId,
      step: 2,
      // A fresh token carrying step 2, which the booking and status endpoints require.
      token: signFlowToken({ journeyId, email: row.email_normalized, step: 2 }),
    });
  } catch (err) {
    if (err.code === 'wrong_step') {
      return fail(res, 409, 'wrong_step', 'This booking has already progressed.');
    }
    log({ evt: 'submissions.page2.error', journeyId, code: err.code || 'unknown' });
    return fail(res, 503, 'store_unavailable', 'We could not save your details. Please try again.');
  }
};
