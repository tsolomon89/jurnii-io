'use strict';

/**
 * Post-commit dispatch against real Postgres, with the Zoho transport stubbed.
 *
 * Two properties dominate here and both are safety properties rather than features:
 *
 *   1. ORDERING. Nothing is published before its transaction commits, and publication is
 *      registered before the handler returns — not after `res.json()`, which ends the
 *      response and may let the runtime freeze the invocation first.
 *   2. NO AUTHORITY. Losing a dispatch costs latency and nothing else. The operation stays
 *      exactly as the transaction left it, with no lease, no attempt recorded, and no
 *      crash count — indistinguishable from a wake that was never due.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const path = require('path');

const db = require('../../db');
const J = require('../../db/queries/journeys');
const O = require('../../db/queries/ops');
const RV = require('../../db/queries/review');
const { track, purgeTracked } = require('./_fixtures');

const skip = db.isConfigured() ? false : 'DATABASE_URL not set';

process.env.JWT_SECRET ||= 'dispatch-test-secret';

const ZPATH = require.resolve('../../integrations/zoho/index.js');
const GPATH = require.resolve('../../integrations/google/index.js');
const DPATH = require.resolve('../../lib/dispatch.js');

/** Stub Zoho so the Lead chain can advance without a network. Un-stubbed calls throw. */
function stubZoho(overrides = {}) {
  const real = require(ZPATH);
  const calls = [];
  const base = {
    searchContactsByEmail: async () => [],
    searchUnconvertedLeadsByEmail: async () => [],
    createLeadSuppressed: async () => ({ ok: true, id: 'LEAD1' }),
    updateLeadSuppressed: async () => ({ ok: true, id: 'LEAD1' }),
    updateContactSuppressed: async () => ({ ok: true, id: 'C1' }),
  };
  const impls = { ...base, ...overrides };
  const wrapped = { ...real };
  for (const [name, impl] of Object.entries(impls)) {
    wrapped[name] = (...args) => { calls.push({ name, args }); return impl(...args); };
  }
  // Anything not stubbed and not a pure helper fails loudly rather than hitting the network.
  const PURE = ['ZohoError', 'writePayload', 'buildMeetingPayload', 'buildManualReviewTask',
    'formatZohoDateTime', 'readConversion', 'accountIdOfContact', 'taskIsClosed',
    'duplicateRecordId', 'firstWriteResult', 'manualReviewSubject', 'isDefiniteReject',
    'retryAfterSeconds', 'extractMeetLink', 'deterministicEventId', 'requireCalendarId',
    'classify', 'sha256hex', 'resolveProductDeal'];
  for (const name of Object.keys(real)) {
    if (typeof real[name] !== 'function' || impls[name] || PURE.includes(name)) continue;
    wrapped[name] = (...args) => {
      calls.push({ name, args, unexpected: true });
      throw new Error(`unexpected external call: ${name}`);
    };
  }
  require.cache[ZPATH].exports = wrapped;
  return calls;
}
function restore() {
  delete require.cache[ZPATH];
  delete require.cache[GPATH];
  delete require.cache[DPATH];
  for (const p of ['worker', 'google-ops', 'zoho-ops', 'manual-review', 'operator-actions', 'reservation-ops']) {
    delete require.cache[require.resolve(`../../workflows/${p}.js`)];
  }
}
function loadWorker() {
  for (const p of ['worker', 'google-ops', 'zoho-ops', 'manual-review', 'operator-actions', 'reservation-ops']) {
    delete require.cache[require.resolve(`../../workflows/${p}.js`)];
  }
  return require('../../workflows/worker');
}
function loadDispatch() { delete require.cache[DPATH]; return require(DPATH); }

let seq = 0;
async function seed(overrides = {}) {
  const id = track(crypto.randomUUID());
  seq += 1;
  const local = `disp.${process.pid}.${seq}`;
  await db.withTransaction(async (tx) => {
    const cols = Object.keys(overrides);
    const extra = cols.length ? ', ' + cols.join(', ') : '';
    const ph = cols.map((_, i) => `, $${i + 3}`).join('');
    await tx.query(
      `INSERT INTO booking_journeys
         (journey_id, email, email_normalized, first_name, last_name, company, form_step${extra})
       VALUES ($1, $2, $2, 'Ada', 'L', 'Acme', 2${ph})`,
      [id, `${local}@example.test`, ...cols.map((c) => overrides[c])]);
  });
  return id;
}

