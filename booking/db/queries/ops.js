'use strict';

const { ConflictError } = require('../errors');

/**
 * The operation outbox: `ensureOp`, `startIntentOp`, `startAttemptOp`, `resumeOp`,
 * `completeOp`, `parkOp`, `terminateOp`, `recordOutcome`, and the claim protocol.
 *
 * Every function takes a `tx` and composes into the caller's transaction, which is
 * what makes the universal outbox rule enforceable: a state transition and its
 * operation activation always commit together (§4.8).
 */

/** Per-op retry budgets. The ladders themselves live in SQL (`ladder_delay`). */
const MAX_FAILURES = {
  reservation_release: 1,
  google_cancel: 10,
  google_reschedule: 10,
  google_create_recovery: 5,          // cadence only — never decides an outcome
  zoho_cancel_propagate: 8,
  zoho_reschedule_propagate: 8,
  zoho_identity_resolve: 8,
  zoho_record_write: 8,
  zoho_lead_terminal_update: 1,        // one send, never resent
  zoho_conversion_discover: 12,
  zoho_meeting_create: 8,
  zoho_deal_reconcile: 8,
  zoho_manual_review: 8,
};

/** Ops that begin a new *intent* cycle, gated on `intent_version`. */
const INTENT_OPS = new Set([
  'google_cancel', 'google_reschedule', 'zoho_cancel_propagate', 'zoho_reschedule_propagate',
]);

/** The only op whose create counter may ever be reset, and only by a new attempt. */
const ATTEMPT_OPS = new Set(['google_create_recovery']);

/** States a handled outcome may record. */
const OUTCOME_KINDS = new Set([
  'progress', 'no_progress', 'parked_precondition', 'watch_tick',
  'retryable_failure', 'terminal_failure',
]);

function maxFailures(op) {
  const m = MAX_FAILURES[op];
  if (m === undefined) throw new Error(`unknown_op:${op}`);
  return m;
}

function maxCrashReclaims() {
  return Number(process.env.JOBS_MAX_CRASH_RECLAIMS || 3);
}

/**
 * Make a first-time operation exist. NEVER revives a latch.
 *
 * The `WHERE` clause is the whole safety property: a non-matching predicate is a
 * silent no-op and the existing row stays authoritative. That is what protects
 * `zoho_lead_terminal_update` past `pending`, `zoho_record_write` at
 * `outcome_unknown`, `zoho_meeting_create` at `accepted`/`outcome_unknown`, and
 * anything in `sending`, `watching` or `terminal`.
 *
 * `zoho_manual_review` is the single deliberate exception and may re-arm from
 * `done`: it is idempotent by construction (stored task id, then the journey-scoped
 * Subject lookup) and works from a version snapshot, so a second reason updates the
 * existing Task rather than creating another.
 */
async function ensureOp(tx, journeyId, op, { delaySeconds = 0, deadlineAt = null } = {}) {
  const res = await tx.query(
    `INSERT INTO booking_journey_ops
       (journey_id, op, state, max_failures, max_crash_reclaims, next_retry_at, deadline_at)
     VALUES ($1, $2, 'pending', $3, $4, now() + make_interval(secs => $5), $6)
     ON CONFLICT (journey_id, op) DO UPDATE SET
       next_retry_at    = now() + make_interval(secs => $5),
       deadline_at      = COALESCE(EXCLUDED.deadline_at, booking_journey_ops.deadline_at),
       lease_expires_at = NULL,
       outcome_recorded = true,
       completed_at     = NULL,
       state            = 'pending',
       updated_at       = now()
     WHERE booking_journey_ops.next_retry_at IS NULL
       AND ( booking_journey_ops.state IN ('pending','parked')
          OR ( booking_journey_ops.op = 'zoho_manual_review'
               AND booking_journey_ops.state = 'done' ) )
     RETURNING op, state`,
    [journeyId, op, maxFailures(op), maxCrashReclaims(), delaySeconds, deadlineAt]
  );
  // rowCount 0 means "already exists and is authoritative" — a success, not a failure.
  return { armed: res.rowCount === 1 };
}

