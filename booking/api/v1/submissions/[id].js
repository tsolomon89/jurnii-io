'use strict';

const { waitUntil } = require('@vercel/functions');
const { fail, methodNotAllowed, log } = require('../../../lib/http');
const { requireFlow, signFlowToken } = require('../../../lib/auth');
const dispatch = require('../../../lib/dispatch');
const V = require('../../../lib/validate');
const db = require('../../../db');
const J = require('../../../db/queries/journeys');
const { canonicalProductList, canonicalLeadSource } = require('../../_utils/products');

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

/** The `form_placement` that may carry a per-journey Lead Source. See below. */
const INTERNAL_PLACEMENT = 'internal-booking';

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

  /**
   * Product Interest is multi-valued. `productInterests` is what the current form
   * sends; the singular keys are accepted transitionally so a browser still holding a
   * snapshot from the previous single-select build succeeds. The progress snapshot's
   * TTL is two hours, so the singular keys can be removed in the next release.
   *
   * `canonicalProductList` strips blanks, canonicalizes, deduplicates and reports
   * anything unrecognised — including a user-facing LABEL, which is not a canonical key
   * and so can never be written to the CRM as a value.
   */
  const rawProducts = body.productInterests || body.product_interests
    || body.product || body.productInterest || body.product_interest;
  const productResult = canonicalProductList(rawProducts);
  if (!productResult.ok) {
    return fail(res, 400, 'validation', 'Please select a product from the list.');
  }

  /**
   * Lead Source — INTERNAL BOOKINGS ONLY.
   *
   * The value is honoured only when the journey's STORED `form_placement` (written on
   * page 1 and never read back from this body) is `internal-booking`, and only when it
   * is an exact active picklist value from live metadata. An ordinary public caller who
   * adds `leadSource` to a page-2 request therefore changes nothing.
   *
   * This is a coherence guard, not access control: `/admin-form` is served
   * unauthenticated by design. It is also exactly where an authentication check would
   * attach later, without the form or this contract changing.
   */
  let leadSource = null;
  const requestedLeadSource = body.leadSource || body.lead_source;
  if (requestedLeadSource) {
    const journey = await db.withTransaction((tx) => J.get(tx, journeyId));
    if (journey && journey.form_placement === INTERNAL_PLACEMENT) {
      leadSource = canonicalLeadSource(requestedLeadSource);
      if (!leadSource) {
        return fail(res, 400, 'validation', 'Please choose a lead source from the list.',
          { reason: 'lead_source_invalid' });
      }
    } else {
      log({ evt: 'submissions.page2.lead_source_ignored', journeyId });
    }
  }

  try {
    const runnable = new Set();
    const fields = {
      company,
      job_title_raw: V.truncate(body.jobTitle || body.job_title, V.LIMITS.job_title_raw),
      country_iso2: phone.country_iso2,
      country_name: phone.country_name,
      phone_dial_code: phone.phone_dial_code,
      phone_national_number: phone.phone_national_number,
      phone_e164: phone.phone_e164,
      // Always an array — the column is NOT NULL, and an empty selection is `{}`.
      product_interests: productResult.products,
    };
    // Only written when it survived the placement + picklist checks above, so a public
    // journey's NULL (meaning "use the configured default") is never overwritten.
    if (leadSource) fields.lead_source = leadSource;

    const row = await db.withTransaction((tx) => J.R1_page2Commit(tx, journeyId, fields),
      { collectRunnable: runnable });

    log({ evt: 'submissions.page2', journeyId, step: 2, zohoStatus: row.zoho_status });

    // Commit -> register -> respond. Synchronous registration, after COMMIT returned and
    // before this handler returns, so the response cannot be sent before the background
    // work is registered. It never awaits Zoho and never awaits the drain, so the visitor
    // waits for neither; and it never throws, so a dispatch problem cannot turn a saved
    // submission into an error.
    dispatch.publish(runnable, { reason: 'page2_commit', waitUntil });

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