/** A waitUntil that records, so a test can await the background work deterministically. */
function recorder() {
  const promises = [];
  return { waitUntil: (p) => { promises.push(p); }, settle: () => Promise.all(promises), promises };
}

test.afterEach(() => { restore(); delete process.env.BOOKING_DISPATCH_ENABLED; });
test.after(async () => { if (!skip) { await purgeTracked(); await db.close(); } });

// ==========================================================================
// Ordering — the transaction commits before anything is published
// ==========================================================================

test('1a the op row is already COMMITTED and visible when publication happens', { skip }, async () => {
  const id = await seed();
  const runnable = new Set();
  let visibleFromAnotherConnection = null;

  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'),
    { collectRunnable: runnable });

  // `collectRunnable` is populated only after COMMIT returned, so by the time we can read
  // it the row must be visible to a SEPARATE connection — which is what "committed" means.
  const res = await db.query(
    'SELECT state, next_retry_at FROM booking_journey_ops WHERE journey_id = $1 AND op = $2',
    [id, 'zoho_identity_resolve']);
  visibleFromAnotherConnection = res.rows[0];

  assert.deepEqual([...runnable], [id], 'the journey was marked runnable');
  assert.ok(visibleFromAnotherConnection, 'the op row is visible outside the transaction');
  assert.equal(visibleFromAnotherConnection.state, 'pending');
});

test('1a(ii) a ROLLBACK publishes nothing', { skip }, async () => {
  const id = await seed();
  const runnable = new Set();
  await assert.rejects(db.withTransaction(async (tx) => {
    await O.ensureOp(tx, id, 'zoho_identity_resolve');
    throw Object.assign(new Error('deliberate'), { code: 'deliberate_abort' });
  }, { collectRunnable: runnable }));

  assert.equal(runnable.size, 0, 'nothing collected from a rolled-back transaction');
  const res = await db.query(
    'SELECT 1 FROM booking_journey_ops WHERE journey_id = $1 AND op = $2', [id, 'zoho_identity_resolve']);
  assert.equal(res.rowCount, 0, 'and the op does not exist');
});

test('1a(iii) an op armed with a DELAY is not published — a wake would find nothing', { skip }, async () => {
  const id = await seed();
  const runnable = new Set();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_meeting_create', { delaySeconds: 120 }),
    { collectRunnable: runnable });
  assert.equal(runnable.size, 0, 'not runnable now, so not marked');
});

// ==========================================================================
// No authority — a lost dispatch costs latency only
// ==========================================================================

test('3 a failed/absent dispatch leaves the operation untouched and immediately claimable', { skip }, async () => {
  process.env.BOOKING_DISPATCH_ENABLED = 'true';
  const id = await seed();
  const dispatch = loadDispatch();
  const runnable = new Set();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'),
    { collectRunnable: runnable });

  // waitUntil throws: registration fails outright, and — critically — no drain may start.
  assert.doesNotThrow(() => dispatch.publish(runnable, {
    reason: 'test', waitUntil: () => { throw new Error('no context'); },
  }));
  // Give every microtask and timer turn a chance to run a would-be detached drain.
  await new Promise((r) => setTimeout(r, 50));

  const op = await db.withTransaction((tx) => O.getOp(tx, id, 'zoho_identity_resolve'));
  assert.equal(op.state, 'pending');
  assert.equal(op.first_attempted_at, null, 'never marked attempted');
  assert.equal(op.run_count, 0, 'never counted as a run');
  assert.equal(op.lease_expires_at, null, 'no lease was taken');
  assert.equal(op.crash_reclaim_count, 0, 'not counted as a crash');
  assert.equal(op.create_attempts, 0);
  assert.ok(new Date(op.next_retry_at) <= new Date(), 'due immediately for the recovery sweep');
});

// ==========================================================================
// The drain
// ==========================================================================