/**
 * Begin a genuinely new cycle. One implementation, two names for the two counters,
 * both requiring a STRICTLY NEWER version.
 *
 * The `CASE` on `create_attempts` is the load-bearing line: only a newer Google
 * booking-attempt cycle may clear a create counter, so no path can clear a Lead or
 * Meeting create latch. The assertions below make that structural rather than a
 * matter of the CASE staying correct.
 */
async function startCycleOp(tx, journeyId, op, cycleVersion, { delaySeconds = 0, deadlineAt = null } = {}) {
  const res = await tx.query(
    `INSERT INTO booking_journey_ops
       (journey_id, op, state, max_failures, max_crash_reclaims, next_retry_at, deadline_at, cycle_version)
     VALUES ($1, $2, 'pending', $3, $4, now() + make_interval(secs => $5), $6, $7)
     ON CONFLICT (journey_id, op) DO UPDATE SET
       state = 'pending', failure_count = 0, crash_reclaim_count = 0,
       last_error_code = NULL, last_error_at = NULL, last_outcome_kind = NULL,
       unknown_since = NULL, completed_at = NULL,
       watch_started_at = NULL, watch_until_at = NULL,
       deadline_at = EXCLUDED.deadline_at,
       lease_expires_at = NULL, outcome_recorded = true,
       create_attempts = CASE WHEN booking_journey_ops.op = 'google_create_recovery'
                              THEN 0 ELSE booking_journey_ops.create_attempts END,
       next_retry_at = now() + make_interval(secs => $5),
       cycle_version = EXCLUDED.cycle_version,
       updated_at = now()
     WHERE EXCLUDED.cycle_version > COALESCE(booking_journey_ops.cycle_version, -1)
     RETURNING op, cycle_version`,
    [journeyId, op, maxFailures(op), maxCrashReclaims(), delaySeconds, deadlineAt, cycleVersion]
  );
  return { armed: res.rowCount === 1 };
}

async function startIntentOp(tx, journeyId, op, intentVersion, opts) {
  if (!INTENT_OPS.has(op)) throw new Error(`startIntentOp_forbidden_for_op:${op}`);
  return startCycleOp(tx, journeyId, op, intentVersion, opts);
}

async function startAttemptOp(tx, journeyId, op, attemptVersion, opts) {
  // The sole path that resets create_attempts. Asserted here so the reset can
  // never reach a Lead or Meeting create latch even if the SQL CASE were edited.
  if (!ATTEMPT_OPS.has(op)) throw new Error(`startAttemptOp_forbidden_for_op:${op}`);
  return startCycleOp(tx, journeyId, op, attemptVersion, opts);
}

/**
 * `RT1.resume` only: make `google_create_recovery` due again ON THE SAME CYCLE.
 *
 * Neither `ensureOp` (refuses a `terminal` row) nor `startAttemptOp` (requires a
 * newer version, and resets `create_attempts`) can express this, and using the
 * latter would mint a new candidate ID and risk a SECOND Google event if the first
 * one did in fact land. Returns the preserved counters so the caller can assert
 * they did not move (test 100).
 */
async function resumeOp(tx, journeyId, op, cycleVersion, { deadlineSeconds }) {
  if (!ATTEMPT_OPS.has(op)) throw new Error(`resumeOp_forbidden_for_op:${op}`);
  const res = await tx.query(
    `UPDATE booking_journey_ops SET
       state = 'pending', next_retry_at = now(), completed_at = NULL,
       lease_expires_at = NULL, outcome_recorded = true,
       failure_count = 0, crash_reclaim_count = 0,
       deadline_at = now() + make_interval(secs => $3),
       updated_at = now()
     WHERE journey_id = $1 AND op = $2
       AND state = 'terminal'
       AND cycle_version IS NOT DISTINCT FROM $4
     RETURNING create_attempts, unknown_since, cycle_version, deadline_at`,
    [journeyId, op, deadlineSeconds, cycleVersion]
  );
  if (!res.rowCount) throw new ConflictError('resume_not_applicable');
  return res.rows[0];
}

