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
 * Record that this transaction made a journey RUNNABLE NOW, so the top-level execution
 * context can wake a worker for it after COMMIT (see `db/index.js`).
 *
 * Called ONLY when an arming primitive actually changed something and the row is due
 * immediately. An op armed with a delay is not runnable now, so it is deliberately not
 * marked — a wake for it would find nothing to claim.
 *
 * Guarded: `withSession`, hand-built test transactions and any future caller may pass a
 * bare `tx`. Marking is an optimisation, never a correctness requirement, so its absence
 * must be silent rather than a crash.
 */
function markRunnable(tx, journeyId) {
  if (tx && typeof tx.markRunnable === 'function') tx.markRunnable(journeyId);
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
  const armed = res.rowCount === 1;
  if (armed && delaySeconds === 0) markRunnable(tx, journeyId);
  return { armed };
}

/**
 * MR1 repair — revive a `zoho_meeting_create` that finished WITHOUT creating anything.
 *
 * `ensureOp` deliberately refuses to revive a `done` op, and `resumeOp` is restricted to
 * `google_create_recovery`. Both refusals exist to stop a second Meeting, so the repair
 * needs its own narrow door rather than a widened one.
 *
 * `create_attempts = 0` is the whole guarantee. It means no create request ever left
 * this process, so there is no possibility of an in-flight or landed Meeting to
 * duplicate — the op escalated before it ever tried, which is exactly the bug
 * `create_meeting_only` repairs. An op with `create_attempts >= 1` had an UNCERTAIN
 * outcome; reviving that could produce a duplicate, so it is left to the operator and
 * this statement matches nothing.
 */
async function reviveMeetingCreateForRepair(tx, journeyId) {
  const res = await tx.query(
    `UPDATE booking_journey_ops SET
       state = 'pending', next_retry_at = now(), completed_at = NULL,
       lease_expires_at = NULL, outcome_recorded = true, failure_count = 0,
       updated_at = now()
      WHERE journey_id = $1 AND op = 'zoho_meeting_create' AND create_attempts = 0
      RETURNING op`,
    [journeyId]
  );
  const revived = res.rowCount === 1;
  // `next_retry_at = now()`, so the repair is runnable the moment this commits — which is
  // what replaces "lands on the next worker pass (a minute)" with "lands now".
  if (revived) markRunnable(tx, journeyId);
  return { revived };
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
  const armed = res.rowCount === 1;
  if (armed && delaySeconds === 0) markRunnable(tx, journeyId);
  return { armed };
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
  markRunnable(tx, journeyId);   // sets next_retry_at = now()
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
 *
 * A CLAIM IS NOT FREE, and that is why there are two forms of it. Every claim commits a
 * 5-minute `lease_expires_at` and `outcome_recorded = false`, and the claim predicate
 * below requires the lease to have EXPIRED before a row can be claimed again. So a row
 * that is claimed but never executed is unclaimable for five minutes — not for its
 * ladder delay — and when that lease does expire the `crash_reclaim_count` arithmetic
 * above counts it as a crash, because `outcome_recorded` is still false. Three of those
 * and `claimBatch` terminates the op and escalates it to Manual Review, for work that
 * never ran.
 *
 * `CLAIM_ONE_SQL` therefore exists so a caller can claim exactly what it is about to
 * execute. `CLAIM_SQL` is retained for callers that genuinely want a whole batch (the
 * crash-ceiling tests, which need a large limit to avoid being starved by other rows).
 *
 * `CLAIM_ONE_FOR_JOURNEY_SQL` narrows the same protocol to a single journey, for the
 * post-commit drain. It keeps `FOR UPDATE SKIP LOCKED`, the same lease, the same
 * pre-committed ladder and the same `op_priority` ordering, so a journey-scoped consumer
 * and the global cron cannot both take the same row. `LIMIT 1` is deliberate rather than a
 * batch: `zoho_meeting_create` and `zoho_conversion_discover` share priority 40, and a
 * batched claim pre-commits a backoff for both — so if the Meeting ran first it would
 * correctly report `awaiting_contact`, having already burned its claim, and would then wait
 * a full minute even though conversion discovery finds the Contact seconds later. Claiming
 * one at a time re-evaluates priority after every operation, so the Meeting is not claimed
 * until it can succeed. The `(journey_id, op)` primary key and `idx_bjo_active` already
 * support the narrowed scan, so no migration is needed.
 *
 * `limitClause` and `byJourney` are literals supplied by this module — never a caller's
 * value — so interpolating them cannot carry untrusted input into the statement.
 */
function claimStatement(limitClause, { byJourney = false } = {}) {
  return `
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
    ${byJourney ? 'AND journey_id = $1' : ''}
  ORDER BY op_priority(op), next_retry_at
  FOR UPDATE SKIP LOCKED
  ${limitClause})
RETURNING o.journey_id, o.op, o.state, o.failure_count, o.crash_reclaim_count,
          o.max_crash_reclaims, o.max_failures, o.create_attempts, o.unknown_since,
          o.deadline_at, o.watch_until_at, o.watch_started_at, o.cycle_version`;
}

/** Batch form: `$1` is the limit. */
const CLAIM_SQL = claimStatement('LIMIT $1');

/** Single-row form, for a caller that runs each claim immediately. No parameters. */
const CLAIM_ONE_SQL = claimStatement('LIMIT 1');

/** Single row within ONE journey: `$1` is the journey id. The limit is a literal 1. */
const CLAIM_ONE_FOR_JOURNEY_SQL = claimStatement('LIMIT 1', { byJourney: true });

/**
 * The run state of one journey, for deciding what to schedule after a drain stops.
 *
 * `hasDueNow` uses the CLAIM PREDICATE, not "any row with a past `next_retry_at`", so it
 * reports what a claim would actually get — work currently leased by another worker is
 * correctly excluded rather than counted as ours to do.
 *
 * `journeyComplete` is the negation of `idx_bjo_active`'s partial-index predicate, so it
 * reuses that index directly. A journey with no op rows reads as complete: there is
 * nothing outstanding, which is the question being asked.
 *
 * `bool_or` over zero rows is NULL, hence the COALESCEs.
 */
async function journeyRunState(tx, journeyId) {
  const res = await tx.query(
    `SELECT
       min(next_retry_at)                                     AS next_due_at,
       COALESCE(bool_or(next_retry_at <= now()
                        AND (lease_expires_at IS NULL
                             OR lease_expires_at < now())), false)          AS has_due_now,
       NOT COALESCE(bool_or(next_retry_at IS NOT NULL
                            OR state IN ('sending','watching','outcome_unknown')),
                    false)                                                 AS journey_complete
     FROM booking_journey_ops WHERE journey_id = $1`,
    [journeyId]
  );
  const r = res.rows[0];
  return {
    nextDueAt: r.next_due_at,
    hasDueNow: r.has_due_now,
    journeyComplete: r.journey_complete,
  };
}

module.exports = {
  MAX_FAILURES,
  INTENT_OPS,
  ATTEMPT_OPS,
  OUTCOME_KINDS,
  CLAIM_SQL,
  CLAIM_ONE_SQL,
  CLAIM_ONE_FOR_JOURNEY_SQL,
  journeyRunState,
  maxFailures,
  maxCrashReclaims,
  ensureOp,
  startIntentOp,
  startAttemptOp,
  resumeOp,
  completeOp,
  parkOp,
  terminateOp,
  reviveMeetingCreateForRepair,
  incrementCreateAttempts,
  enterWatching,
  recordOutcome,
  markOutcomeUnknown,
  getOp,
  listOps,
};
