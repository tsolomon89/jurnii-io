'use strict';

const db = require('../db');
const O = require('../db/queries/ops');
const RV = require('../db/queries/review');
const R = require('../db/queries/reservations');
const { log } = require('../lib/http');

/**
 * The durable worker: claim, dispatch, record exactly one outcome.
 *
 * This file owns SCHEDULING only. Every state transition is a repository transaction
 * from `db/queries/*` — no §4.8 logic is reimplemented here or in any step handler, so
 * there is one definition of what each transition means and the tests that pin those
 * transactions also pin the worker.
 */

const HANDLERS = {
  reservation_release: require('./reservation-ops').releaseExpired,

  google_create_recovery: require('./google-ops').createRecovery,
  google_cancel: require('./google-ops').cancel,
  google_reschedule: require('./google-ops').reschedule,

  zoho_identity_resolve: require('./zoho-ops').identityResolve,
  zoho_record_write: require('./zoho-ops').recordWrite,
  zoho_lead_terminal_update: require('./zoho-ops').leadTerminalUpdate,
  zoho_conversion_discover: require('./zoho-ops').conversionDiscover,
  zoho_meeting_create: require('./zoho-ops').meetingCreate,
  zoho_deal_reconcile: require('./zoho-ops').dealReconcile,
  zoho_cancel_propagate: require('./zoho-ops').cancelPropagate,
  zoho_reschedule_propagate: require('./zoho-ops').reschedulePropagate,
  zoho_manual_review: require('./manual-review').reconcileTask,
};

/**
 * Terminate any claimed row that is over the crash-reclaim ceiling and return the rows
 * that are safe to run.
 *
 * Shared by `claimBatch` and `claimOne` so the ceiling has ONE definition. Runs inside
 * the caller's claim transaction, which is what makes "no handler and no external call
 * ever executes for an over-ceiling row" true rather than aspirational.
 */
async function readyAfterCeiling(tx, rows) {
  const ready = [];

  for (const row of rows) {
    if (row.crash_reclaim_count < row.max_crash_reclaims) { ready.push(row); continue; }

    // The ceiling TERMINATES, it does not park: `parked` is the state `ensureOp`
    // re-arms, so a crash-looped create whose external call may already have
    // succeeded could otherwise be revived and issue a duplicate.
    await O.terminateOp(tx, row.journey_id, row.op, 'worker_crash_loop');
    await RV.addReviewReason(tx, row.journey_id, 'worker_crash_loop');

    if (row.op === 'zoho_manual_review') {
      // Do NOT re-arm the reviewer into its own crash loop — that would ask a
      // crash-looping reviewer to report its own crash loop. Alert instead; the
      // journey is found by the §18 ops query rather than by a CRM Task.
      log({ evt: 'worker.crash_loop.review_unavailable', journeyId: row.journey_id });
    } else {
      await O.ensureOp(tx, row.journey_id, 'zoho_manual_review');
    }
    log({ evt: 'worker.crash_loop.terminated', journeyId: row.journey_id, op: row.op });
  }
  return ready;
}

/**
 * Claim a BATCH of due work.
 *
 * Retained for callers that genuinely want a whole batch at once — the crash-ceiling
 * tests, which need a large limit so a low-priority op is not starved behind other
 * rows. `runPass` deliberately does NOT use this: see `claimOne`.
 */
async function claimBatch(limit) {
  return db.withTransaction(async (tx) => {
    const claimed = await tx.query(O.CLAIM_SQL, [limit]);
    return readyAfterCeiling(tx, claimed.rows);
  });
}

/**
 * Claim EXACTLY ONE due operation, for a caller that will run it immediately.
 *
 * `claimedRow` distinguishes "nothing is due" (stop) from "one row was claimed and the
 * ceiling terminated it" (keep going — there may be more due work behind it). A
 * terminated row has `next_retry_at = NULL`, so it can never be claimed again and the
 * caller's loop cannot spin on it.
 */
async function claimOne() {
  return db.withTransaction(async (tx) => {
    const claimed = await tx.query(O.CLAIM_ONE_SQL);
    const ready = await readyAfterCeiling(tx, claimed.rows);
    return { claim: ready[0] || null, claimedRow: claimed.rowCount === 1 };
  });
}

/**
 * Run one claimed operation.
 *
 * A handler returns `{ kind, errorCode?, retryAfterSeconds? }` where `kind` is a
 * handled-outcome kind, or `{ kind: 'progress' }` when it already committed a
 * transition that completed the op. Exactly one outcome is recorded either way: a
 * handler that throws is recorded as `retryable_failure`, so a claimed op never ends a
 * pass with no outcome and an unreleased lease.
 */
