'use strict';

const { ConflictError } = require('../errors');
const O = require('./ops');
const R = require('./reservations');

/**
 * Intent serialisation (§4.6). Guards test the intent STATE, never a timestamp's
 * presence — a timestamp that happens to be set says nothing about whether the
 * intent is live.
 */

/**
 * Cancellation SUPERSEDES a pending reschedule.
 *
 * `google_reschedule` moves to `terminal`, not `parked`: `parked` is the state
 * `ensureOp` re-arms, so a parked reschedule could be revived and promote a booking
 * that has since been cancelled. The pending hold is released only once Google
 * cancellation is CONFIRMED (§5.3), never speculatively.
 */
async function supersedeRescheduleWithCancel(tx, journeyId) {
  const res = await tx.query(
    `UPDATE booking_journeys SET
       reschedule_intent_state = 'failed',
       intent_version = intent_version + 1,
       updated_at = now()
     WHERE journey_id = $1 AND reschedule_intent_state = 'pending'
     RETURNING intent_version`,
    [journeyId]
  );
  if (!res.rowCount) return null;
  await O.terminateOp(tx, journeyId, 'google_reschedule', 'superseded_by_cancel');
  return res.rows[0].intent_version;
}

/**
 * Is a manage action currently permitted? Returns a refusal code or null.
 *
 * `unresolved` / `needs_attention` is evaluated FIRST, before any success or
 * idempotency branch, so a journey we have explicitly flagged as untrustworthy can
 * never be told `200 confirmed` off a matching-booking branch (§5.5).
 */
function refusalFor(journey, action) {
  if (!journey) return 'journey_not_found';
  if (journey.google_outcome_state === 'unresolved' || journey.booking_status === 'needs_attention') {
    return 'booking_needs_attention';
  }
  if (action === 'cancel') {
    if (journey.cancel_intent_state === 'completed' || journey.booking_status === 'cancelled') return 'booking_cancelled';
    if (journey.cancel_intent_state === 'pending') return 'action_in_progress';
    if (journey.booking_status !== 'confirmed') return 'not_confirmed';
  }
  if (action === 'reschedule') {
    if (journey.cancel_intent_state === 'pending' || journey.cancel_intent_state === 'completed') return 'booking_cancelled';
    if (journey.booking_status === 'cancelled') return 'booking_cancelled';
    if (journey.reschedule_intent_state === 'pending') return 'action_in_progress';
    if (journey.booking_status !== 'confirmed') return 'not_confirmed';
  }
  return null;
}

/**
 * The re-entry guard for `POST /bookings` (§5.2 step 0). ORDER IS SIGNIFICANT.
 * Returns `{ kind, ... }` describing what the handler must answer without making
 * any Google call or bumping any version.
 */
function bookingReentry(journey, requestedSlotIso) {
  if (!journey) return { kind: 'not_found' };

  // 0a — before every success branch, even when a google_event_id is set.
  if (journey.google_outcome_state === 'unresolved' || journey.booking_status === 'needs_attention') {
    return { kind: 'needs_attention' };
  }
  // 0b — idempotent success for the same slot.
  if (journey.google_event_id && journey.slot_start_utc
      && new Date(journey.slot_start_utc).toISOString() === new Date(requestedSlotIso).toISOString()) {
    return { kind: 'confirmed' };
  }
  // 0c — recovery in flight. Also the state RT1.resume restores.
  if (['creating', 'unknown'].includes(journey.google_outcome_state)) {
    return { kind: 'pending' };
  }
  // 0d
  if (journey.booking_status === 'confirmed') return { kind: 'already_booked' };
  if (journey.booking_status === 'cancelled') return { kind: 'cancelled' };
  if (['draft', 'reserved', 'booking_failed'].includes(journey.booking_status)) {
    return { kind: 'may_attempt' };
  }
  return { kind: 'wrong_step' };
}

/**
 * The pending reschedule slot, from the retained reservation when the journey column
 * has been cleared by G7 or T3 — the reservation is authoritative, the column is a
 * convenience mirror (§4.8).
 */
async function pendingSlotStart(tx, journeyId, journey) {
  if (journey && journey.pending_slot_start_utc) return journey.pending_slot_start_utc;
  const hold = await R.pendingRescheduleHold(tx, journeyId);
  return hold ? hold.slot_start_utc : null;
}

module.exports = {
  supersedeRescheduleWithCancel,
  refusalFor,
  bookingReentry,
  pendingSlotStart,
  ConflictError,
};
