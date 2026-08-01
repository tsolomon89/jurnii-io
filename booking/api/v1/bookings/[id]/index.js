'use strict';

const { fail, methodNotAllowed, log } = require('../../../../lib/http');
const { requireManage } = require('../../../../lib/auth');
const V = require('../../../../lib/validate');
const G = require('../../../../integrations/google');
const db = require('../../../../db');
const J = require('../../../../db/queries/journeys');
const I = require('../../../../db/queries/intents');

/**
 * DELETE /api/v1/bookings/{journeyId} — visitor cancellation.
 *
 * GATED. `BOOKING_CANCELLATION_ENABLED` defaults to false in Production and the
 * endpoint answers `403 cancellation_disabled` with no Google or Zoho call and no
 * intent recorded. The durable infrastructure ships in full; only the visitor-facing
 * action waits on the separately approved Deluge correction (§7.2), because the
 * closest available CRM representation routes to a "thanks for attending" cadence for
 * a demo that never happened.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') return methodNotAllowed(res, ['DELETE']);

  // Step 0, before anything else: no token check, no read, no write.
  if (process.env.BOOKING_CANCELLATION_ENABLED !== 'true') {
    return fail(res, 403, 'cancellation_disabled',
      `Please contact ${process.env.BOOKING_SUPPORT_EMAIL || 'support'} to change this booking.`);
  }

  const journeyId = req.query && (req.query.id || req.query.journeyId);
  if (!journeyId || !V.isUuid(journeyId)) return fail(res, 400, 'validation', 'Invalid booking reference.');

  const auth = requireManage(req, { journeyId });
  if (!auth.ok) return fail(res, auth.status, auth.code, 'Unauthorized');

  const journey = await db.withTransaction((tx) => J.get(tx, journeyId));
  const refusal = I.refusalFor(journey, 'cancel');
  if (refusal === 'journey_not_found') return fail(res, 404, refusal, 'Booking not found.');
  if (refusal === 'booking_needs_attention') {
    return fail(res, 409, refusal, 'We are checking on this booking. Please contact us.');
  }
  if (refusal === 'booking_cancelled') return fail(res, 409, refusal, 'This booking was already cancelled.');
  if (refusal === 'action_in_progress') return fail(res, 409, refusal, 'A change is already in progress.');
  if (refusal) return fail(res, 409, refusal, 'This booking cannot be cancelled.');

  // TRANSACTION R3 — google_cancel only. zoho_cancel_propagate is NOT created here:
  // Zoho must never be told a meeting was cancelled before Google confirms it was.
  let intentVersion;
  try {
    ({ intentVersion } = await db.withTransaction((tx) => J.R3_cancelIntent(tx, journeyId)));
  } catch (err) {
    return fail(res, 409, 'action_in_progress', 'A change is already in progress.');
  }

  const calendarId = journey.google_calendar_id;   // PERSISTED, never the environment
  const outcome = await G.cancelEvent(calendarId, journey.google_event_id);

  let proven = outcome.kind === 'cancelled' || outcome.kind === 'gone';
  if (outcome.kind === 'not_found') {
    // A bare 404 is NOT proof — the same rule the worker applies. Treating a
    // permissions-artefact 404 as "already cancelled" would release the slot AND tell
    // Zoho the meeting was cancelled while a live event and its reminder carried on.
    const { verdict } = await G.qualifyNotFound(calendarId);
    proven = verdict === 'absent';
  }

  if (proven) {
    try {
      await db.withTransaction((tx) => J.G4_cancelled(tx, journeyId, {
        intentVersion, propagateToZoho: true,
      }));
      log({ evt: 'bookings.cancelled', journeyId });
      return res.status(200).json({ status: 'cancelled', bookingId: journeyId });
    } catch (err) {
      log({ evt: 'bookings.cancel_commit_failed', journeyId, code: err.code || 'unknown' });
    }
  }

  // Uncertain, or an unqualified 404: the intent survives and the worker finishes it.
  log({ evt: 'bookings.cancel_pending', journeyId, outcome: outcome.kind });
  return res.status(202).json({ status: 'cancel_pending', bookingId: journeyId, pollAfterMs: 3000 });
};
