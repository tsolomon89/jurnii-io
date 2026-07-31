'use strict';

/**
 * Handler contracts, against real Postgres with only the Google transport stubbed.
 *
 * These REPLACE `bookings.integration.test.js`, `start.integration.test.js` and
 * `submissions.integration.test.js`, whose assertions encoded the superseded
 * synchronous-Zoho architecture (`listEventByJourneyId`, email-based ownership,
 * inline Zoho Event creation, `409 MANUAL_REVIEW`). Every still-valid safety property
 * from those files is re-expressed here against the new contract rather than dropped:
 *
 *   old: "retry reuses the journey-owned event, no re-run FreeBusy"
 *     -> "a repeat POST while recovery is in flight makes no Google call" + the
 *        deterministic-id reuse test
 *   old: "reused event owned by a DIFFERENT email -> correlation_conflict"
 *     -> "ownership is journeyId + attempt, never email"
 *   old: "pending Meet does not confirm"
 *     -> INVERTED deliberately: §10 requires an existing event to confirm with
 *        meetLink null. The old behaviour failed a booking that existed.
 *   old: "Zoho-failure recovers on retry"
 *     -> "the request path makes zero Zoho calls at all"
 *   old: token purpose/ownership enforcement -> retained verbatim in spirit.
 *
 * The handlers are database-first, so a repository double would test almost nothing:
 * these run the real transactions.
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

const skip = db.isConfigured() ? false : 'DATABASE_URL not set';

process.env.JWT_SECRET ||= 'handler-test-secret';
process.env.BOOKING_CALENDAR_KEY ||= 'jurnii_local';
process.env.BOOKING_CALENDAR_HMAC_KEY ||= 'handler-test-hmac';
process.env.GOOGLE_CALENDAR_ID ||= 'demos-local@jurnii.io';
process.env.HOST_TIMEZONE ||= 'Europe/London';
process.env.MIN_NOTICE_MS ||= '3600000';          // 1h, so fixture slots are bookable

const { signFlowToken, signManageToken } = require('../../lib/auth');
const { calendarFingerprint } = require('../../lib/fingerprint');

// --------------------------------------------------------------------------
// Harness
// --------------------------------------------------------------------------

const GPATH = require.resolve('../../integrations/google/index.js');
const ZPATH = require.resolve('../../integrations/zoho/index.js');

/** Every Google call the handlers can make, counted. Unstubbed calls throw. */
function stubGoogle(overrides = {}) {
  const calls = [];
  const record = (name) => (...args) => {
    calls.push({ name, args });
    const impl = overrides[name];
    if (!impl) throw new Error(`unstubbed Google call: ${name}`);
    return typeof impl === 'function' ? impl(...args) : impl;
  };
  const real = require(GPATH);
  require.cache[GPATH].exports = {
    ...real,
    checkFreeBusy: record('checkFreeBusy'),
    insertEvent: record('insertEvent'),
    readEvent: record('readEvent'),
    probeEventAccess: record('probeEventAccess'),
    qualifyNotFound: record('qualifyNotFound'),
    updateEventTimes: record('updateEventTimes'),
    cancelEvent: record('cancelEvent'),
    awaitMeetLink: overrides.awaitMeetLink || (async (_c, e) => real.extractMeetLink(e)),
  };
  return calls;
}

/** Any Zoho call at all is a failure on the request path. */
function forbidZoho() {
  const calls = [];
  const real = require(ZPATH);
  const trap = new Proxy({}, {
    get(_t, prop) {
      if (typeof real[prop] === 'function') {
        return (...args) => { calls.push(prop); throw new Error(`request path called Zoho: ${prop}`); };
      }
      return real[prop];
    },
  });
  require.cache[ZPATH].exports = trap;
  return calls;
}

function restoreModules() {
  delete require.cache[GPATH];
  delete require.cache[ZPATH];
}

/** Load a handler fresh so it picks up the current stubs. */
function loadHandler(rel) {
  const p = require.resolve(path.join(__dirname, '..', '..', 'api', 'v1', rel));
  delete require.cache[p];
  return require(p);
}

