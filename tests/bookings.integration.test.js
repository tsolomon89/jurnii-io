const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Integration tests for the booking handler's retry/recovery ordering, using
// require-cache injection to mock the google/zoho utils (no network, no googleapis).
process.env.JWT_SECRET = 'test-secret';

const GPATH = require.resolve('../api/_utils/google.js');
const ZPATH = require.resolve('../api/_utils/zoho.js');
const HPATH = require.resolve('../api/v1/bookings/index.js');

function loadHandler(googleMock, zohoMock) {
  require.cache[GPATH] = { id: GPATH, filename: GPATH, loaded: true, exports: googleMock };
  require.cache[ZPATH] = { id: ZPATH, filename: ZPATH, loaded: true, exports: zohoMock };
  delete require.cache[HPATH];
  return require(HPATH);
}

function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; }
  };
}

function makeReq(overrides = {}) {
  const token = jwt.sign(
    { submissionId: 's1', email: 'visitor@example.com', contactId: 'c1', dealId: 'd1', step: 2 },
    'test-secret'
  );
  return Object.assign({
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: { slotStart: '2026-08-04T13:00:00.000Z' }
  }, overrides);
}

function baseZoho(overrides = {}) {
  return Object.assign({
    searchEventByExternalId: async () => null,
    createZohoEvent: async () => 'z1',
    updateSubmissionRecord: async () => 's1'
  }, overrides);
}

test('retry reuses the submission-owned Google event and does NOT re-run FreeBusy (no self-conflict)', async () => {
  let freeBusyCalled = false;
  const googleMock = {
    checkFreeBusy: async () => { freeBusyCalled = true; return [{ start: '2026-08-04T13:00:00.000Z', end: '2026-08-04T13:30:00.000Z' }]; },
    listEventBySubmissionId: async () => ({ id: 'g1' }), // event already exists (prior attempt)
    createGoogleEvent: async () => { throw new Error('should not create'); },
    awaitMeetLink: async () => 'https://meet.google.com/abc'
  };
  const handler = loadHandler(googleMock, baseZoho());
  const res = makeRes();
  await handler(makeReq(), res);

  assert.strictEqual(freeBusyCalled, false, 'FreeBusy must not run when reusing an existing event');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.status, 'confirmed');
  assert.strictEqual(res.body.meetLink, 'https://meet.google.com/abc');
});

test('no existing event + busy slot returns SLOT_TAKEN', async () => {
  const googleMock = {
    checkFreeBusy: async () => [{ start: '2026-08-04T12:50:00.000Z', end: '2026-08-04T13:40:00.000Z' }],
    listEventBySubmissionId: async () => null,
    createGoogleEvent: async () => { throw new Error('should not create when busy'); },
    awaitMeetLink: async () => ''
  };
  const handler = loadHandler(googleMock, baseZoho());
  const res = makeRes();
  await handler(makeReq(), res);

  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.code, 'SLOT_TAKEN');
});

test('Google-success then Zoho-failure recovers on retry (event reused, no duplicate)', async () => {
  // First attempt: create Google event, then Zoho create throws -> 502.
  let created = null;
  const zohoFail = baseZoho({ createZohoEvent: async () => { throw Object.assign(new Error('zoho'), { code: 'event_create_failed' }); } });
  const googleA = {
    checkFreeBusy: async () => [],
    listEventBySubmissionId: async () => null,
    createGoogleEvent: async () => { created = { id: 'g1' }; return created; },
    awaitMeetLink: async () => 'https://meet.google.com/abc'
  };
  let handler = loadHandler(googleA, zohoFail);
  let res = makeRes();
  await handler(makeReq(), res);
  assert.strictEqual(res.statusCode, 502, 'first attempt fails at Zoho step');

  // Retry: the Google event now exists; must be reused (no create, no FreeBusy) and Zoho succeeds.
  let freeBusyCalled = false;
  const googleB = {
    checkFreeBusy: async () => { freeBusyCalled = true; return []; },
    listEventBySubmissionId: async () => ({ id: 'g1' }),
    createGoogleEvent: async () => { throw new Error('must not create on retry'); },
    awaitMeetLink: async () => 'https://meet.google.com/abc'
  };
  handler = loadHandler(googleB, baseZoho());
  res = makeRes();
  await handler(makeReq(), res);
  assert.strictEqual(freeBusyCalled, false);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.status, 'confirmed');
});

test('pending Meet (empty link) does not confirm and does not create the Zoho event', async () => {
  let zohoCreated = false;
  const zohoMock = baseZoho({ createZohoEvent: async () => { zohoCreated = true; return 'z1'; } });
  const googleMock = {
    checkFreeBusy: async () => [],
    listEventBySubmissionId: async () => null,
    createGoogleEvent: async () => ({ id: 'g1' }),
    awaitMeetLink: async () => '' // conference still pending / unresolved
  };
  const handler = loadHandler(googleMock, zohoMock);
  const res = makeRes();
  await handler(makeReq(), res);

  assert.strictEqual(zohoCreated, false, 'must not create the Zoho event without a Meet link');
  assert.strictEqual(res.statusCode, 502);
});

test('booking without a resolved Deal returns NO_SINGLE_DEAL (no event created)', async () => {
  const noDealToken = jwt.sign({ submissionId: 's1', email: 'v@e.com', contactId: 'c1', step: 2 }, 'test-secret');
  let created = false;
  const googleMock = {
    checkFreeBusy: async () => [],
    listEventBySubmissionId: async () => { created = true; return null; },
    createGoogleEvent: async () => ({ id: 'g1' }),
    awaitMeetLink: async () => 'x'
  };
  const handler = loadHandler(googleMock, baseZoho());
  const res = makeRes();
  await handler(makeReq({ headers: { authorization: `Bearer ${noDealToken}` } }), res);

  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.code, 'NO_SINGLE_DEAL');
  assert.strictEqual(created, false, 'must reject before touching Google/Zoho');
});