async function runOne(claim) {
  const { journey_id: journeyId, op } = claim;
  const handler = HANDLERS[op];
  if (!handler) {
    await db.withTransaction((tx) => O.recordOutcome(tx, journeyId, op, 'retryable_failure',
      { errorCode: 'no_handler' }));
    return { op, journeyId, outcome: 'no_handler' };
  }

  let result;
  try {
    result = await handler(claim) || { kind: 'progress' };
  } catch (err) {
    // Safe code only — never a third-party message, which can quote an email or an
    // internal payload fragment.
    const code = err && err.code ? String(err.code) : 'handler_error';
    await db.withTransaction((tx) => O.recordOutcome(tx, journeyId, op, 'retryable_failure',
      { errorCode: code }));
    log({ evt: 'worker.op.failed', journeyId, op, code });
    return { op, journeyId, outcome: 'retryable_failure', code };
  }

  // A handler that committed its own terminal/progress transaction says so and we do
  // not double-record; anything else records its outcome here.
  if (result.recorded !== true) {
    await db.withTransaction((tx) => O.recordOutcome(tx, journeyId, op, result.kind, {
      errorCode: result.errorCode || null,
      retryAfterSeconds: result.retryAfterSeconds || null,
    }));
  }
  log({ evt: 'worker.op.done', journeyId, op, outcome: result.kind });
  return { op, journeyId, outcome: result.kind };
}

/**
 * One worker pass: claim ONE operation, run it, repeat. Bounded by a maximum number of
 * operations and a wall-clock budget, so a pass returns inside the function's
 * `maxDuration` rather than being killed mid-step.
 *
 * THE BUDGET IS CHECKED BEFORE EACH CLAIM, NEVER AFTER. This pass used to claim a whole
 * batch up front and then stop mid-iteration when the budget ran out, and the comment
 * here used to say the unstarted claims were "simply due again on the next pass".
 * They were not. The claim commits a 5-minute lease and `outcome_recorded = false`, and
 * the claim predicate requires an EXPIRED lease — so an unstarted claim was blocked for
 * five minutes rather than for its ladder delay, and when the lease expired the
 * `crash_reclaim_count` arithmetic counted it as a crash because no outcome had been
 * recorded. Three such passes and `readyAfterCeiling` terminated the op and escalated it
 * to Manual Review, for an operation that had never executed. Claiming exactly what we
 * are about to run removes the failure mode entirely: every claimed row is started, so
 * every lease is held by something that is genuinely running.
 *
 * A row that is due but not reached keeps its existing `next_retry_at` and holds NO
 * lease, so it is claimable immediately on the next pass.
 */
async function runPass({ limit, timeBudgetMs, opReserveMs } = {}) {
  // `??`, not `||`: 0 is a meaningful value for every one of these — a caller asking for
  // no reserve must get no reserve, not the default. (`||` silently substituted the
  // default and made `budget - reserve` negative, so the pass broke before its first
  // claim and reported zero work.) The env fallbacks keep `||` deliberately, so an empty
  // string is treated as unset rather than as 0.
  const maxOps = limit ?? Number(process.env.JOBS_BATCH_LIMIT || 20);
  const budget = timeBudgetMs ?? Number(process.env.JOBS_TIME_BUDGET_MS || 40_000);
  // Headroom so we do not start an operation at the very edge of the budget. A single
  // step is bounded by ZOHO_REQUEST_TIMEOUT_MS (12s) and PG_STATEMENT_TIMEOUT_MS (15s),
  // and the budget already sits well under `maxDuration`.
  const reserve = opReserveMs ?? Number(process.env.JOBS_OP_RESERVE_MS || 5_000);
  const startedAt = Date.now();

  const results = [];
  let claimed = 0;
  let ceilingTerminated = 0;

  // Every iteration either breaks, runs an op, or terminates an over-ceiling row — and a
  // terminated row has `next_retry_at = NULL`, so it cannot be re-claimed. The explicit
  // claim cap is belt-and-braces against an unbounded pass.
  const maxClaims = maxOps * 2;

  while (results.length < maxOps && claimed < maxClaims) {
    if (Date.now() - startedAt > budget - reserve) {
      log({ evt: 'worker.pass.budget_exhausted', ran: results.length });
      break;
    }

    const { claim, claimedRow } = await claimOne();
    if (!claimedRow) break;                       // nothing is due
    claimed += 1;
    if (!claim) { ceilingTerminated += 1; continue; }  // over-ceiling: terminated, not run

    results.push(await runOne(claim));
  }

  return {
    claimed,
    ran: results.length,
    ceilingTerminated,
    outcomes: results.reduce((acc, r) => { acc[r.outcome] = (acc[r.outcome] || 0) + 1; return acc; }, {}),
  };
}

/** The per-minute reservation TTL sweep, independent of any journey's ops. */
async function sweepReservations(limit) {
  const released = await db.withTransaction((tx) => R.releaseExpiredHolds(tx, limit || 100));
  if (released.length) log({ evt: 'worker.reservations.expired', count: released.length });
  return released.length;
}

module.exports = { claimBatch, claimOne, runOne, runPass, sweepReservations, HANDLERS };
