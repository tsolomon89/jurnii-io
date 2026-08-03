'use strict';

/**
 * Worker and operator-endpoint contracts, against real Postgres with both external
 * transports stubbed.
 *
 * Plan coverage: #45, #46, #50, #59, #82, #83, #86, #91, #92, #96, #98, #99, #100,
 * #103, #107, #113, #122, #124, #127, plus the at-most-once send and the create latches.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const crypto = require('crypto');

const db = require('../../db');
const J = require('../../db/queries/journeys');
const R = require('../../db/queries/reservations');
const O = require('../../db/queries/ops');
const RV = require('../../db/queries/review');
const B = require('../../db/queries/bindings');
const RES = require('../../db/queries/resolutions');
const { track, purgeTracked } = require('./_fixtures');

const skip = db.isConfigured() ? false : 'DATABASE_URL not set';

process.env.JWT_SECRET ||= 'worker-test-secret';
process.env.CRON_SECRET ||= 'cron-test-secret';
process.env.BOOKING_ADMIN_SECRET ||= 'admin-test-secret';
process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_ID ||= 'test-v1';
process.env.RESOLUTION_FINGERPRINT_HMAC_KEY ||= 'worker-test-fingerprint-key';
process.env.BOOKING_CALENDAR_HMAC_KEY ||= 'worker-test-hmac';
process.env.GOOGLE_CALENDAR_ID ||= 'demos-local@jurnii.io';

const GPATH = require.resolve('../../integrations/google/index.js');
const ZPATH = require.resolve('../../integrations/zoho/index.js');
const CAL = 'demos-local@jurnii.io';

function stub(modPath, overrides) {
  const real = require(modPath);
  const calls = [];
  const wrapped = { ...real };
  for (const [name, impl] of Object.entries(overrides)) {
    wrapped[name] = (...args) => { calls.push({ name, args }); return impl(...args); };
  }
  // Any un-overridden function that gets called is recorded and throws, so an
  // unexpected external call fails loudly rather than hitting the network.
  for (const name of Object.keys(real)) {
    if (typeof real[name] !== 'function' || overrides[name]) continue;
    if (['ZohoError', 'writePayload', 'buildMeetingPayload', 'buildManualReviewTask',
      'formatZohoDateTime', 'readConversion', 'accountIdOfContact', 'taskIsClosed',
      'duplicateRecordId', 'firstWriteResult', 'manualReviewSubject', 'isDefiniteReject',
      'retryAfterSeconds', 'extractMeetLink', 'deterministicEventId', 'requireCalendarId',
      'classify', 'sha256hex', 'resolveProductDeal'].includes(name)) continue;
    wrapped[name] = (...args) => {
      calls.push({ name, args, unexpected: true });
      throw new Error(`unexpected external call: ${name}`);
    };
  }
  require.cache[modPath].exports = wrapped;
  return calls;
}

const stubGoogle = (o = {}) => stub(GPATH, o);
const stubZoho = (o = {}) => stub(ZPATH, o);

function restore() { delete require.cache[GPATH]; delete require.cache[ZPATH]; }

/** Load the worker fresh so it picks up the current stubs. */
function loadWorker() {
  for (const p of ['worker', 'google-ops', 'zoho-ops', 'manual-review', 'operator-actions', 'reservation-ops']) {
    delete require.cache[require.resolve(`../../workflows/${p}.js`)];
  }
  return require('../../workflows/worker');
}
function loadOperatorEndpoint() {
  for (const p of ['operator-actions']) delete require.cache[require.resolve(`../../workflows/${p}.js`)];
  const p = require.resolve('../../api/v1/internal/journeys/[id]/resolve.js');
  delete require.cache[p];
  return require(p);
}