test('5+6 one dispatch drains the whole runnable chain with no cron involvement', { skip }, async () => {
  process.env.BOOKING_DISPATCH_ENABLED = 'true';
  const zoho = stubZoho();
  const id = await seed();
  const worker = loadWorker();

  const runnable = new Set();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'),
    { collectRunnable: runnable });

  const r = await worker.runJourneyUntilBlocked(id);

  assert.ok(r.ran >= 3, `expected the chain to advance several hops, ran=${r.ran}`);
  assert.equal(r.stoppedBecause, 'no_due_work', 'stopped because it is genuinely waiting');
  assert.equal(r.continuationRequired, false, 'nothing runnable was left behind');
  assert.equal(r.hasDueNow, false);
  assert.ok(zoho.some((c) => c.name === 'searchContactsByEmail'), 'Zoho identity resolve ran');

  const ops = await db.withTransaction((tx) => O.listOps(tx, id));
  const byOp = Object.fromEntries(ops.map((o) => [o.op, o]));
  assert.equal(byOp.zoho_identity_resolve.state, 'done');
  assert.ok(byOp.zoho_record_write, 'the chain armed the next op');
  assert.ok(r.nextDueAt, 'a future due time is reported for the waiting op');
});

test('7 a future next_retry_at is respected: no claim, no lease, no Zoho call', { skip }, async () => {
  const zoho = stubZoho();
  const id = await seed();
  const worker = loadWorker();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'));
  await db.query(
    `UPDATE booking_journey_ops SET next_retry_at = now() + interval '5 minutes'
      WHERE journey_id = $1`, [id]);

  const r = await worker.runJourneyUntilBlocked(id);

  assert.equal(r.ran, 0);
  assert.equal(r.stoppedBecause, 'no_due_work');
  assert.equal(r.continuationRequired, false);
  assert.equal(zoho.filter((c) => !c.unexpected).length, 0, 'no external call at all');
  const op = await db.withTransaction((tx) => O.getOp(tx, id, 'zoho_identity_resolve'));
  assert.equal(op.lease_expires_at, null, 'not claimed, so no lease');
  assert.equal(op.run_count, 0);
});

test('22 the drain never sleeps — it returns promptly when the wait is in the future', { skip }, async () => {
  stubZoho();
  const id = await seed();
  const worker = loadWorker();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'));
  await db.query(
    `UPDATE booking_journey_ops SET next_retry_at = now() + interval '30 minutes'
      WHERE journey_id = $1`, [id]);

  const t0 = Date.now();
  const r = await worker.runJourneyUntilBlocked(id);
  const elapsed = Date.now() - t0;

  assert.equal(r.ran, 0);
  assert.ok(elapsed < 3_000, `returned in ${elapsed}ms rather than waiting for next_retry_at`);
  assert.ok(new Date(r.nextDueAt) > new Date(), 'and reports when it would next be due');
});

test('the drain is journey-scoped: it never operates on another journey', { skip }, async () => {
  // Asserted from what THIS drain did, not from the other journey's final row state. The
  // op queue is global and `node --test` runs files in parallel, so another file's
  // `runPass` may legitimately claim the second journey while this test runs — a global
  // negative would be testing the scheduler's isolation from other processes, not this
  // function's scope.
  stubZoho();
  const mine = await seed();
  const theirs = await seed();
  const worker = loadWorker();
  await db.withTransaction((tx) => O.ensureOp(tx, mine, 'zoho_identity_resolve'));
  await db.withTransaction((tx) => O.ensureOp(tx, theirs, 'zoho_identity_resolve'));

  const seen = [];
  const realWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...rest) => {
    const s = String(chunk);
    if (s.includes('worker.op.')) { try { seen.push(JSON.parse(s)); } catch (_) { /* not ours */ } }
    return realWrite(chunk, ...rest);
  };
  let r;
  try {
    r = await worker.runJourneyUntilBlocked(mine);
  } finally {
    process.stdout.write = realWrite;
  }

  assert.ok(r.ran >= 1, 'it did do work on the target journey');
  assert.ok(seen.length >= 1, 'and logged it');
  for (const line of seen) {
    assert.equal(line.journeyId, mine,
      `the drain operated on ${line.journeyId}, which is not the journey it was given`);
  }
  assert.equal(seen.some((l) => l.journeyId === theirs), false,
    'the other journey was never operated on by this drain');
});

test('19+§5.5 max_ops stops the drain and reports that a continuation is required', { skip }, async () => {
  stubZoho();
  const id = await seed();
  const worker = loadWorker();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'));

  const r = await worker.runJourneyUntilBlocked(id, { maxOps: 1 });

  assert.equal(r.ran, 1, 'exactly one operation ran');
  assert.equal(r.stoppedBecause, 'max_ops');
  assert.equal(r.hasDueNow, true, 'the chain armed more runnable work');
  assert.equal(r.continuationRequired, true,
    'so the caller knows acknowledging here would strand runnable work');
  assert.equal(r.journeyComplete, false);
});

