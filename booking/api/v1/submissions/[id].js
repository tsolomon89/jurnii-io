'use strict';

const { waitUntil } = require('@vercel/functions');
const { fail, methodNotAllowed, log } = require('../../../lib/http');
const { requireFlow, signFlowToken } = require('../../../lib/auth');
const dispatch = require('../../../lib/dispatch');
const V = require('../../../lib/validate');
const db = require('../../../db');
const J = require('../../../db/queries/journeys');
const { canonicalProductList, canonicalLeadSource } = require('../../_utils/products');
const HC = require('../../../config/host-calendars');

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
   * ONE read, serving both internal-only gates below.
   *
   * It is now unconditional because the booking host must be decided on EVERY page-2
   * commit, public or internal, and only the stored `form_placement` says which this is.
   * That replaces the previous read rather than adding one: Lead Source used to perform
   * exactly this query, just conditionally.
   */
  // Matches what R1_page2Commit would have raised for a missing row, so an unknown
  // journey answers identically whether it is caught here or there.
  const journey = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!journey) return fail(res, 409, 'wrong_step', 'This booking has already progressed.');
  const isInternal = journey.form_placement === INTERNAL_PLACEMENT;

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
    if (isInternal) {
      leadSource = canonicalLeadSource(requestedLeadSource);
      if (!leadSource) {
        return fail(res, 400, 'validation', 'Please choose a lead source from the list.',
          { reason: 'lead_source_invalid' });
      }
    } else {
      log({ evt: 'submissions.page2.lead_source_ignored', journeyId });
    }
  }

  /**
   * BOOKING HOST — the same trust model as Lead Source, but the two surfaces get
   * deliberately DIFFERENT semantics:
   *
   *   public   the server CHOOSES the host (BOOKING_PUBLIC_HOST); a submitted
   *            `bookingHost` is ignored and logged, so a hand-crafted public request
   *            carrying `{"bookingHost":"timothy"}` changes nothing.
   *   internal the operator MUST choose; there is no implicit default.
   *
   * An internal booking never inherits the public host. If the host selector failed to
   * populate — a `/booking-hosts` fetch that 503'd, a stale cached form, a hand-rolled
   * request — the correct outcome is a refusal, not a real booking on Fraser's calendar
   * that no operator decided to make.
   *
   * `resolveHost` returns null for an unknown key AND for a configured-but-blank one, so
   * Marlon is rejected here until his Calendar ID is supplied. It is never quietly
   * downgraded to the default: silently booking the wrong person is worse than refusing.
   */
  let selectedHostKey;
  const requestedHost = body.bookingHost || body.booking_host;
  if (isInternal) {
    if (!requestedHost) {
      return fail(res, 400, 'validation', 'Please choose a booking host.',
        { reason: 'booking_host_required' });
    }
    const host = HC.resolveHost(requestedHost);
    if (!host) {
      log({ evt: 'submissions.page2.booking_host_unavailable', journeyId });
      return fail(res, 400, 'validation', 'That booking host is not available. Please choose another.',
        { reason: 'booking_host_invalid' });
    }
    selectedHostKey = host.hostKey;
  } else {
    if (requestedHost) log({ evt: 'submissions.page2.booking_host_ignored', journeyId });
    selectedHostKey = HC.publicHostKey();
    if (!selectedHostKey) {
      log({ evt: 'submissions.page2.public_host_misconfigured', journeyId });
      return fail(res, 503, 'calendar_misconfigured', 'Booking is temporarily unavailable.');
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
    /**
     * Written on EVERY commit, unlike lead_source. The public default is server-ASSIGNED
     * rather than inferred from NULL, so a later change of `BOOKING_PUBLIC_HOST` cannot
     * retroactively move a journey that is already in flight between page 2 and booking.
     */
    fields.selected_host_key = selectedHostKey;

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