function mockRes() {
  return {
    statusCode: null, body: null, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
}

let seq = 0;
function nextId() { seq += 1; return `cafe0005-0000-4000-8000-${String(seq).padStart(12, '0')}`; }
function slotFor(i) {
  const d = new Date(Date.now() + (30 + Math.floor(i / 8) * 7) * 86400000);
  d.setUTCHours(9 + (i % 8), 0, 0, 0);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

async function seed(overrides = {}) {
  const id = track(nextId());
  await db.withTransaction(async (tx) => {
    await tx.query('DELETE FROM booking_journeys WHERE journey_id = $1', [id]);
    const cols = Object.keys(overrides);
    const extra = cols.length ? ', ' + cols.join(', ') : '';
    // Base VALUES uses $1 (id), $2 (email) and $3 (calendar), so overrides start at $4.
    const ph = cols.map((_, i) => `, $${i + 4}`).join('');
    await tx.query(
      `INSERT INTO booking_journeys
         (journey_id, email, email_normalized, first_name, last_name, company,
          host_calendar_key, google_calendar_id, form_step${extra})
       VALUES ($1, $2, $2, 'Ada', 'L', 'Acme', 'jurnii_local', $3, 2${ph})`,
      [id, `${id}@example.test`, CAL, ...cols.map((c) => overrides[c])]
    );
  });
  return id;
}

/**
 * Run one specific op through the real worker dispatcher.
 *
 * Deliberately does NOT go through `claimBatch`: the op queue is global, so a helper
 * that parked or claimed other journeys' rows would bump their leases and inflate their
 * crash counters, making tests pass alone and fail together. The claim protocol itself
 * is covered by the dedicated tests below; this exercises the handler plus
 * outcome recording, which is what the per-op tests are about.
 */
async function mirrorClaim(journeyId, op) {
  return db.withTransaction(async (tx) => {
    // Mirror what CLAIM_SQL commits: a lease, a pre-committed backoff, and the crash
    // arithmetic — an expired lease with no recorded outcome counts as a crash.
    const res = await tx.query(
      `UPDATE booking_journey_ops SET
         run_count = run_count + 1, outcome_recorded = false,
         crash_reclaim_count = crash_reclaim_count
           + CASE WHEN lease_expires_at IS NOT NULL AND lease_expires_at < now()
                       AND outcome_recorded = false THEN 1 ELSE 0 END,
         first_attempted_at = COALESCE(first_attempted_at, now()),
         lease_expires_at = now() + interval '5 minutes',
         next_retry_at = now() + ladder_delay(op, state, failure_count,
                                              now() - COALESCE(first_attempted_at, now())),
         updated_at = now()
       WHERE journey_id = $1 AND op = $2
       RETURNING journey_id, op, state, failure_count, crash_reclaim_count, max_crash_reclaims,
                 max_failures, create_attempts, unknown_since, deadline_at,
                 watch_until_at, watch_started_at, cycle_version`,
      [journeyId, op]);
    return res.rows[0];
  });
}

async function runOp(journeyId, op) {
  const worker = loadWorker();
  const claim = await mirrorClaim(journeyId, op);
  if (!claim) return { outcome: 'not_claimed' };
  return worker.runOne(claim);
}

/** Would the real claim predicate select this row right now? Journey-scoped, side-effect free. */
async function isClaimable(journeyId, op) {
  const res = await db.query(
    `SELECT 1 FROM booking_journey_ops
      WHERE journey_id = $1 AND op = $2
        AND next_retry_at <= now()
        AND (lease_expires_at IS NULL OR lease_expires_at < now())`,
    [journeyId, op]);
  return res.rowCount === 1;
}

test.afterEach(() => restore());
// The op queue is global, so a leftover journey is a due row that later runs will claim
// and abandon. See `_fixtures.js`.
test.after(async () => { if (!skip) { await purgeTracked(); await db.close(); } });

// ==========================================================================
// Claim protocol
// ==========================================================================

test('0a a claim that is never executed blocks its row for the LEASE, and is counted as a crash', { skip }, async () => {
  // The mechanism that made over-claiming harmful. `CLAIM_SQL` commits a 5-minute lease
  // and `outcome_recorded = false`; the claim predicate requires an EXPIRED lease. So a
  // claimed-but-unexecuted row waits for the lease, NOT for its ladder delay — and when
  // the lease expires the crash arithmetic counts it, because no outcome was recorded.
  // Three of those and the ceiling terminates an op that never ran. This test pins the
  // semantics; 0b pins that `runPass` can no longer create the situation.
  const id = await seed();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'));
  assert.equal(await isClaimable(id, 'zoho_identity_resolve'), true, 'armed due-now');

  // Claim it and do NOT run it — exactly what a batch claim did to its unstarted tail.
  const claim = await mirrorClaim(id, 'zoho_identity_resolve');
  assert.ok(claim, 'claimed');

  const leased = await db.withTransaction((tx) => O.getOp(tx, id, 'zoho_identity_resolve'));
  assert.equal(leased.outcome_recorded, false, 'no outcome was recorded');
  assert.ok(new Date(leased.lease_expires_at) > new Date(), 'the lease is LIVE');
  // The ladder rung for this op is 1 minute, but the lease is 5 — the lease is what binds.
  assert.ok(new Date(leased.lease_expires_at) > new Date(leased.next_retry_at),
    'the lease outlasts the pre-committed backoff, so the lease is the real block');
  assert.equal(await isClaimable(id, 'zoho_identity_resolve'), false,
    'unclaimable while the lease is live, even once next_retry_at has passed');

  // Let only the lease expire, then reclaim: the crash counter moves for work that never ran.
  await db.query(
    `UPDATE booking_journey_ops
        SET lease_expires_at = now() - interval '1 second',
            next_retry_at = now() - interval '1 second'
      WHERE journey_id = $1 AND op = 'zoho_identity_resolve'`, [id]);
  assert.equal(await isClaimable(id, 'zoho_identity_resolve'), true);

  await mirrorClaim(id, 'zoho_identity_resolve');
  const reclaimed = await db.withTransaction((tx) => O.getOp(tx, id, 'zoho_identity_resolve'));
  assert.equal(reclaimed.crash_reclaim_count, 1,
    'an operation that never entered a handler is counted as a crash');
});

test('0b runPass never leaves a row leased-but-unstarted, and budget exhaustion claims nothing', { skip }, async () => {
  stubGoogle(); stubZoho();
  const worker = loadWorker();
  const id = await seed();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'));

  // Reserve larger than the budget: the pass must stop BEFORE claiming anything.
  const pass = await worker.runPass({ timeBudgetMs: 1_000, opReserveMs: 60_000 });
  assert.equal(pass.claimed, 0, 'no claim is taken when there is no budget to run it');
  assert.equal(pass.ran, 0);

  // Any un-stubbed external call throws, so this also proves no handler ran.
  const op = await db.withTransaction((tx) => O.getOp(tx, id, 'zoho_identity_resolve'));
  assert.equal(op.outcome_recorded, true, 'never claimed, so its outcome flag is untouched');
  assert.equal(op.lease_expires_at, null, 'NO lease was taken');
  assert.equal(op.crash_reclaim_count, 0, 'budget exhaustion does not inflate the crash counter');
  assert.equal(op.run_count, 0, 'and it was never counted as a run');
  assert.equal(await isClaimable(id, 'zoho_identity_resolve'), true,
    'still due immediately — not parked behind a five-minute lease');
});

test('0c a claim is never wasted: claimed === ran + ceilingTerminated', { skip }, async () => {
  // The no-over-claim identity, and the reason throughput does not regress: every claim
  // the pass takes is either executed or deliberately terminated by the ceiling.
  stubGoogle(); stubZoho({
    searchContactsByEmail: async () => [],
    searchUnconvertedLeadsByEmail: async () => [],
  });
  const worker = loadWorker();
  const id = await seed();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'));

  const pass = await worker.runPass({ limit: 3 });
  assert.equal(pass.claimed, pass.ran + pass.ceilingTerminated,
    'no claim is taken without being started or terminated');
  assert.ok(pass.claimed <= 3, 'bounded by the operation limit');

  // The op queue is global, so other rows may also have been claimed. Ours specifically
  // must have reached a recorded outcome rather than sitting under a live lease.
  const op = await db.withTransaction((tx) => O.getOp(tx, id, 'zoho_identity_resolve'));
  assert.equal(op.outcome_recorded, true, 'our op ran and recorded an outcome');
});

test('#50 the crash ceiling TERMINATES inside the claim transaction, before any handler runs', { skip }, async () => {
  const id = await seed();
  // Any unexpected external call throws, so this also proves no handler ran.
  stubGoogle(); stubZoho();
  const worker = loadWorker();

  await db.withTransaction(async (tx) => {
    await O.ensureOp(tx, id, 'zoho_record_write');
    await O.incrementCreateAttempts(tx, id, 'zoho_record_write');
    await tx.query(
      `UPDATE booking_journey_ops
          SET crash_reclaim_count = max_crash_reclaims, outcome_recorded = false,
              lease_expires_at = now() - interval '1 minute',
              next_retry_at = now() - interval '1 second'
        WHERE journey_id = $1 AND op = 'zoho_record_write'`, [id]);
  });

  // A large limit: op_priority orders the batch, and zoho_manual_review is the LOWEST
  // priority (60), so a small batch would be starved by other tests' due rows.
  const claimed = await worker.claimBatch(500);
  assert.equal(claimed.find((c) => c.journey_id === id), undefined,
    'the over-ceiling row is EXCLUDED from the batch');

  const { op, reasons } = await db.withTransaction(async (tx) => ({
    op: await O.getOp(tx, id, 'zoho_record_write'),
    reasons: await RV.openReasonKeys(tx, id),
  }));
  assert.equal(op.state, 'terminal', 'terminal, NOT parked — parked would be revivable');
  assert.equal(op.next_retry_at, null);
  assert.equal(op.create_attempts, 1, 'the create latch is preserved as an audit trail');
  assert.ok(reasons.some((r) => r.startsWith('worker_crash_loop')));

  // And ensureOp cannot bring it back.
  const revive = await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_record_write'));
  assert.equal(revive.armed, false);
});

test('#92 a crash-looped zoho_manual_review does not re-arm itself', { skip }, async () => {
  const id = await seed();
  stubGoogle(); stubZoho();
  const worker = loadWorker();
  await db.withTransaction(async (tx) => {
    await RV.addReviewReason(tx, id, 'identity_ambiguous');
    await tx.query(
      `UPDATE booking_journey_ops
          SET crash_reclaim_count = max_crash_reclaims, outcome_recorded = false,
              lease_expires_at = now() - interval '1 minute',
              next_retry_at = now() - interval '1 second'
        WHERE journey_id = $1 AND op = 'zoho_manual_review'`, [id]);
  });
  await worker.claimBatch(500);   // lowest priority: never starve it behind other rows
  const op = await db.withTransaction((tx) => O.getOp(tx, id, 'zoho_manual_review'));
  assert.equal(op.state, 'terminal');
  assert.equal(op.next_retry_at, null, 'not re-armed: it would be asked to report its own crash loop');
});

test('#46 retry scheduling is pre-committed at claim time, and every outcome resets the crash counter', { skip }, async () => {
  const id = await seed();
  stubGoogle(); stubZoho({
    searchContactsByEmail: async () => { throw new (require(ZPATH).ZohoError)('zoho_http_503'); },
  });
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'));

  const before = await db.withTransaction((tx) => O.getOp(tx, id, 'zoho_identity_resolve'));
  const result = await runOp(id, 'zoho_identity_resolve');
  assert.equal(result.outcome, 'retryable_failure');

  const after = await db.withTransaction((tx) => O.getOp(tx, id, 'zoho_identity_resolve'));
  assert.ok(after.next_retry_at, 'a backoff is scheduled even though the handler failed');
  assert.ok(new Date(after.next_retry_at) > new Date(before.next_retry_at || 0));
  assert.equal(after.failure_count, 1);
  assert.equal(after.crash_reclaim_count, 0, 'a handled outcome resets the crash counter');
  assert.equal(after.outcome_recorded, true, 'the lease is released');
});

// ==========================================================================
// Google recovery
// ==========================================================================

async function armedJourney(i) {
  const id = await seed();
  const slot = slotFor(i);
  await db.withTransaction((tx) => tx.query(
    `INSERT INTO booking_calendars (host_calendar_key, canonical_fingerprint)
     VALUES ('jurnii_local', $1) ON CONFLICT DO NOTHING`,
    [require('../../lib/fingerprint').calendarFingerprint(CAL)]));
  await db.withTransaction((tx) => J.R2_armCreate(tx, id, {
    hostCalendarKey: 'jurnii_local', googleCalendarId: CAL,
    slotStartUtc: slot.toISOString(),
    candidateIdFor: (a) => require('../../integrations/google')
      .deterministicEventId({ calendarKey: 'jurnii_local', journeyId: id, attempt: a }),
    uncertaintyMinutes: 30,
  }));
  return { id, slot };
}

test('#98 exhausting max_failures before the deadline does NOT trigger T1 early', { skip }, async () => {
  const { id } = await armedJourney(1);
  stubZoho();
  stubGoogle({ readEvent: async () => ({ kind: 'unreadable', error: { status: 503, transient: true } }) });

  await db.withTransaction((tx) => tx.query(
    `UPDATE booking_journey_ops SET failure_count = max_failures - 1,
       deadline_at = now() + interval '1 hour'
      WHERE journey_id = $1 AND op = 'google_create_recovery'`, [id]));

  const r = await runOp(id, 'google_create_recovery');
  assert.equal(r.outcome, 'retryable_failure');

  const { row, op, holds } = await db.withTransaction(async (tx) => ({
    row: await J.get(tx, id), op: await O.getOp(tx, id, 'google_create_recovery'),
    holds: await R.liveHolds(tx, id),
  }));
  assert.equal(row.booking_status, 'reserved', 'not needs_attention');
  assert.equal(row.google_outcome_state, 'creating');
  assert.notEqual(op.state, 'terminal', 'the budget decides cadence, the deadline decides outcomes');
  assert.equal(holds.length, 1, 'hold retained');
});

test('#82 T1 fires at the deadline when absence is unprovable, and never booking_failed', { skip }, async () => {
  const { id } = await armedJourney(2);
  stubZoho();
  stubGoogle({ readEvent: async () => ({ kind: 'unreadable', error: { status: 503, transient: true } }) });
  await db.withTransaction((tx) => tx.query(
    `UPDATE booking_journey_ops SET deadline_at = now() - interval '1 minute'
      WHERE journey_id = $1 AND op = 'google_create_recovery'`, [id]));

  await runOp(id, 'google_create_recovery');

  const { row, op, holds, reasons } = await db.withTransaction(async (tx) => ({
    row: await J.get(tx, id), op: await O.getOp(tx, id, 'google_create_recovery'),
    holds: await R.liveHolds(tx, id), reasons: await RV.openReasonKeys(tx, id),
  }));
  assert.equal(row.google_outcome_state, 'unresolved');
  assert.equal(row.booking_status, 'needs_attention');
  assert.notEqual(row.booking_status, 'booking_failed');
  assert.equal(op.state, 'terminal');
  assert.equal(op.next_retry_at, null);
  assert.equal(holds.length, 1, 'the hold is RETAINED — absence was never proven');
  assert.ok(reasons.some((r) => r.startsWith('google_calendar_unreadable')));
});

test('#66/#74 an unqualified 404 never commits G3, even at the deadline', { skip }, async () => {
  for (const role of ['reader', 'freeBusyReader', 'writerWithoutPrivateAccess', 'none', undefined]) {
    const { id } = await armedJourney(10 + seq);
    stubZoho();
    stubGoogle({
      readEvent: async () => ({ kind: 'not_found' }),
      qualifyNotFound: async () => ({ verdict: 'unknown', probe: { confirmed: false, role } }),
    });
    await db.withTransaction((tx) => tx.query(
      `UPDATE booking_journey_ops SET deadline_at = now() - interval '1 minute'
        WHERE journey_id = $1 AND op = 'google_create_recovery'`, [id]));

    const r = await runOp(id, 'google_create_recovery');
    assert.equal(r.outcome, 'retryable_failure', `role=${role}`);
    const { row, holds } = await db.withTransaction(async (tx) => ({
      row: await J.get(tx, id), holds: await R.liveHolds(tx, id),
    }));
    assert.notEqual(row.booking_status, 'booking_failed', `role=${role} must not fail the booking`);
    assert.equal(row.google_outcome_state, 'creating');
    assert.equal(holds.length, 1, 'hold retained');
    restore();
  }
});

test('a 404 WITH confirmed access commits G3 only at or after the deadline', { skip }, async () => {
  const { id } = await armedJourney(3);
  stubZoho();
  stubGoogle({
    readEvent: async () => ({ kind: 'not_found' }),
    qualifyNotFound: async () => ({ verdict: 'absent', probe: { confirmed: true, role: 'writer' } }),
  });

  // Before the deadline: no_progress, hold retained. The insert may still be in flight.
  await db.withTransaction((tx) => tx.query(
    `UPDATE booking_journey_ops SET deadline_at = now() + interval '1 hour'
      WHERE journey_id = $1 AND op = 'google_create_recovery'`, [id]));
  let r = await runOp(id, 'google_create_recovery');
  assert.equal(r.outcome, 'no_progress');
  let row = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(row.booking_status, 'reserved');

  // At the deadline: G3.
  await db.withTransaction((tx) => tx.query(
    `UPDATE booking_journey_ops SET deadline_at = now() - interval '1 minute'
      WHERE journey_id = $1 AND op = 'google_create_recovery'`, [id]));
  r = await runOp(id, 'google_create_recovery');
  row = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(row.booking_status, 'booking_failed');
  assert.equal(row.google_outcome_state, 'not_created');
  const holds = await db.withTransaction((tx) => R.liveHolds(tx, id));
  assert.equal(holds.length, 0, 'proven absent, so the slot is released');
});

test('recovery adopts a present, owned event via G1 and never issues an insert', { skip }, async () => {
  const { id, slot } = await armedJourney(4);
  stubZoho();
  const j = await db.withTransaction((tx) => J.get(tx, id));
  const calls = stubGoogle({
    readEvent: async () => ({
      kind: 'present',
      event: {
        id: j.google_event_candidate_id, status: 'confirmed', hangoutLink: 'https://meet/r',
        start: { dateTime: slot.toISOString() },
        end: { dateTime: new Date(slot.getTime() + 1800000).toISOString() },
        extendedProperties: { private: { journeyId: id, attempt: '1' } },
      },
    }),
  });

  await runOp(id, 'google_create_recovery');
  assert.equal(calls.filter((c) => c.name === 'insertEvent').length, 0, 'recovery is READ-ONLY');

  const { row, ops } = await db.withTransaction(async (tx) => ({
    row: await J.get(tx, id), ops: await O.listOps(tx, id),
  }));
  assert.equal(row.booking_status, 'confirmed');
  assert.equal(row.google_meet_url, 'https://meet/r');
  assert.ok(ops.find((o) => o.op === 'zoho_meeting_create'));
});

// ==========================================================================
// Zoho: latches and at-most-once
// ==========================================================================

test('an existing Contact never causes a Lead create, and Leads are not even searched', { skip }, async () => {
  const id = await seed();
  stubGoogle();
  const calls = stubZoho({
    searchContactsByEmail: async () => ([{ id: '800', Email: `${id}@example.test`, Account_Name: { id: '810' } }]),
  });
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_identity_resolve'));
  await runOp(id, 'zoho_identity_resolve');

  assert.equal(calls.filter((c) => c.name === 'searchUnconvertedLeadsByEmail').length, 0,
    'searching Leads invites the duplicate this rule prevents');
  const row = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(row.zoho_identity_outcome, 'contact_reused');
  assert.equal(row.zoho_contact_id, '800');
});

test('the workflow-enabled Lead update is sent at most once and NEVER resent after an uncertain outcome', { skip }, async () => {
  const id = await seed({ zoho_identity_outcome: 'new_lead_required', zoho_record_id: '55501',
    zoho_status: 'identity_resolved' });
  stubGoogle();
  let sends = 0;
  stubZoho({
    updateLeadWorkflowEnabled: async () => { sends += 1; throw new (require(ZPATH).ZohoError)('zoho_http_503'); },
  });
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_lead_terminal_update'));

  await runOp(id, 'zoho_lead_terminal_update');
  assert.equal(sends, 1);
  let row = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(row.lead_terminal_update_state, 'outcome_unknown');

  // Drive it again by every available means: the latch must refuse.
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_lead_terminal_update'));
  await runOp(id, 'zoho_lead_terminal_update');
  assert.equal(sends, 1, 'a duplicated processLead would run conversion twice');

  const op = await db.withTransaction((tx) => O.getOp(tx, id, 'zoho_lead_terminal_update'));
  assert.equal(op.state, 'outcome_unknown', 'latched; ensureOp cannot revive it');
});

test('#103 T4 then RT4.adopt_identity: Contact verified, Account DERIVED, no resend, no Deal work before the Meeting', { skip }, async () => {
  const id = await seed({
    zoho_record_id: '55501', zoho_identity_outcome: 'new_lead_required',
    lead_terminal_update_state: 'outcome_unknown', zoho_status: 'identity_resolved',
  });
  stubGoogle();
  stubZoho();
  await db.withTransaction(async (tx) => {
    await O.ensureOp(tx, id, 'zoho_lead_terminal_update');
    await O.ensureOp(tx, id, 'zoho_conversion_discover');
    await J.T4_conversionUndiscovered(tx, id);
  });

  const j = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(j.lead_terminal_update_state, 'unresolved');

  // A wrong-email Contact is refused.
  restore();
  stubGoogle();
  stubZoho({ getContact: async () => ({ id: '800', Email: 'someone@else.io', Account_Name: { id: '810' } }) });
  let res = mockRes();
  await loadOperatorEndpoint()(adminReq(id, {
    resolutionId: crypto.randomUUID(), escalation: 't4', action: 'adopt_identity',
    expectedAttemptVersion: j.booking_attempt_version, expectedIntentVersion: j.intent_version,
    expectedReviewVersion: j.manual_review_version, zohoContactId: '800',
  }), res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'contact_email_mismatch');

  // A supplied Account that disagrees with the derived one is refused.
  restore();
  stubGoogle();
  stubZoho({ getContact: async () => ({ id: '800', Email: `${id}@example.test`, Account_Name: { id: '810' } }) });
  res = mockRes();
  await loadOperatorEndpoint()(adminReq(id, {
    resolutionId: crypto.randomUUID(), escalation: 't4', action: 'adopt_identity',
    expectedAttemptVersion: j.booking_attempt_version, expectedIntentVersion: j.intent_version,
    expectedReviewVersion: j.manual_review_version, zohoContactId: '800', zohoAccountId: '999',
  }), res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'account_mismatch');

  // The correct call: Account is derived, not supplied.
  restore();
  stubGoogle();
  stubZoho({ getContact: async () => ({ id: '800', Email: `${id}@example.test`, Account_Name: { id: '810' } }) });
  res = mockRes();
  await loadOperatorEndpoint()(adminReq(id, {
    resolutionId: crypto.randomUUID(), escalation: 't4', action: 'adopt_identity',
    expectedAttemptVersion: j.booking_attempt_version, expectedIntentVersion: j.intent_version,
    expectedReviewVersion: j.manual_review_version, zohoContactId: '800',
  }), res);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));

  const { row, ops } = await db.withTransaction(async (tx) => ({
    row: await J.get(tx, id), ops: await O.listOps(tx, id),
  }));
  assert.equal(row.zoho_contact_id, '800');
  assert.equal(row.zoho_account_id, '810', 'derived from the verified Contact');
  assert.equal(row.lead_terminal_update_state, 'unresolved', 'the latch is UNTOUCHED');
  const latch = ops.find((o) => o.op === 'zoho_lead_terminal_update');
  assert.equal(latch.state, 'terminal');
  // The booking is not confirmed and no Meeting exists, so NEITHER is started.
  assert.equal(ops.find((o) => o.op === 'zoho_deal_reconcile'), undefined,
    'Deal reconciliation must not start before the Meeting exists');
  assert.equal(ops.find((o) => o.op === 'zoho_meeting_create'), undefined,
    'and no Meeting op without a confirmed booking');
});