/** Mark an op finished successfully. */
async function completeOp(tx, journeyId, op) {
  await tx.query(
    `UPDATE booking_journey_ops SET
       state = 'done', next_retry_at = NULL, lease_expires_at = NULL,
       outcome_recorded = true, crash_reclaim_count = 0,
       last_outcome_kind = 'progress', completed_at = now(), updated_at = now()
     WHERE journey_id = $1 AND op = $2`,
    [journeyId, op]
  );
}

/**
 * Park an op: it will not poll, and runs again only when another transaction
 * explicitly reactivates it. Distinct from `no_progress`, which keeps polling.
 *
 * CRITICAL: parking must NEVER downgrade a latched state. `parked` is precisely the
 * state `ensureOp` re-arms, so writing it over `outcome_unknown`, `accepted`, `sending`
 * or `terminal` would hand a revivable row to any later `ensureOp` and defeat the latch
 * that stops a duplicate Lead, Meeting or workflow-enabled update. The op still stops
 * polling — `next_retry_at` is cleared either way — it simply keeps the state that
 * records what already happened.
 */
const PARKABLE_STATES = ['pending', 'parked', 'watching', 'done'];

async function parkOp(tx, journeyId, op, reason) {
  await tx.query(
    `UPDATE booking_journey_ops SET
       state = CASE WHEN state = ANY($4::text[]) THEN 'parked' ELSE state END,
       next_retry_at = NULL, lease_expires_at = NULL,
       outcome_recorded = true, crash_reclaim_count = 0,
       last_outcome_kind = 'parked_precondition', last_error_code = $3, updated_at = now()
     WHERE journey_id = $1 AND op = $2`,
    [journeyId, op, reason || null, PARKABLE_STATES]
  );
}

/**
 * Move an op to `terminal` — given up, not in the retention busy set, and NOT
 * revivable by `ensureOp`. `create_attempts` and `unknown_since` are deliberately
 * preserved as the audit trail of what was attempted.
 */
async function terminateOp(tx, journeyId, op, reason) {
  await tx.query(
    `UPDATE booking_journey_ops SET
       state = 'terminal', next_retry_at = NULL, lease_expires_at = NULL,
       outcome_recorded = true, last_outcome_kind = 'terminal_failure',
       last_error_code = $3, last_error_at = now(), completed_at = now(), updated_at = now()
     WHERE journey_id = $1 AND op = $2`,
    [journeyId, op, reason || null]
  );
}

/** Durably record that an external CREATE is about to be issued. */
async function incrementCreateAttempts(tx, journeyId, op) {
  const res = await tx.query(
    `UPDATE booking_journey_ops SET
       create_attempts = create_attempts + 1, state = 'sending', updated_at = now()
     WHERE journey_id = $1 AND op = $2
     RETURNING create_attempts`,
    [journeyId, op]
  );
  if (!res.rowCount) throw new ConflictError('op_missing');
  return res.rows[0].create_attempts;
}

/** Enter the durable watch phase (§5.4). */
async function enterWatching(tx, journeyId, op, { watchHours, cadenceMinutes }) {
  await tx.query(
    `UPDATE booking_journey_ops SET
       state = 'watching',
       watch_started_at = now(),
       watch_until_at = now() + make_interval(hours => $3),
       next_retry_at = now() + make_interval(mins => $4),
       lease_expires_at = NULL, outcome_recorded = true, crash_reclaim_count = 0,
       updated_at = now()
     WHERE journey_id = $1 AND op = $2`,
    [journeyId, op, watchHours, cadenceMinutes]
  );
}

/**
 * Record exactly one handled outcome. All kinds set `outcome_recorded = true` and
 * reset `crash_reclaim_count`, because a handled outcome — even a failure — proves
 * the worker got to the end of the step rather than dying mid-flight.
 *
 * `watch_tick` and `no_progress` leave `failure_count` untouched: a failed read
 * during the watch phase is not a success, and a successful read that found nothing
 * is not a failure. Only `retryable_failure` consumes budget.
 */
