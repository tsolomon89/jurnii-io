'use strict';

const { log } = require('./http');

/**
 * Post-commit dispatch: wake a worker for a journey whose transaction has just committed.
 *
 * WHAT THIS IS, PRECISELY. It is a HINT, not a delivery. Postgres — `booking_journey_ops`
 * — remains the authority on what work exists; this only decides *when someone looks*. A
 * lost dispatch therefore costs latency and nothing else: the operation is still `pending`
 * with `next_retry_at <= now()`, and the scheduled recovery sweep claims it. Nothing here
 * writes operation state, so a lost hint is indistinguishable from one that was never due.
 * That is what makes it safe for this to be best-effort.
 *
 * ORDERING. `publish` is SYNCHRONOUS REGISTRATION. It must be called after `COMMIT` has
 * returned and BEFORE the handler returns its response — never after `res.json()`, which
 * ends the response and may let the runtime freeze the invocation before the work is
 * registered. It does not await the drain, and it never throws, so it cannot change what
 * the visitor sees.
 *
 * `waitUntil` IS INJECTED, not imported. That keeps `@vercel/functions` at the edge of the
 * system, makes this module trivially stubbable in tests, and means the runtime's request
 * context is resolved where it actually exists — in the handler. `waitUntil` is also
 * best-effort by nature: it shares the current function's timeout and may be cancelled at
 * instance shutdown. Cancellation is safe by construction — the drain commits per
 * operation, and anything unstarted keeps its pre-committed `next_retry_at`.
 *
 * Phase 1 runs the drain in-process. There is deliberately NO internal HTTP call: it would
 * need a base URL (and `PUBLIC_BASE_URL` points at a domain that is not aliased), a
 * credential, and an exemption from Deployment Protection, to buy nothing Phase 1 needs.
 * When a durable transport is introduced, only `runDrain` below changes.
 */

/** Must be exactly `true`. Absent, empty or anything else means disabled — fail-safe. */
function isEnabled(env) {
  return String((env || process.env).BOOKING_DISPATCH_ENABLED || '').toLowerCase() === 'true';
}

/**
 * The unit of work a wake performs. Required lazily so that requiring this module never
 * pulls in the worker, its handlers, or the two integration clients — the request path
 * must not load the Zoho transport just to be able to publish.
 */
function runDrain(journeyId, reason) {
  const worker = require('../workflows/worker');
  return worker.runJourneyUntilBlocked(journeyId, { source: 'dispatch' })
    .then((r) => {
      log({
        evt: 'dispatch.drained',
        journeyId,
        reason,
        ran: r.ran,
        stoppedBecause: r.stoppedBecause,
        journeyComplete: r.journeyComplete,
        // Recorded because it is the signal that a wake ended with runnable work left. In
        // Phase 1 the sweep picks that up; a durable transport would publish a
        // continuation instead.
        continuationRequired: r.continuationRequired,
      });
      return r;
    })
    .catch((err) => {
      // A safe code only — never a third-party message, which can quote an email or a
      // payload fragment (§10).
      log({ evt: 'dispatch.failed', journeyId, reason, code: (err && err.code) || 'drain_error' });
    });
}

/**
 * Register background processing for every journey a just-committed transaction made
 * runnable.
 *
 * Synchronous. Never throws. Never awaits the drain. Safe to call with an empty set, with
 * dispatch disabled, and without a `waitUntil` implementation.
 *
 * @param {Iterable<string>} journeyIds  from `withTransaction(fn, { collectRunnable })`
 * @param {{ reason: string, waitUntil?: Function }} opts
 * @returns {number} how many journeys were registered — for tests and logs, not control flow
 */
function publish(journeyIds, { reason = 'unspecified', waitUntil } = {}) {
  if (!isEnabled()) return 0;

  const ids = journeyIds ? [...journeyIds] : [];
  if (!ids.length) return 0;

  if (typeof waitUntil !== 'function') {
    // Deliberately do NOT fire a detached promise. An unowned promise after the response
    // is unreliable on a serverless runtime and can surface as an unhandled rejection;
    // the recovery sweep already covers this case, at the cost of one interval.
    log({ evt: 'dispatch.skipped_no_waituntil', reason, count: ids.length });
    return 0;
  }

  let registered = 0;
  for (const journeyId of ids) {
    // The drain must not START unless it is also OWNED. `waitUntil(runDrain(...))` would
    // evaluate `runDrain` first, so a `waitUntil` that throws would leave the drain
    // running unowned — the detached promise this module exists to avoid, and one that
    // would issue real external calls with nothing tracking it.
    //
    // So the work is deferred behind a microtask and guarded by a flag. `waitUntil` is
    // called synchronously, before any microtask can run, which means a throw reaches
    // `cancelled = true` first and the body becomes a no-op.
    let cancelled = false;
    const work = Promise.resolve().then(() => (cancelled ? undefined : runDrain(journeyId, reason)));
    try {
      waitUntil(work);
      registered += 1;
    } catch (err) {
      cancelled = true;
      // Registration failing must not affect the response.
      log({ evt: 'dispatch.failed', journeyId, reason, code: (err && err.code) || 'register_error' });
    }
  }
  if (registered) log({ evt: 'dispatch.published', reason, count: registered });
  return registered;
}

module.exports = { publish, isEnabled, runDrain };
