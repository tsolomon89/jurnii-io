'use strict';

const { ConflictError, isSlotTaken, isUniqueViolation } = require('../errors');

/**
 * Slot holds.
 *
 * `slot_end_utc`, `slot_hold` and `hold_end_utc` are derived by the `bsr_derive`
 * trigger from `slot_start_utc` alone and are never written from here — see
 * APPROVED DEVIATION 1 in the migration and docs/implementation-notes.md. Passing
 * them would be ignored, so they are simply not passed.
 */

function reservationTtlMinutes() {
  return Number(process.env.RESERVATION_TTL_MINUTES || 10);
}

/**
 * Insert or reuse the single pending hold for a purpose.
 *
 * `bsr_one_pending` means a retried booking attempt REUSES the pending `initial`
 * row rather than adding one; `attempt_version` records which attempt owns it, so
 * §5.2's ownership check can reject a stale event.
 *
 * Throws `ConflictError('SLOT_TAKEN')` on `23P01` — an EXCLUDE violation is not
 * inferrable by `ON CONFLICT`, so this is necessarily exception-based.
 */
async function upsertPendingHold(tx, journeyId, {
  purpose, hostCalendarKey, slotStartUtc, attemptVersion = 0, armed = false,
}) {
  const ttl = reservationTtlMinutes();
  try {
    const res = await tx.query(
      // slot_end_utc, slot_hold and hold_end_utc are deliberately absent: the
      // bsr_derive trigger assigns all three BEFORE the NOT NULL check, so supplying
      // them would be both unnecessary and ignored (APPROVED DEVIATION 1).
      `INSERT INTO booking_slot_reservations
         (journey_id, purpose, host_calendar_key, slot_start_utc,
          status, armed, attempt_version, expires_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, now() + make_interval(mins => $7))
       ON CONFLICT (journey_id, purpose) WHERE status = 'pending'
       DO UPDATE SET
         slot_start_utc  = EXCLUDED.slot_start_utc,
         host_calendar_key = EXCLUDED.host_calendar_key,
         attempt_version = EXCLUDED.attempt_version,
         armed           = booking_slot_reservations.armed OR EXCLUDED.armed,
         expires_at      = EXCLUDED.expires_at,
         updated_at      = now()
       RETURNING *`,
      [journeyId, purpose, hostCalendarKey, slotStartUtc, armed, attemptVersion, ttl]
    );
    return res.rows[0];
  } catch (err) {
    if (isSlotTaken(err)) throw new ConflictError('SLOT_TAKEN');
    throw err;
  }
}

/** Arm a hold: the Google mutation PIPELINE is armed, before any call is made. */
async function armHold(tx, journeyId, purpose) {
  const res = await tx.query(
    `UPDATE booking_slot_reservations SET armed = true, updated_at = now()
      WHERE journey_id = $1 AND purpose = $2 AND status = 'pending'
      RETURNING reservation_id`,
    [journeyId, purpose]
  );
  return res.rowCount === 1;
}

/** Promote the pending hold of a purpose to `confirmed` (initial booking, G1). */
async function confirmHold(tx, journeyId, purpose) {
  try {
    const res = await tx.query(
      `UPDATE booking_slot_reservations
          SET status = 'confirmed', expires_at = NULL, updated_at = now()
        WHERE journey_id = $1 AND purpose = $2 AND status = 'pending'
        RETURNING *`,
      [journeyId, purpose]
    );
    if (!res.rowCount) throw new ConflictError('hold_missing');
    return res.rows[0];
  } catch (err) {
    if (isUniqueViolation(err, 'bsr_one_confirmed')) throw new ConflictError('already_confirmed');
    throw err;
  }
}

async function releaseHold(tx, journeyId, purpose) {
  const res = await tx.query(
    `UPDATE booking_slot_reservations
        SET status = 'released', expires_at = NULL, updated_at = now()
      WHERE journey_id = $1 AND purpose = $2 AND status IN ('pending','confirmed')
      RETURNING reservation_id`,
    [journeyId, purpose]
  );
  return res.rowCount;
}

/** Release every live hold (G4 / RG7.mark_cancelled). */
async function releaseAllHolds(tx, journeyId) {
  const res = await tx.query(
    `UPDATE booking_slot_reservations
        SET status = 'released', expires_at = NULL, updated_at = now()
      WHERE journey_id = $1 AND status IN ('pending','confirmed')
      RETURNING reservation_id, purpose`,
    [journeyId]
  );
  return res.rows;
}