async function recordOutcome(tx, journeyId, op, kind, { errorCode = null, retryAfterSeconds = null } = {}) {
  if (!OUTCOME_KINDS.has(kind)) throw new Error(`unknown_outcome_kind:${kind}`);

  if (kind === 'parked_precondition') return parkOp(tx, journeyId, op, errorCode);

  const bumpsFailure = kind === 'retryable_failure';
  await tx.query(
    `UPDATE booking_journey_ops SET
       failure_count = failure_count + $4,
       crash_reclaim_count = 0,
       outcome_recorded = true,
       lease_expires_at = NULL,
       last_outcome_kind = $3,
       last_error_code = COALESCE($5::text, last_error_code),
       last_error_at = CASE WHEN $4 = 1 THEN now() ELSE last_error_at END,
       -- Retry-After overrides the pre-committed backoff when the remote asked us to
       -- wait. The cast is required: a bare NULL parameter used first in an IS NOT NULL
       -- test gives Postgres nothing to infer from ("could not determine data type").
       next_retry_at = CASE WHEN $6::double precision IS NOT NULL
                            THEN now() + make_interval(secs => $6::double precision)
                            ELSE next_retry_at END,
       updated_at = now()
     WHERE journey_id = $1 AND op = $2`,
    [journeyId, op, kind, bumpsFailure ? 1 : 0, errorCode, retryAfterSeconds]
  );
}

/** Set `outcome_unknown` after an uncertain external create (§6.8). */
async function markOutcomeUnknown(tx, journeyId, op) {
  await tx.query(
    `UPDATE booking_journey_ops SET
       state = 'outcome_unknown',
       unknown_since = COALESCE(unknown_since, now()),
       outcome_recorded = true, lease_expires_at = NULL, crash_reclaim_count = 0,
       updated_at = now()
     WHERE journey_id = $1 AND op = $2
     RETURNING unknown_since`,
    [journeyId, op]
  );
}

async function getOp(tx, journeyId, op) {
  const res = await tx.query(
    'SELECT * FROM booking_journey_ops WHERE journey_id = $1 AND op = $2',
    [journeyId, op]
  );
  return res.rows[0] || null;
}

async function listOps(tx, journeyId) {
  const res = await tx.query(
    'SELECT * FROM booking_journey_ops WHERE journey_id = $1 ORDER BY op',
    [journeyId]
  );
  return res.rows;
}

/**
 * Claim due work. Ceiling termination happens INSIDE this transaction and
 * over-ceiling rows are excluded from the returned batch, so no handler and no
 * external call ever executes for them.
 */
const CLAIM_SQL = `
UPDATE booking_journey_ops o SET
  run_count           = o.run_count + 1,
  crash_reclaim_count = o.crash_reclaim_count
    + CASE WHEN o.lease_expires_at IS NOT NULL AND o.lease_expires_at < now()
                AND o.outcome_recorded = false THEN 1 ELSE 0 END,
  outcome_recorded    = false,
  first_attempted_at  = COALESCE(o.first_attempted_at, now()),
  lease_expires_at    = now() + make_interval(mins => 5),
  next_retry_at       = now()
                        + ladder_delay(o.op, o.state, o.failure_count,
                                       now() - COALESCE(o.first_attempted_at, now()))
                        + (random() * interval '20 seconds'),
  updated_at          = now()
WHERE (o.journey_id, o.op) IN (
  SELECT journey_id, op FROM booking_journey_ops
  WHERE next_retry_at <= now()
    AND (lease_expires_at IS NULL OR lease_expires_at < now())
  ORDER BY op_priority(op), next_retry_at
  FOR UPDATE SKIP LOCKED
  LIMIT $1)
RETURNING o.journey_id, o.op, o.state, o.failure_count, o.crash_reclaim_count,
          o.max_crash_reclaims, o.max_failures, o.create_attempts, o.unknown_since,
          o.deadline_at, o.watch_until_at, o.watch_started_at, o.cycle_version`;

module.exports = {
  MAX_FAILURES,
  INTENT_OPS,
  ATTEMPT_OPS,
  OUTCOME_KINDS,
  CLAIM_SQL,
  maxFailures,
  maxCrashReclaims,
  ensureOp,
  startIntentOp,
  startAttemptOp,
  resumeOp,
  completeOp,
  parkOp,
  terminateOp,
  incrementCreateAttempts,
  enterWatching,
  recordOutcome,
  markOutcomeUnknown,
  getOp,
  listOps,
};