test('Deal reconciliation waits for BOTH the final Contact and an existing Meeting', { skip }, async () => {
  const id = await seed({ booking_status: 'confirmed', zoho_status: 'meeting_created' });
  stubGoogle();
  stubZoho();
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_deal_reconcile'));

  // No Contact, no Meeting.
  let r = await runOp(id, 'zoho_deal_reconcile');
  assert.equal(r.outcome, 'no_progress');

  // Contact only.
  await db.withTransaction((tx) => J.patchZoho(tx, id, { zoho_contact_id: '800' }));
  r = await runOp(id, 'zoho_deal_reconcile');
  assert.equal(r.outcome, 'no_progress', 'still waiting on the Meeting');

  const row = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(row.zoho_deal_id, null, 'nothing was linked');
});

// ==========================================================================
// Operator endpoint
// ==========================================================================

function adminReq(journeyId, body, secret) {
  return {
    method: 'POST',
    headers: { authorization: `Bearer ${secret || process.env.BOOKING_ADMIN_SECRET}` },
    query: { id: journeyId }, body,
  };
}

test('#107 the operator endpoint rejects CRON_SECRET and the job endpoint rejects BOOKING_ADMIN_SECRET', { skip }, async () => {
  const id = await seed();
  stubGoogle(); stubZoho();

  const res = mockRes();
  await loadOperatorEndpoint()(adminReq(id, {
    resolutionId: crypto.randomUUID(), escalation: 't1', action: 'resume',
    expectedAttemptVersion: 0, expectedIntentVersion: 0, expectedReviewVersion: 0,
  }, process.env.CRON_SECRET), res);
  assert.equal(res.statusCode, 401, 'a scheduler credential cannot change a booking\'s truth');

  const jobPath = require.resolve('../../api/v1/internal/jobs/run.js');
  delete require.cache[jobPath];
  const jobRes = mockRes();
  await require(jobPath)({
    method: 'POST', headers: { authorization: `Bearer ${process.env.BOOKING_ADMIN_SECRET}` }, query: {},
  }, jobRes);
  assert.equal(jobRes.statusCode, 401, 'and the admin credential is rejected in the other direction');

  // No resolution row was reserved by the rejected call.
  const rows = await db.withTransaction((tx) => RES.listForJourney(tx, id));
  assert.equal(rows.length, 0);
});

