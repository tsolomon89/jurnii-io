'use strict';

const { waitUntil } = require('@vercel/functions');
const { fail, methodNotAllowed, log } = require('../../../../lib/http');
const { requireManage } = require('../../../../lib/auth');
const dispatch = require('../../../../lib/dispatch');
const V = require('../../../../lib/validate');
const S = require('../../../../config/slots');
const G = require('../../../../integrations/google');
const db = require('../../../../db');
const J = require('../../../../db/queries/journeys');
const I = require('../../../../db/queries/intents');

/**
 * PATCH /api/v1/bookings/{journeyId}/reschedule
 *
 * ZERO Zoho calls. Propagation is activated by G5, in the same transaction that
 * promotes the hold.
 *
 * Release is driven ENTIRELY by what a Google read proves — never by retry exhaustion
 * or a TTL. A `409 SLOT_TAKEN` never disturbs the existing booking: R4 is a single
 * transaction, so a rejected hold leaves the confirmed slot exactly as it was.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'POST') return methodNotAllowed(res, ['PATCH', 'POST']);

  const journeyId = req.query && (req.query.id || req.query.journeyId);
  if (!journeyId || !V.isUuid(journeyId)) return fail(res, 400, 'validation', 'Invalid booking reference.');

  const auth = requireManage(req, { journeyId });
  if (!auth.ok) return fail(res, auth.status, auth.code, 'Unauthorized');

  const journey = await db.withTransaction((tx) => J.get(tx, journeyId));
  const refusal = I.refusalFor(journey, 'reschedule');
  if (refusal === 'journey_not_found') return fail(res, 404, refusal, 'Booking not found.');
  if (refusal === 'booking_needs_attention') {
    return fail(res, 409, refusal, 'We are checking on this booking. Please contact us.');
  }
  if (refusal === 'booking_cancelled') return fail(res, 409, refusal, 'This booking was cancelled.');
  if (refusal === 'action_in_progress') return fail(res, 409, refusal, 'A change is already in progress.');
  if (refusal) return fail(res, 409, refusal, 'This booking cannot be rescheduled.');

  const slot = S.validateSlotStart((req.body || {}).slotStart);
  if (!slot.ok) return fail(res, 400, 'validation', 'That time is not available.', { reason: slot.reason });

  // TRANSACTION R4 — insert the pending hold, arm it, start the intent cycle.
  // A 23P01 surfaces as SLOT_TAKEN with nothing mutated.
  let intentVersion;
  const runnable = new Set();
  try {
    ({ intentVersion } = await db.withTransaction((tx) => J.R4_rescheduleIntent(tx, journeyId, {
      hostCalendarKey: journey.host_calendar_key,
      slotStartUtc: slot.start.toISOString(),
    }), { collectRunnable: runnable }));
  } catch (err) {
    if (err.code === 'SLOT_TAKEN') {
      return fail(res, 409, 'SLOT_TAKEN', 'That time was just taken. Please choose another.');
    }
    return fail(res, 409, 'action_in_progress', 'A change is already in progress.');
  }

  const calendarId = journey.google_calendar_id;   // PERSISTED
  const outcome = await G.updateEventTimes(calendarId, journey.google_event_id, {
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
  });

  if (outcome.kind === 'updated') {
    try {
      // TRANSACTION G5 — release the old confirmed hold FIRST, then promote the new
      // one, then activate Zoho propagation.
      await db.withTransaction((tx) => J.G5_reschedulePromoted(tx, journeyId, {
        intentVersion,
        slotStartUtc: slot.start.toISOString(),
        slotEndUtc: slot.end.toISOString(),
      }), { collectRunnable: runnable });
      log({ evt: 'bookings.rescheduled', journeyId });
      dispatch.publish(runnable, { reason: 'reschedule_committed', waitUntil });
      return res.status(200).json({
        status: 'confirmed', bookingId: journeyId, slotStart: slot.start.toISOString(),
      });
    } catch (err) {
      log({ evt: 'bookings.reschedule_commit_failed', journeyId, code: err.code || 'unknown' });
    }
  }

  // Anything else — including a bare 404 — is left to the worker, which applies the
  // access probe before concluding anything. Both holds are retained meanwhile: a
  // missing event means neither slot is proven free.
  log({ evt: 'bookings.reschedule_pending', journeyId, outcome: outcome.kind });
  // R4 armed `google_reschedule`, so the worker has work to do even on the 202 path.
  dispatch.publish(runnable, { reason: 'reschedule_pending', waitUntil });
  return res.status(202).json({ status: 'reschedule_pending', bookingId: journeyId, pollAfterMs: 3000 });
};
