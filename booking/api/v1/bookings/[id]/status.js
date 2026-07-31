'use strict';

const { fail, methodNotAllowed } = require('../../../../lib/http');
const { requireFlowOrManage, manageUrlFor } = require('../../../../lib/auth');
const V = require('../../../../lib/validate');
const db = require('../../../../db');
const J = require('../../../../db/queries/journeys');
const I = require('../../../../db/queries/intents');

/**
 * GET /api/v1/bookings/{journeyId}/status
 *
 * The asynchronous-confirmation handoff. Accepts EITHER a flow token (the browser
 * polls with what it already has after a `202`) or a manage token (the manage page
 * polls after a reschedule).
 *
 * A fresh 30-day manage token is minted and returned ONLY when the booking is
 * confirmed — that is how the browser obtains a durable credential on the `202` path,
 * where it never saw a `200`.
 *
 * Exposes no CRM ids, no calendar id, no reason code and no raw error text. An
 * operator reads those from `needs_attention_code` and `manual_review_reasons`; a
 * visitor is told what they can act on and nothing more.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const journeyId = req.query && (req.query.id || req.query.journeyId);
  if (!journeyId || !V.isUuid(journeyId)) return fail(res, 400, 'validation', 'Invalid booking reference.');

  const auth = requireFlowOrManage(req, { journeyId, minStep: 2 });
  if (!auth.ok) return fail(res, auth.status, auth.code, 'Unauthorized');

  const { journey, pendingSlot } = await db.withTransaction(async (tx) => {
    const row = await J.get(tx, journeyId);
    if (!row) return { journey: null, pendingSlot: null };
    return { journey: row, pendingSlot: await I.pendingSlotStart(tx, journeyId, row) };
  });
  if (!journey) return fail(res, 404, 'journey_not_found', 'Booking not found.');

  const escalated = journey.google_outcome_state === 'unresolved'
    || journey.booking_status === 'needs_attention';

  // Booking truth and integration state are different questions (§4.1). T1/G7 make the
  // booking itself untrustworthy; T2/T3 leave a real meeting with a broken downstream,
  // and a visitor whose cancellation failed must still be told their meeting is real.
  let bookingStatus;
  if (journey.booking_status === 'needs_attention') bookingStatus = 'needs_attention';
  else if (journey.google_outcome_state === 'creating' || journey.google_outcome_state === 'unknown') {
    bookingStatus = 'booking_pending';
  } else bookingStatus = journey.booking_status;

  let integrationStatus = 'pending';
  if (escalated || journey.needs_attention) integrationStatus = 'needs_attention';
  else if (journey.zoho_status === 'complete') integrationStatus = 'complete';

  const body = {
    bookingId: journeyId,
    bookingStatus,
    formStatus: journey.form_step >= 2 ? 'complete' : 'incomplete',
    slotStart: journey.slot_start_utc || null,
    slotEnd: journey.slot_end_utc || null,
    pendingSlotStart: pendingSlot || null,
    timezone: process.env.HOST_TIMEZONE || 'Europe/London',
    meetLink: journey.google_meet_url || null,
    integrationStatus,
  };

  // Only a confirmed booking hands back a management credential.
  if (journey.booking_status === 'confirmed' && !escalated) {
    body.manageUrl = manageUrlFor(req, { journeyId, email: journey.email_normalized });
  }

  return res.status(200).json(body);
};