test('#96 each escalation accepts only its own actions', { skip }, async () => {
  const id = await seed();
  stubGoogle(); stubZoho();
  const handler = loadOperatorEndpoint();
  const res = mockRes();
  await handler(adminReq(id, {
    resolutionId: crypto.randomUUID(), escalation: 't1', action: 'mark_cancelled',   // RG7's
    expectedAttemptVersion: 0, expectedIntentVersion: 0, expectedReviewVersion: 0,
  }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, 'invalid_action');
});

test('#99/#100 RT1.resume restores the COMPLETE active state and preserves the create latch', { skip }, async () => {
  const { id } = await armedJourney(5);
  stubZoho();
  stubGoogle({ readEvent: async () => ({ kind: 'unreadable', error: { status: 503, transient: true } }) });
  await db.withTransaction(async (tx) => {
    await O.incrementCreateAttempts(tx, id, 'google_create_recovery');
    await tx.query(`UPDATE booking_journey_ops SET deadline_at = now() - interval '1 minute'
                     WHERE journey_id = $1 AND op = 'google_create_recovery'`, [id]);
  });
  await runOp(id, 'google_create_recovery');       // -> T1
  restore();

  const before = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(before.booking_status, 'needs_attention');

  stubGoogle(); stubZoho();
  const res = mockRes();
  await loadOperatorEndpoint()(adminReq(id, {
    resolutionId: crypto.randomUUID(), escalation: 't1', action: 'resume',
    expectedAttemptVersion: before.booking_attempt_version,
    expectedIntentVersion: before.intent_version,
    expectedReviewVersion: before.manual_review_version,
    operatorRef: 'runbook',
  }), res);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(res.body.attentionCleared, true);

  const { row, op, holds } = await db.withTransaction(async (tx) => ({
    row: await J.get(tx, id), op: await O.getOp(tx, id, 'google_create_recovery'),
    holds: await R.liveHolds(tx, id),
  }));
  // The COMPLETE active state — not merely a cleared flag.
  assert.equal(row.google_outcome_state, 'unknown');
  assert.equal(row.google_status, 'pending');
  assert.equal(row.booking_status, 'reserved');
  assert.equal(row.needs_attention, false);
  // Same attempt, same candidate, same latch.
  assert.equal(row.booking_attempt_version, before.booking_attempt_version);
  assert.equal(row.google_event_candidate_id, before.google_event_candidate_id);
  assert.equal(op.create_attempts, 1, 'no new insert is authorised');
  assert.equal(op.state, 'pending');
  assert.equal(op.cycle_version, before.booking_attempt_version, 'the SAME cycle');
  assert.equal(holds.length, 1);
});

test('#124 a stale lease owner mutates nothing after a reclaim', { skip }, async () => {
  const { id } = await armedJourney(6);
  stubZoho();
  stubGoogle({ readEvent: async () => ({ kind: 'unreadable', error: { status: 503, transient: true } }) });
  await db.withTransaction((tx) => tx.query(
    `UPDATE booking_journey_ops SET deadline_at = now() - interval '1 minute'
      WHERE journey_id = $1 AND op = 'google_create_recovery'`, [id]));
  await runOp(id, 'google_create_recovery');
  restore();

  const j = await db.withTransaction((tx) => J.get(tx, id));
  const request = {
    resolutionId: crypto.randomUUID(), journeyId: id, escalation: 't1', action: 'resume',
    expectedAttemptVersion: j.booking_attempt_version, expectedIntentVersion: j.intent_version,
    expectedReviewVersion: j.manual_review_version,
  };

  const stale = await db.withTransaction((tx) => RES.reserve(tx, request));
  await db.withTransaction((tx) => tx.query(
    `UPDATE booking_operator_resolutions SET lease_expires_at = now() - interval '1 minute'
      WHERE resolution_id = $1`, [request.resolutionId]));
  const reclaimer = await db.withTransaction((tx) => RES.reserve(tx, request));
  assert.equal(reclaimer.outcome, 'owner');
  assert.notEqual(reclaimer.leaseToken, stale.leaseToken);

  await db.withTransaction((tx) => RES.finaliseFenced(tx, {
    resolutionId: request.resolutionId, leaseToken: reclaimer.leaseToken,
    status: 200, body: { by: 'reclaimer' },
  }));

  await assert.rejects(
    () => db.withTransaction(async (tx) => {
      await RES.finaliseFenced(tx, {
        resolutionId: request.resolutionId, leaseToken: stale.leaseToken,
        status: 200, body: { by: 'stale' } });
      await J.patchGoogle(tx, id, { booking_status: 'confirmed' });
    }),
    (e) => e.code === 'resolution_lease_lost'
  );

  const after = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(after.booking_status, 'needs_attention', 'the stale owner mutated nothing');
  const stored = await db.withTransaction((tx) => RES.readRow(tx, request.resolutionId));
  assert.deepEqual(stored.result_body, { by: 'reclaimer' });
});

test('#122 resolving one escalation leaves an unrelated reason open, through the endpoint', { skip }, async () => {
  const { id } = await armedJourney(7);
  stubZoho();
  stubGoogle({ readEvent: async () => ({ kind: 'unreadable', error: { status: 503, transient: true } }) });
  await db.withTransaction((tx) => tx.query(
    `UPDATE booking_journey_ops SET deadline_at = now() - interval '1 minute'
      WHERE journey_id = $1 AND op = 'google_create_recovery'`, [id]));
  await runOp(id, 'google_create_recovery');                       // T1 -> google_calendar_unreadable
  await db.withTransaction((tx) => RV.addReviewReason(tx, id, 'identity_ambiguous'));
  restore();

  const j = await db.withTransaction((tx) => J.get(tx, id));
  stubGoogle(); stubZoho();
  const res = mockRes();
  await loadOperatorEndpoint()(adminReq(id, {
    resolutionId: crypto.randomUUID(), escalation: 't1', action: 'resume',
    expectedAttemptVersion: j.booking_attempt_version, expectedIntentVersion: j.intent_version,
    expectedReviewVersion: j.manual_review_version,
  }), res);

  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.resolvedReasons, ['google_calendar_unreadable#0']);
  assert.deepEqual(res.body.remainingOpenReasons, ['identity_ambiguous#0']);
  assert.equal(res.body.attentionCleared, false, 'honest: the journey is still in someone\'s queue');

  const row = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(row.needs_attention, true);
});

