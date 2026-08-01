'use strict';

const { ConflictError } = require('../errors');

/**
 * Event bindings: which Google event stood for this booking, when, and on whose
 * authority (§4.1, §4.10 change #6).
 *
 * Revision 15 made adoption write-once, on the reasoning that one journey adopts
 * one event. That is wrong over a journey's lifetime: an adopted event can itself
 * disappear — the host deletes the replacement, or it is cancelled — which raises
 * G7 again, and the operator must be able to adopt a SECOND verified replacement.
 * Write-once would have left that journey permanently unresolvable, with no action
 * able to move it.
 */

const BOUND_ACTIONS = new Set(['pipeline_create', 'rt1_adopt', 'rg7_adopt_old', 'rg7_adopt_new']);
const UNBOUND_REASONS = new Set(['superseded', 'event_absent', 'cancelled', 'rescheduled']);

/**
 * Bind an event to a journey, closing any existing live binding first.
 *
 * ===========================================================================
 * APPROVED DEVIATION 2 — the ordering here is load-bearing.
 *
 * These MUST be two ordered statements: close the live binding, THEN insert the
 * replacement. A single statement doing both — an INSERT with a data-modifying CTE
 * that closes the old row — violates `bjeb_one_live_per_journey`, because a unique
 * index is checked per statement and both rows are live within it. Confirmed
 * against PostgreSQL 17.10: the ordered form succeeds, the reverse order fails.
 *
 * Exactly the same rule the plan already documents for G5 against
 * `bsr_one_confirmed`: a partial unique index cannot be deferred, so the release
 * must precede the promotion. Do not collapse these into one statement.
 * ===========================================================================
 */
async function bindEvent(tx, journeyId, {
  googleEventId,
  slotStartUtc,
  boundAction,
  resolutionId = null,
  unboundReason = 'superseded',
}) {
  if (!BOUND_ACTIONS.has(boundAction)) throw new Error(`unknown_bound_action:${boundAction}`);
  if (!UNBOUND_REASONS.has(unboundReason)) throw new Error(`unknown_unbound_reason:${unboundReason}`);

  // STATEMENT 1 — close the existing live binding.
  const closed = await tx.query(
    `UPDATE booking_journey_event_bindings
        SET unbound_at = now(), unbound_reason = $2
      WHERE journey_id = $1 AND unbound_at IS NULL
      RETURNING binding_id, google_event_id`,
    [journeyId, unboundReason]
  );

  // STATEMENT 2 — insert the replacement. Never merged into statement 1.
  const inserted = await tx.query(
    `INSERT INTO booking_journey_event_bindings
       (journey_id, google_event_id, slot_start_utc, bound_action, bound_by_resolution_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING binding_id, google_event_id, bound_at`,
    [journeyId, googleEventId, slotStartUtc, boundAction, resolutionId]
  );

  return {
    binding: inserted.rows[0],
    supersededEventId: closed.rowCount ? closed.rows[0].google_event_id : null,
  };
}

/**
 * Close the live binding without replacing it — used when a booking is cancelled or
 * its event is proven gone.
 */
async function unbindEvent(tx, journeyId, unboundReason) {
  if (!UNBOUND_REASONS.has(unboundReason)) throw new Error(`unknown_unbound_reason:${unboundReason}`);
  const res = await tx.query(
    `UPDATE booking_journey_event_bindings
        SET unbound_at = now(), unbound_reason = $2
      WHERE journey_id = $1 AND unbound_at IS NULL
      RETURNING binding_id, google_event_id`,
    [journeyId, unboundReason]
  );
  return res.rowCount ? res.rows[0] : null;
}

async function liveBinding(tx, journeyId) {
  const res = await tx.query(
    `SELECT * FROM booking_journey_event_bindings
      WHERE journey_id = $1 AND unbound_at IS NULL`,
    [journeyId]
  );
  return res.rows[0] || null;
}

/** Full history, oldest first. Answers "how many replacements did this need?". */
async function bindingHistory(tx, journeyId) {
  const res = await tx.query(
    `SELECT * FROM booking_journey_event_bindings
      WHERE journey_id = $1 ORDER BY bound_at`,
    [journeyId]
  );
  return res.rows;
}

/**
 * Is this event id already another journey's LIVE binding?
 *
 * An id appearing only in another journey's CLOSED history is permitted, because
 * that journey no longer claims it. Drives `409 event_already_bound`.
 */
async function eventBoundElsewhere(tx, journeyId, googleEventId) {
  const res = await tx.query(
    `SELECT journey_id FROM booking_journey_event_bindings
      WHERE google_event_id = $1 AND unbound_at IS NULL AND journey_id <> $2
      LIMIT 1`,
    [googleEventId, journeyId]
  );
  if (res.rowCount) return res.rows[0].journey_id;
  // Also check the journey table's current event, which carries its own unique index.
  const j = await tx.query(
    `SELECT journey_id FROM booking_journeys
      WHERE google_event_id = $1 AND journey_id <> $2 LIMIT 1`,
    [googleEventId, journeyId]
  );
  return j.rowCount ? j.rows[0].journey_id : null;
}

module.exports = {
  BOUND_ACTIONS,
  UNBOUND_REASONS,
  bindEvent,
  unbindEvent,
  liveBinding,
  bindingHistory,
  eventBoundElsewhere,
  ConflictError,
};