/**
 * Reschedule promotion (G5), and the body `RG7.adopt_at_new_slot` reuses.
 *
 * The ordering is load-bearing: `bsr_one_confirmed` is a partial unique index,
 * checked per statement and not deferrable, so promoting the new hold while the old
 * one is still `confirmed` raises `23505`. Release FIRST.
 */
async function promoteRescheduleHold(tx, journeyId) {
  await tx.query(
    `UPDATE booking_slot_reservations
        SET status = 'released', updated_at = now()
      WHERE journey_id = $1 AND status = 'confirmed'`,
    [journeyId]
  );                                                          // FIRST
  const promoted = await tx.query(
    `UPDATE booking_slot_reservations
        SET status = 'confirmed', expires_at = NULL, updated_at = now()
      WHERE journey_id = $1 AND purpose = 'reschedule' AND status = 'pending'
      RETURNING *`,
    [journeyId]
  );
  if (!promoted.rowCount) throw new ConflictError('reschedule_hold_missing');
  return promoted.rows[0];
}

async function getHolds(tx, journeyId) {
  const res = await tx.query(
    `SELECT * FROM booking_slot_reservations
      WHERE journey_id = $1 ORDER BY created_at`,
    [journeyId]
  );
  return res.rows;
}

async function liveHolds(tx, journeyId) {
  const res = await tx.query(
    `SELECT * FROM booking_slot_reservations
      WHERE journey_id = $1 AND status IN ('pending','confirmed')
      ORDER BY purpose`,
    [journeyId]
  );
  return res.rows;
}

/**
 * The retained pending reschedule hold is the SINGLE SOURCE OF TRUTH for what was
 * requested once G7 or T3 has cleared `pending_slot_start_utc` (§4.8).
 */
async function pendingRescheduleHold(tx, journeyId) {
  const res = await tx.query(
    `SELECT * FROM booking_slot_reservations
      WHERE journey_id = $1 AND purpose = 'reschedule' AND status = 'pending'`,
    [journeyId]
  );
  return res.rows[0] || null;
}

/**
 * Purpose-aware TTL sweep (§4.4).
 *
 * There is deliberately NO `needs_attention` term: an unarmed hold must not be held
 * hostage by an unrelated Zoho problem. Armed Google uncertainty stays protected by
 * `armed = true`, the outcome state, and the relevant active op.
 */
const RELEASE_EXPIRED_SQL = `
UPDATE booking_slot_reservations r
SET status = 'expired', expires_at = NULL, updated_at = now()
WHERE reservation_id IN (
  SELECT r2.reservation_id
  FROM booking_slot_reservations r2
  JOIN booking_journeys j USING (journey_id)
  WHERE r2.status = 'pending'
    AND r2.expires_at <= now()
    AND r2.armed = false
    AND (
      (r2.purpose = 'initial'
        AND j.google_event_id IS NULL
        AND COALESCE(j.google_outcome_state,'') NOT IN ('creating','unknown')
        AND NOT EXISTS (SELECT 1 FROM booking_journey_ops o
                        WHERE o.journey_id = r2.journey_id AND o.op = 'google_create_recovery'
                          AND (o.next_retry_at IS NOT NULL
                            OR o.state IN ('sending','watching','outcome_unknown'))))
      OR
      (r2.purpose = 'reschedule'
        AND j.reschedule_intent_state <> 'pending'
        AND COALESCE(j.google_outcome_state,'') NOT IN ('updating','unknown')
        AND NOT EXISTS (SELECT 1 FROM booking_journey_ops o
                        WHERE o.journey_id = r2.journey_id AND o.op = 'google_reschedule'
                          AND (o.next_retry_at IS NOT NULL
                            OR o.state IN ('sending','watching','outcome_unknown'))))
    )
  ORDER BY r2.expires_at
  FOR UPDATE SKIP LOCKED
  LIMIT $1)
RETURNING reservation_id, journey_id, purpose`;

async function releaseExpiredHolds(tx, limit = 100) {
  const res = await tx.query(RELEASE_EXPIRED_SQL, [limit]);
  return res.rows;
}

module.exports = {
  reservationTtlMinutes,
  upsertPendingHold,
  armHold,
  confirmHold,
  releaseHold,
  releaseAllHolds,
  promoteRescheduleHold,
  getHolds,
  liveHolds,
  pendingRescheduleHold,
  releaseExpiredHolds,
  RELEASE_EXPIRED_SQL,
};
