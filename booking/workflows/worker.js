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
 * Claim due work. Ceiling termination happens INSIDE this transaction and over-ceiling
 * rows are excluded from the returned batch, so no handler and no external call ever
 * executes for them.
 */
async function claimBatch(limit) {
  return db.withTransaction(async (tx) => {
    const claimed = await tx.query(O.CLAIM_SQL, [limit]);
    const ready = [];

    for (const row of claimed.rows) {
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
 * One worker pass. Bounded by both a batch size and a wall-clock budget so a pass
 * always returns inside the function's `maxDuration` rather than being killed
 * mid-step, which would leave a live lease and inflate the crash counter.
 */
async function runPass({ limit, timeBudgetMs } = {}) {
  const batchLimit = limit || Number(process.env.JOBS_BATCH_LIMIT || 20);
  const budget = timeBudgetMs || Number(process.env.JOBS_TIME_BUDGET_MS || 40_000);
  const startedAt = Date.now();

  const claimed = await claimBatch(batchLimit);
  const results = [];
  for (const claim of claimed) {
    if (Date.now() - startedAt > budget) {
      // Unstarted claims keep their pre-committed `next_retry_at`, so they are simply
      // due again on the next pass. Nothing is lost by stopping here.
      log({ evt: 'worker.pass.budget_exhausted', remaining: claimed.length - results.length });
      break;
    }
    results.push(await runOne(claim));
  }

  return {
    claimed: claimed.length,
    ran: results.length,
    outcomes: results.reduce((acc, r) => { acc[r.outcome] = (acc[r.outcome] || 0) + 1; return acc; }, {}),
  };
}

/** The per-minute reservation TTL sweep, independent of any journey's ops. */
async function sweepReservations(limit) {
  const released = await db.withTransaction((tx) => R.releaseExpiredHolds(tx, limit || 100));
  if (released.length) log({ evt: 'worker.reservations.expired', count: released.length });
  return released.length;
}

module.exports = { claimBatch, runOne, runPass, sweepReservations, HANDLERS };