function mockRes() {
  const res = {
    statusCode: null, body: null, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
  return res;
}

let seq = 0;
function nextId() { seq += 1; return `cafe0004-0000-4000-8000-${String(seq).padStart(12, '0')}`; }

/**
 * A distinct, grid-aligned weekday slot per index.
 *
 * Slots must not collide across tests: two journeys holding starts <60 minutes apart
 * on one calendar legitimately raise `23P01`, so a naive "N days ahead" helper that
 * skipped weekends onto the same weekday produced spurious SLOT_TAKEN failures. Hour
 * and day both vary, and 09:00–16:00 keeps the 30-minute slot inside working hours.
 */
function futureSlot(index = 0) {
  const hour = 9 + (index % 8);                     // 09:00 … 16:00
  const dayBlock = Math.floor(index / 8);
  const d = new Date(Date.now() + (7 + dayBlock * 7) * 86400000);
  d.setUTCHours(hour, 0, 0, 0);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

async function seedJourney({ step = 2, ...overrides } = {}) {
  const id = nextId();
  await db.withTransaction(async (tx) => {
    await tx.query('DELETE FROM booking_journeys WHERE journey_id = $1', [id]);
    const cols = Object.keys(overrides);
    const extra = cols.length ? ', ' + cols.join(', ') : '';
    const ph = cols.map((_, i) => `, $${i + 4}`).join('');
    await tx.query(
      `INSERT INTO booking_journeys
         (journey_id, email, email_normalized, first_name, last_name, company,
          form_step, page_1_completed_at, page_2_completed_at, host_calendar_key${extra})
       VALUES ($1, $2, $2, 'Ada', 'L', 'Acme', $3, now(), now(), 'jurnii_local'${ph})`,
      [id, `${id}@example.test`, step, ...cols.map((c) => overrides[c])]
    );
  });
  return id;
}

async function registerCalendar() {
  await db.withTransaction((tx) => tx.query(
    `INSERT INTO booking_calendars (host_calendar_key, canonical_fingerprint)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    ['jurnii_local', calendarFingerprint(process.env.GOOGLE_CALENDAR_ID)]
  ));
}

test.before(async () => { if (!skip) await registerCalendar(); });
test.afterEach(() => restoreModules());
test.after(async () => { if (!skip) await db.close(); });

// --------------------------------------------------------------------------
// Page 1 — Postgres only
// --------------------------------------------------------------------------

test('Page 1 performs ZERO Zoho calls and persists only to Postgres', { skip }, async () => {
  const zohoCalls = forbidZoho();
  stubGoogle();
  const handler = loadHandler('submissions/start.js');

  const journeyId = nextId();
  // Ids are deterministic per file, so clear any row left by a previous run —
  // otherwise the §4.7 binding guard correctly answers 409 on the second run.
  await db.withTransaction((tx) => tx.query('DELETE FROM booking_journeys WHERE journey_id = $1', [journeyId]));

  const res = mockRes();
  await handler({
    method: 'POST', headers: {},
    body: { journeyId, email: `p1-${journeyId}@acme.io`, firstName: 'Ada', lastName: 'Lovelace',
            utm_source: 'linkedin', gclid: 'abc123', landing_url: 'https://jurnii.io/demo?x=1' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.step, 1);
  assert.ok(res.body.token, 'a flow token is issued');
  assert.deepEqual(zohoCalls, [], 'not one Zoho call — ambiguity is undiscoverable here by design');

  const row = await db.withTransaction((tx) => J.get(tx, journeyId));
  assert.equal(row.email_normalized, `p1-${journeyId}@acme.io`);
  assert.equal(row.zoho_status, 'not_started');
  assert.equal(row.utm_source, 'linkedin');
  assert.deepEqual(row.attribution_extra, { gclid: 'abc123' }, 'click ids are whitelisted into extra');
  assert.ok(row.page_1_completed_at);

  // No ops row exists: nothing is queued until Page 2.
  const ops = await db.withTransaction((tx) => O.listOps(tx, journeyId));
  assert.deepEqual(ops, [], 'Page 1 queues no work');
});

test('Page 1 refuses an email rebind on an existing journey', { skip }, async () => {
  forbidZoho(); stubGoogle();
  const handler = loadHandler('submissions/start.js');
  const journeyId = nextId();
  await db.withTransaction((tx) => tx.query('DELETE FROM booking_journeys WHERE journey_id = $1', [journeyId]));
  const base = { journeyId, firstName: 'Ada', lastName: 'L' };

  const original = `rebind-${journeyId}@acme.io`;
  const first = mockRes();
  await handler({ method: 'POST', headers: {}, body: { ...base, email: original } }, first);
  assert.equal(first.statusCode, 200);

  const rebind = mockRes();
  await handler({ method: 'POST', headers: {}, body: { ...base, email: `other-${journeyId}@else.io` } }, rebind);
  assert.equal(rebind.statusCode, 409);
  assert.equal(rebind.body.code, 'journey_conflict');

  const row = await db.withTransaction((tx) => J.get(tx, journeyId));
  assert.equal(row.email_normalized, original, 'the binding is immutable');
});

// --------------------------------------------------------------------------
// Page 2 — R1, atomic
// --------------------------------------------------------------------------

test('Page 2 commits R1 and activates identity resolution ATOMICALLY, with zero Zoho calls', { skip }, async () => {
  const zohoCalls = forbidZoho(); stubGoogle();
  const handler = loadHandler('submissions/[id].js');
  const id = await seedJourney({ step: 1 });

  const res = mockRes();
  await handler({
    method: 'PATCH', headers: { authorization: `Bearer ${signFlowToken({ journeyId: id, email: 'x', step: 1 })}` },
    query: { id },
    body: { company: 'Acme Ltd', jobTitle: 'Supreme Overlord of Growth',
            countryIso2: 'GB', dialCode: '+44', nationalNumber: '07123 456789',
            product: 'Jurnii 360' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(zohoCalls, [], 'identity resolution is QUEUED, not called');

  const { row, ops } = await db.withTransaction(async (tx) => ({
    row: await J.get(tx, id), ops: await O.listOps(tx, id),
  }));
  assert.equal(row.zoho_status, 'pending');
  assert.equal(row.company, 'Acme Ltd');
  assert.equal(row.job_title_raw, 'Supreme Overlord of Growth', 'raw title, never the governed picklist');
  // The server re-derives E.164 and strips the trunk prefix.
  assert.equal(row.phone_e164, '+447123456789');
  assert.equal(row.country_name, 'United Kingdom');

  // The transition and its op activation committed together.
  assert.deepEqual(ops.map((o) => o.op), ['zoho_identity_resolve']);
  assert.equal(ops[0].state, 'pending');
  assert.ok(ops[0].next_retry_at, 'due');
});

test('Page 2 rejects a country/dial-code mismatch without mutating the row', { skip }, async () => {
  forbidZoho(); stubGoogle();
  const handler = loadHandler('submissions/[id].js');
  const id = await seedJourney({ step: 1 });

  const res = mockRes();
  await handler({
    method: 'PATCH', headers: { authorization: `Bearer ${signFlowToken({ journeyId: id, email: 'x', step: 1 })}` },
    query: { id }, body: { company: 'Acme', countryIso2: 'US', dialCode: '+44', nationalNumber: '2025550123' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.reason, 'country_dial_mismatch');
  const row = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(row.company, 'Acme', 'the seeded value is untouched');
  assert.equal(row.zoho_status, 'not_started', 'nothing was activated');
});

// --------------------------------------------------------------------------
// POST /bookings
// --------------------------------------------------------------------------

async function book(id, slot, googleOverrides) {
  const zohoCalls = forbidZoho();
  const calls = stubGoogle(googleOverrides);
  const handler = loadHandler('bookings/index.js');
  const res = mockRes();
  await handler({
    method: 'POST',
    headers: { authorization: `Bearer ${signFlowToken({ journeyId: id, email: 'x', step: 2 })}`, host: 'jurnii.io' },
    body: { slotStart: slot.toISOString() },
  }, res);
  return { res, calls, zohoCalls };
}

test('a confirmed booking uses OUR deterministic id, makes zero Zoho calls, and activates the Meeting op', { skip }, async () => {
  const id = await seedJourney();
  const slot = futureSlot();
  const { res, calls, zohoCalls } = await book(id, slot, {
    checkFreeBusy: async () => [],
    insertEvent: async (_cal, opts) => ({
      kind: 'created',
      event: { id: opts.eventId, status: 'confirmed', hangoutLink: 'https://meet/x',
               extendedProperties: { private: { journeyId: opts.journeyId, attempt: String(opts.attempt) } } },
    }),
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'confirmed');
  assert.equal(res.body.meetLink, 'https://meet/x');
  assert.ok(res.body.manageUrl, 'a durable management URL is returned');
  assert.deepEqual(zohoCalls, [], 'the booking path never calls Zoho');

  const insert = calls.find((c) => c.name === 'insertEvent');
  const suppliedId = insert.args[1].eventId;
  assert.equal(suppliedId.length, 46, 'a caller-supplied deterministic id');
  assert.match(suppliedId, /^bk[0-9a-v]+$/);

  const { row, ops, holds } = await db.withTransaction(async (tx) => ({
    row: await J.get(tx, id), ops: await O.listOps(tx, id), holds: await R.liveHolds(tx, id),
  }));
  assert.equal(row.booking_status, 'confirmed');
  assert.equal(row.google_outcome_state, 'created');
  assert.equal(row.google_event_id, suppliedId);
  assert.equal(row.google_event_candidate_id, suppliedId, 'the candidate id was persisted at R2');
  assert.equal(row.google_calendar_id, 'demos-local@jurnii.io', 'the calendar is persisted');
  assert.equal(row.booking_attempt_version, 1);
  assert.deepEqual(holds.map((h) => `${h.purpose}/${h.status}`), ['initial/confirmed']);
  assert.ok(ops.find((o) => o.op === 'zoho_meeting_create'), 'G1 is the sole creator of the Meeting op');
});

test('an existing event confirms the booking even when meetLink is null', { skip }, async () => {
  const id = await seedJourney();
  const slot = futureSlot(8);
  const { res } = await book(id, slot, {
    checkFreeBusy: async () => [],
    insertEvent: async (_cal, opts) => ({
      kind: 'created',
      event: { id: opts.eventId, status: 'confirmed',
               extendedProperties: { private: { journeyId: opts.journeyId, attempt: String(opts.attempt) } } },
    }),
    awaitMeetLink: async () => null,      // conference never materialised
  });
  // The OLD behaviour failed here. §10: never fail a booking that already exists.
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'confirmed');
  assert.equal(res.body.meetLink, null);
  const row = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(row.booking_status, 'confirmed');
});

test('private metadata carries only journeyId and attempt — never an email', { skip }, async () => {
  const id = await seedJourney();
  let captured = null;
  await book(id, futureSlot(9), {
    checkFreeBusy: async () => [],
    insertEvent: async (_cal, opts) => {
      captured = opts;
      return { kind: 'created', event: { id: opts.eventId, status: 'confirmed',
        extendedProperties: { private: { journeyId: opts.journeyId, attempt: String(opts.attempt) } } } };
    },
  });
  assert.deepEqual(Object.keys(captured).filter((k) => k === 'journeyId' || k === 'attempt').sort(),
    ['attempt', 'journeyId']);
  // The attendee list legitimately carries the visitor's address; the stored metadata must not.
  assert.equal(captured.journeyId, id);
  assert.equal(typeof captured.attempt, 'number');
});

test('ownership is journeyId + attempt, never email', { skip }, async () => {
  const id = await seedJourney();
  const { res } = await book(id, futureSlot(10), {
    checkFreeBusy: async () => [],
    insertEvent: async (_cal, opts) => ({
      kind: 'created',
      // Correct journey and attempt, but a DIFFERENT email in the (legacy) metadata.
      event: { id: opts.eventId, status: 'confirmed', hangoutLink: 'https://meet/y',
               extendedProperties: { private: { journeyId: opts.journeyId, attempt: String(opts.attempt),
                                                email: 'someone-else@elsewhere.io' } } },
    }),
  });
  assert.equal(res.statusCode, 200, 'a mismatched email is irrelevant to ownership now');

  // A mismatched journeyId IS rejected, and never adopted.
  const other = await seedJourney();
  const { res: bad } = await book(other, futureSlot(11), {
    checkFreeBusy: async () => [],
    insertEvent: async (_cal, opts) => ({
      kind: 'created',
      event: { id: opts.eventId, status: 'confirmed',
               extendedProperties: { private: { journeyId: 'someone-elses-journey', attempt: '1' } } },
    }),
  });
  assert.equal(bad.statusCode, 202, 'not adopted; recovery continues');
  const row = await db.withTransaction((tx) => J.get(tx, other));
  assert.equal(row.booking_status, 'reserved', 'the hold is retained, nothing confirmed');
});

test('an uncertain create returns 202 and issues NO second insert for the same attempt', { skip }, async () => {
  const id = await seedJourney();
  const slot = futureSlot(12);

  const first = await book(id, slot, {
    checkFreeBusy: async () => [],
    insertEvent: async () => ({ kind: 'uncertain', error: { status: 503, transient: true } }),
  });
  assert.equal(first.res.statusCode, 202);
  assert.equal(first.res.body.status, 'booking_pending');
  assert.equal(first.res.body.manageUrl, undefined, 'no manage URL while unresolved');

  const afterFirst = await db.withTransaction(async (tx) => ({
    row: await J.get(tx, id), op: await O.getOp(tx, id, 'google_create_recovery'),
  }));
  assert.equal(afterFirst.row.google_outcome_state, 'unknown');
  assert.equal(afterFirst.op.create_attempts, 1);

  // A repeat POST must make NO Google call and bump NO version.
  const repeat = await book(id, slot, {});
  assert.equal(repeat.res.statusCode, 202);
  assert.deepEqual(repeat.calls, [], 'guard 0c short-circuits before any Google call');

  const afterRepeat = await db.withTransaction(async (tx) => ({
    row: await J.get(tx, id), op: await O.getOp(tx, id, 'google_create_recovery'),
  }));
  assert.equal(afterRepeat.op.create_attempts, 1, 'no second insert for this attempt');
  assert.equal(afterRepeat.row.booking_attempt_version, 1, 'no version bump');
});

test('the unresolved guard runs BEFORE the confirmed and idempotent-success branches', { skip }, async () => {
  const id = await seedJourney();
  const slot = futureSlot(13);

  // Confirm, then escalate to unresolved while KEEPING the google_event_id and slot.
  await book(id, slot, {
    checkFreeBusy: async () => [],
    insertEvent: async (_c, o) => ({ kind: 'created', event: { id: o.eventId, status: 'confirmed',
      hangoutLink: 'https://meet/z',
      extendedProperties: { private: { journeyId: o.journeyId, attempt: String(o.attempt) } } } }),
  });
  await db.withTransaction(async (tx) => {
    await RV.addReviewReason(tx, id, 'reschedule_event_missing');
    await tx.query("UPDATE booking_journeys SET google_outcome_state='unresolved' WHERE journey_id=$1", [id]);
  });

  // The SAME slot that would otherwise return 200 confirmed.
  const { res, calls } = await book(id, slot, {});
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'booking_needs_attention');
  assert.deepEqual(calls, [], 'no Google call');
  assert.equal(res.body.reason, undefined, 'no reason code leaks to the visitor');

  const row = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(row.booking_attempt_version, 1, 'no version increment');
});

test('a confirmed FreeBusy conflict releases the hold with create_attempts still 0 (G2a)', { skip }, async () => {
  const id = await seedJourney();
  const slot = futureSlot(14);
  const { res, calls } = await book(id, slot, {
    checkFreeBusy: async () => ([{ start: slot.toISOString(), end: new Date(slot.getTime() + 1800000).toISOString() }]),
  });
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'SLOT_TAKEN');
  assert.equal(calls.filter((c) => c.name === 'insertEvent').length, 0, 'events.insert is NEVER issued');

  const { holds, op, row } = await db.withTransaction(async (tx) => ({
    holds: await R.liveHolds(tx, id), op: await O.getOp(tx, id, 'google_create_recovery'),
    row: await J.get(tx, id),
  }));
  assert.deepEqual(holds, [], 'the hold is released');
  assert.equal(op.create_attempts, 0, 'nothing was sent, so nothing is latched');
  assert.equal(op.state, 'done');
  assert.equal(row.booking_status, 'draft');
});

test('an UNREADABLE FreeBusy is not a conflict: 202 with the hold retained', { skip }, async () => {
  const id = await seedJourney();
  const { res } = await book(id, futureSlot(15), {
    checkFreeBusy: async () => { throw new Error('freebusy down'); },
  });
  assert.equal(res.statusCode, 202);
  const holds = await db.withTransaction((tx) => R.liveHolds(tx, id));
  assert.equal(holds.length, 1, 'the slot is not handed away on no evidence');
  assert.equal(holds[0].armed, true);
});

test('an invalid slot is 400 with a reason, never a 502', { skip }, async () => {
  const id = await seedJourney();
  const cases = [
    ['not-a-date', 'slot_malformed'],
    [new Date(futureSlot(16).getTime() + 7 * 60000).toISOString(), 'slot_unaligned'],
    // Aligned, but inside the notice window: alignment is validated before notice,
    // so an unaligned value would report slot_unaligned instead.
    [(() => { const d = new Date(Date.now() + 15 * 60000); d.setUTCMinutes(0, 0, 0); return d.toISOString(); })(), 'slot_too_soon'],
  ];
  for (const [input, reason] of cases) {
    forbidZoho();
    const calls = stubGoogle();
    const handler = loadHandler('bookings/index.js');
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { authorization: `Bearer ${signFlowToken({ journeyId: id, email: 'x', step: 2 })}` },
      body: { slotStart: input },
    }, res);
    assert.equal(res.statusCode, 400, `${input} -> 400`);
    assert.equal(res.body.reason, reason);
    assert.deepEqual(calls, [], 'validation precedes every external call');
    restoreModules();
  }
});

test('a flow token below step 2 and a manage token both cannot book', { skip }, async () => {
  const id = await seedJourney();
  forbidZoho(); stubGoogle();
  const handler = loadHandler('bookings/index.js');

  for (const [token, expected] of [
    [signFlowToken({ journeyId: id, email: 'x', step: 1 }), 409],
    [signManageToken({ journeyId: id, email: 'x' }), 403],
  ]) {
    const res = mockRes();
    await handler({ method: 'POST', headers: { authorization: `Bearer ${token}` },
      body: { slotStart: futureSlot(17).toISOString() } }, res);
    assert.equal(res.statusCode, expected);
  }
});

// --------------------------------------------------------------------------
// Status endpoint
// --------------------------------------------------------------------------

test('status polling returns manageUrl only once confirmed, and leaks nothing internal', { skip }, async () => {
  const id = await seedJourney();
  const slot = futureSlot(18);
  const handler = () => loadHandler('bookings/[id]/status.js');

  // While pending: no manageUrl.
  await db.withTransaction((tx) => J.patchGoogle(tx, id, { google_outcome_state: 'unknown', booking_status: 'reserved' }));
  forbidZoho(); stubGoogle();
  let res = mockRes();
  await handler()({ method: 'GET', headers: { authorization: `Bearer ${signFlowToken({ journeyId: id, email: 'x', step: 2 })}` }, query: { id } }, res);
  assert.equal(res.body.bookingStatus, 'booking_pending');
  assert.equal(res.body.manageUrl, undefined);
  restoreModules();

  // Reset to a bookable state: guard 0c would (correctly) refuse to book from 'unknown'.
  await db.withTransaction((tx) => J.patchGoogle(tx, id, {
    google_outcome_state: 'not_created', booking_status: 'draft' }));

  // Confirmed: manageUrl appears.
  await book(id, slot, {
    checkFreeBusy: async () => [],
    insertEvent: async (_c, o) => ({ kind: 'created', event: { id: o.eventId, status: 'confirmed',
      hangoutLink: 'https://meet/s',
      extendedProperties: { private: { journeyId: o.journeyId, attempt: String(o.attempt) } } } }),
  });
  restoreModules();
  forbidZoho(); stubGoogle();
  res = mockRes();
  await handler()({ method: 'GET', headers: { authorization: `Bearer ${signFlowToken({ journeyId: id, email: 'x', step: 2 })}` }, query: { id } }, res);

  assert.equal(res.body.bookingStatus, 'confirmed');
  assert.ok(res.body.manageUrl, 'the manage credential is handed over on confirmation');

  // Nothing internal is exposed.
  const serialised = JSON.stringify(res.body);
  for (const leak of ['demos-local@jurnii.io', 'zoho', 'candidate', 'reason', 'google_event_id', 'stack']) {
    assert.ok(!serialised.toLowerCase().includes(leak.toLowerCase()), `must not leak ${leak}`);
  }
  assert.deepEqual(Object.keys(res.body).sort(), [
    'bookingId', 'bookingStatus', 'formStatus', 'integrationStatus', 'manageUrl',
    'meetLink', 'pendingSlotStart', 'slotEnd', 'slotStart', 'timezone',
  ]);
});

test('an escalated journey projects needs_attention on both axes and leaks no reason code', { skip }, async () => {
  const id = await seedJourney();
  await db.withTransaction(async (tx) => {
    await RV.addReviewReason(tx, id, 'google_calendar_unreadable');
    await tx.query(
      "UPDATE booking_journeys SET google_outcome_state='unresolved', booking_status='needs_attention' WHERE journey_id=$1",
      [id]);
  });
  forbidZoho(); stubGoogle();
  const res = mockRes();
  await loadHandler('bookings/[id]/status.js')({
    method: 'GET', headers: { authorization: `Bearer ${signManageToken({ journeyId: id, email: 'x' })}` },
    query: { id },
  }, res);

  assert.equal(res.body.bookingStatus, 'needs_attention');
  assert.equal(res.body.integrationStatus, 'needs_attention');
  assert.equal(res.body.manageUrl, undefined);
  assert.ok(!JSON.stringify(res.body).includes('google_calendar_unreadable'));
});

// --------------------------------------------------------------------------
// Cancel — gated
// --------------------------------------------------------------------------

test('cancellation is disabled: 403 with no Google call, no Zoho call and no intent recorded', { skip }, async () => {
  const id = await seedJourney({ booking_status: 'confirmed', google_status: 'confirmed' });
  const previous = process.env.BOOKING_CANCELLATION_ENABLED;
  process.env.BOOKING_CANCELLATION_ENABLED = 'false';
  try {
    const zohoCalls = forbidZoho();
    const calls = stubGoogle();
    const res = mockRes();
    await loadHandler('bookings/[id]/index.js')({
      method: 'DELETE', headers: { authorization: `Bearer ${signManageToken({ journeyId: id, email: 'x' })}` },
      query: { id },
    }, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'cancellation_disabled');
    assert.deepEqual(calls, []);
    assert.deepEqual(zohoCalls, []);

    const { row, ops } = await db.withTransaction(async (tx) => ({
      row: await J.get(tx, id), ops: await O.listOps(tx, id),
    }));
    assert.equal(row.cancel_intent_state, 'none', 'no intent recorded');
    assert.equal(row.intent_version, 0);
    assert.equal(ops.find((o) => o.op === 'google_cancel'), undefined);
  } finally {
    if (previous === undefined) delete process.env.BOOKING_CANCELLATION_ENABLED;
    else process.env.BOOKING_CANCELLATION_ENABLED = previous;
  }
});

test('an unqualified 404 during cancellation never proves absence', { skip }, async () => {
  const id = await seedJourney({ booking_status: 'confirmed', google_status: 'confirmed' });
  await db.withTransaction(async (tx) => {
    await tx.query(
      "UPDATE booking_journeys SET google_event_id='ev-cancel', google_calendar_id=$2 WHERE journey_id=$1",
      [id, 'demos-local@jurnii.io']);
    await R.upsertPendingHold(tx, id, {
      purpose: 'initial', hostCalendarKey: 'jurnii_local', slotStartUtc: futureSlot(20).toISOString() });
    await R.confirmHold(tx, id, 'initial');
  });

  const previous = process.env.BOOKING_CANCELLATION_ENABLED;
  process.env.BOOKING_CANCELLATION_ENABLED = 'true';
  try {
    forbidZoho();
    stubGoogle({
      cancelEvent: async () => ({ kind: 'not_found' }),
      qualifyNotFound: async () => ({ verdict: 'unknown', probe: { confirmed: false, role: 'reader' } }),
    });
    const res = mockRes();
    await loadHandler('bookings/[id]/index.js')({
      method: 'DELETE', headers: { authorization: `Bearer ${signManageToken({ journeyId: id, email: 'x' })}` },
      query: { id },
    }, res);

    assert.equal(res.statusCode, 202, 'never 200 cancelled on an unqualified 404');
    assert.equal(res.body.status, 'cancel_pending');

    const { row, ops, holds } = await db.withTransaction(async (tx) => ({
      row: await J.get(tx, id), ops: await O.listOps(tx, id), holds: await R.liveHolds(tx, id),
    }));
    assert.equal(row.booking_status, 'cancel_pending', 'not cancelled');
    assert.equal(holds.length, 1, 'the slot stays held');
    assert.equal(ops.find((o) => o.op === 'zoho_cancel_propagate'), undefined,
      'Zoho is never told a live meeting was cancelled');
  } finally {
    if (previous === undefined) delete process.env.BOOKING_CANCELLATION_ENABLED;
    else process.env.BOOKING_CANCELLATION_ENABLED = previous;
  }
});

// --------------------------------------------------------------------------
// Availability
// --------------------------------------------------------------------------

test('availability fails closed with 503 when Postgres is unreadable', { skip }, async () => {
  forbidZoho();
  const calls = stubGoogle({ checkFreeBusy: async () => [] });
  const dbPath = require.resolve('../../db/index.js');
  const realDb = require(dbPath);
  require.cache[dbPath].exports = { ...realDb, query: async () => { throw new Error('pg down'); } };
  try {
    const res = mockRes();
    await loadHandler('availability.js')({ method: 'GET', headers: {}, query: {} }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'availability_unavailable');
    assert.equal(res.body.slots, undefined, 'never a Google-only slot list');
    assert.deepEqual(calls, [], 'Postgres is read first, so no Google call is wasted');
  } finally {
    delete require.cache[dbPath];
  }
});

test('availability subtracts Postgres holds as well as Google busy periods', { skip }, async () => {
  const holder = await seedJourney();
  const held = futureSlot(21);
  await db.withTransaction((tx) => R.upsertPendingHold(tx, holder, {
    purpose: 'initial', hostCalendarKey: 'jurnii_local', slotStartUtc: held.toISOString() }));

  forbidZoho();
  stubGoogle({ checkFreeBusy: async () => [] });   // Google says everything is free
  const res = mockRes();
  await loadHandler('availability.js')({
    method: 'GET', headers: {},
    query: { timeMin: new Date(held.getTime() - 7200000).toISOString(),
             timeMax: new Date(held.getTime() + 7200000).toISOString() },
  }, res);

  assert.equal(res.statusCode, 200);
  const offered = res.body.slots.map((s) => s.start);
  assert.ok(!offered.includes(held.toISOString()), 'the held slot is withheld');
  // And so is everything within 60 minutes of it, matching the buffered predicate.
  assert.ok(!offered.includes(new Date(held.getTime() + 1800000).toISOString()));
  assert.ok(!offered.includes(new Date(held.getTime() - 1800000).toISOString()));
  assert.ok(offered.includes(new Date(held.getTime() + 3600000).toISOString()),
    'exactly 60 minutes away is offerable');
});

// --------------------------------------------------------------------------
// No handler creates CRM records
// --------------------------------------------------------------------------

test('no handler creates a Zoho Meeting, Contact, Account, Deal or Quote', { skip }, async () => {
  const fs = require('fs');
  const dir = path.join(__dirname, '..', '..', 'api', 'v1');
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) files.push(p);
    }
  })(dir);

  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const forbidden of [
      'createEventSuppressed', 'createLeadSuppressed', 'updateLeadWorkflowEnabled',
      'createTaskSuppressed', 'createContact', 'createAccount', 'createDeal', 'createQuote',
    ]) {
      assert.ok(!src.includes(forbidden),
        `${path.relative(dir, f)} must not call ${forbidden} — CRM writes belong to the worker`);
    }
    assert.ok(!/_utils\/(google|zoho)/.test(src),
      `${path.relative(dir, f)} must not import the deleted api/_utils/{google,zoho}`);
  }
  assert.ok(files.length >= 6, `found ${files.length} handlers`);
});