test('a stale expectedReviewVersion is refused rather than sweeping up a new reason', { skip }, async () => {
  const { id } = await armedJourney(8);
  stubZoho();
  stubGoogle({ readEvent: async () => ({ kind: 'unreadable', error: { status: 503, transient: true } }) });
  await db.withTransaction((tx) => tx.query(
    `UPDATE booking_journey_ops SET deadline_at = now() - interval '1 minute'
      WHERE journey_id = $1 AND op = 'google_create_recovery'`, [id]));
  await runOp(id, 'google_create_recovery');
  restore();

  const j = await db.withTransaction((tx) => J.get(tx, id));
  stubGoogle(); stubZoho();
  const res = mockRes();
  await loadOperatorEndpoint()(adminReq(id, {
    resolutionId: crypto.randomUUID(), escalation: 't1', action: 'resume',
    expectedAttemptVersion: j.booking_attempt_version, expectedIntentVersion: j.intent_version,
    expectedReviewVersion: j.manual_review_version - 1,          // stale
  }), res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'review_version_conflict');

  const row = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(row.booking_status, 'needs_attention', 'nothing applied');
});

test('#127 a gated RG7.mark_cancelled keeps the Task open via crm_cancellation_followup_required', { skip }, async () => {
  const { id, slot } = await armedJourney(9);
  stubZoho();
  // Confirm, then reschedule, then prove the event missing -> G7.
  const j0 = await db.withTransaction((tx) => J.get(tx, id));
  stubGoogle({});
  await db.withTransaction((tx) => J.G1_createConfirmed(tx, id, {
    googleEventId: j0.google_event_candidate_id,
    slotStartUtc: slot.toISOString(),
    slotEndUtc: new Date(slot.getTime() + 1800000).toISOString(),
  }));
  await db.withTransaction((tx) => J.R4_rescheduleIntent(tx, id, {
    hostCalendarKey: 'jurnii_local', slotStartUtc: new Date(slot.getTime() + 3 * 86400000).toISOString() }));
  await db.withTransaction((tx) => J.G7_rescheduleEventMissing(tx, id));
  restore();

  const previous = process.env.BOOKING_CANCELLATION_ENABLED;
  process.env.BOOKING_CANCELLATION_ENABLED = 'false';
  try {
    const j = await db.withTransaction((tx) => J.get(tx, id));
    stubZoho();
    stubGoogle({
      readEvent: async () => ({ kind: 'gone' }),
    });
    const res = mockRes();
    await loadOperatorEndpoint()(adminReq(id, {
      resolutionId: crypto.randomUUID(), escalation: 'g7', action: 'mark_cancelled',
      expectedAttemptVersion: j.booking_attempt_version, expectedIntentVersion: j.intent_version,
      expectedReviewVersion: j.manual_review_version,
    }), res);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));

    const { row, ops, open } = await db.withTransaction(async (tx) => ({
      row: await J.get(tx, id), ops: await O.listOps(tx, id), open: await RV.openReasonKeys(tx, id),
    }));
    assert.equal(row.booking_status, 'cancelled');
    assert.notEqual(row.booking_status, 'booking_failed', 'this booking existed');
    assert.ok(row.cancelled_at);
    assert.equal(row.needs_attention, true, 'the Task must stay open');
    assert.ok(open.some((k) => k.startsWith('crm_cancellation_followup_required')));
    assert.equal(ops.find((o) => o.op === 'zoho_cancel_propagate'), undefined,
      'no propagation while the flag is off');

    // RR1 then closes it, and only it.
    restore(); stubGoogle(); stubZoho();
    const j2 = await db.withTransaction((tx) => J.get(tx, id));
    const rr = mockRes();
    await loadOperatorEndpoint()(adminReq(id, {
      resolutionId: crypto.randomUUID(), escalation: 'rr1', action: 'confirm_followup_done',
      reasonCode: 'crm_cancellation_followup_required',
      expectedAttemptVersion: j2.booking_attempt_version, expectedIntentVersion: j2.intent_version,
      expectedReviewVersion: j2.manual_review_version,
    }), rr);
    assert.equal(rr.statusCode, 200, JSON.stringify(rr.body));
    const after = await db.withTransaction((tx) => J.get(tx, id));
    assert.equal(after.needs_attention, false);

    // A code outside the review-only set is refused.
    restore(); stubGoogle(); stubZoho();
    const bad = mockRes();
    await loadOperatorEndpoint()(adminReq(id, {
      resolutionId: crypto.randomUUID(), escalation: 'rr1', action: 'confirm_followup_done',
      reasonCode: 'identity_ambiguous',
      expectedAttemptVersion: after.booking_attempt_version, expectedIntentVersion: after.intent_version,
      expectedReviewVersion: after.manual_review_version,
    }), bad);
    assert.equal(bad.statusCode, 409);
    assert.ok(['invalid_reason_code', 'not_escalated'].includes(bad.body.code), bad.body.code);
  } finally {
    if (previous === undefined) delete process.env.BOOKING_CANCELLATION_ENABLED;
    else process.env.BOOKING_CANCELLATION_ENABLED = previous;
  }
});

test('no worker or operator module can create a Contact, Account, Deal or Quote', { skip }, () => {
  const fs = require('fs');
  const dir = path.join(__dirname, '..', '..', 'workflows');
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const forbidden of ['createContact', 'createAccount', 'createDeal', 'createQuote',
      'createField', 'createPicklist', 'createWorkflow']) {
      assert.ok(!src.includes(forbidden), `${f} must not reference ${forbidden}`);
    }
  }
});