test('§5.5 a completed journey reports complete and requires no continuation', { skip }, async () => {
  stubZoho();
  const id = await seed();
  const worker = loadWorker();
  // No ops at all: nothing outstanding.
  const r = await worker.runJourneyUntilBlocked(id);
  assert.equal(r.ran, 0);
  assert.equal(r.journeyComplete, true);
  assert.equal(r.hasDueNow, false);
  assert.equal(r.continuationRequired, false);
  assert.equal(r.nextDueAt, null);
});

test('§5.5 a fully parked journey publishes nothing and is not "complete"', { skip }, async () => {
  stubZoho();
  const id = await seed();
  const worker = loadWorker();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'));
  await db.withTransaction((tx) => O.parkOp(tx, id, 'zoho_identity_resolve', 'test_park'));

  const r = await worker.runJourneyUntilBlocked(id);
  assert.equal(r.ran, 0);
  assert.equal(r.hasDueNow, false, 'parked rows are not due');
  assert.equal(r.nextDueAt, null, 'and have no future due time to schedule');
  assert.equal(r.continuationRequired, false);
});

// ==========================================================================
// Concurrency and worker-context suppression
// ==========================================================================

test('9 a journey drain and a global pass cannot both run the same operation', { skip }, async () => {
  stubZoho();
  const id = await seed();
  const worker = loadWorker();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'));

  await Promise.all([
    worker.runJourneyUntilBlocked(id, { maxOps: 1 }),
    worker.runPass({ limit: 1 }),
  ]);

  const op = await db.withTransaction((tx) => O.getOp(tx, id, 'zoho_identity_resolve'));
  assert.equal(Number(op.run_count), 1, 'claimed exactly once despite two concurrent consumers');
});

test('18 no worker context publishes: neither drain nor pass opts into collection', { skip }, async () => {
  // Structural assertion. If a worker path ever passed `collectRunnable`, the ops it arms
  // mid-drain would fan out wakes for work its own loop is about to do anyway.
  const src = require('fs').readFileSync(require.resolve('../../workflows/worker.js'), 'utf8');
  assert.equal(/collectRunnable/.test(src), false,
    'worker.js must never opt into runnable collection');
  const runSrc = require('fs').readFileSync(
    require.resolve('../../api/v1/internal/jobs/run.js'), 'utf8');
  assert.equal(/collectRunnable|dispatch/.test(runSrc), false,
    'the cron entry point must not publish either');
});

test('20 every op outcome is attributed via `via`, and dispatch differs from cron', { skip }, async () => {
  stubZoho();
  const id = await seed();
  const worker = loadWorker();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'));

  const lines = [];
  const realWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...rest) => {
    const s = String(chunk);
    if (s.includes('worker.op.')) { try { lines.push(JSON.parse(s)); } catch (_) { /* not ours */ } }
    return realWrite(chunk, ...rest);
  };
  try {
    await worker.runJourneyUntilBlocked(id, { maxOps: 1 });
  } finally {
    process.stdout.write = realWrite;
  }

  assert.ok(lines.length >= 1, 'an op outcome was logged');
  assert.equal(lines[0].via, 'dispatch', 'attributed to dispatch, not cron');
  for (const l of lines) {
    assert.ok(l.journeyId, 'carries the journey id');
    for (const k of Object.keys(l)) {
      assert.equal(/email|phone|company|first_name|last_name/.test(k), false,
        `log field ${k} must not be PII`);
    }
  }
});

test('23 withTransaction stays pure: no collector means nothing is observable', { skip }, async () => {
  const id = await seed();
  // The common case across the CLI scripts and the whole test suite: no options at all.
  const r = await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'));
  assert.equal(r.armed, true, 'the transaction still works normally');
  // And a tx without markRunnable (as `withSession` and hand-built test transactions give)
  // must not throw when an arming primitive tries to mark.
  await assert.doesNotReject(db.withTransaction(async (tx) => {
    const bare = { query: tx.query };            // deliberately no markRunnable
    await O.ensureOp(bare, id, 'zoho_record_write');
  }));
});
