const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Integration tests for the booking handler's retry/recovery ordering + ownership
// verification, using require-cache injection to mock the google/zoho utils.
process.env.JWT_SECRET = 'test-secret';

const GPATH = require.resolve('../api/_utils/google.js');
const ZPATH = require.resolve('../api/_utils/zoho.js');
const HPATH = require.resolve('../api/v1/bookings/index.js');
const CANCEL_PATH = require.resolve('../api/v1/bookings/[id]/index.js');
const RESCHED_PATH = require.resolve('../api/v1/bookings/[id]/reschedule.js');

function loadHandlerAt(handlerPath, googleMock, zohoMock) {
  require.cache[GPATH] = { id: GPATH, filename: GPATH, loaded: true, exports: googleMock };
  require.cache[ZPATH] = { id: ZPATH, filename: ZPATH, loaded: true, exports: zohoMock };
  delete require.cache[handlerPath];
  return require(handlerPath);
}

function loadHandler(googleMock, zohoMock) {
  return loadHandlerAt(HPATH, googleMock, zohoMock);
}

// Default ownership reader: an event belongs to contact c1 / deal d1 unless overridden.
function ownedReadEventPrivate(event) {
  return {
    journeyId: (event && event.__journeyId) || 'j1',
    contactId: (event && event.__contactId) || 'c1',
    dealId: (event && event.__dealId) || 'd1'
  };
}

function manageToken(journeyId, extra = {}) {
  return jwt.sign(Object.assign({ purpose: 'manage', journeyId, contactId: 'c1', dealId: 'd1' }, extra), 'test-secret', { expiresIn: '30d' });
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
    { journeyId: 'j1', email: 'visitor@example.com', contactId: 'c1', dealId: 'd1', step: 2, purpose: 'flow' },
    'test-secret'
  );
  return Object.assign({
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: { slotStart: '2026-08-04T13:00:00.000Z' }
  }, overrides);
}

// An owned Zoho event (Who_Id=c1, What_Id=d1) unless overridden.
function ownedZohoEvent(overrides = {}) {
  return Object.assign({ id: 'z1', Event_Title: 'Jurnii Product Demo Meeting', Who_Id: { id: 'c1' }, What_Id: { id: 'd1' } }, overrides);
}

function baseZoho(overrides = {}) {
  return Object.assign({
    searchEventByExternalId: async () => null,
    createZohoEvent: async () => 'z1'
  }, overrides);
}

test('retry reuses the journey-owned Google event and does NOT re-run FreeBusy (no self-conflict)', async () => {
  let freeBusyCalled = false;
  const googleMock = {
    checkFreeBusy: async () => { freeBusyCalled = true; return [{ start: '2026-08-04T13:00:00.000Z', end: '2026-08-04T13:30:00.000Z' }]; },
    listEventByJourneyId: async () => ({ id: 'g1' }), // event already exists (prior attempt)
    readEventPrivate: ownedReadEventPrivate,
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

test('reused Google event owned by a DIFFERENT contact/deal returns correlation_conflict', async () => {
  const googleMock = {
    checkFreeBusy: async () => [],
    listEventByJourneyId: async () => ({ id: 'g1', __contactId: 'someone-else', __dealId: 'other' }),
    readEventPrivate: ownedReadEventPrivate,
    createGoogleEvent: async () => { throw new Error('must not create'); },
    awaitMeetLink: async () => 'x'
  };
  const handler = loadHandler(googleMock, baseZoho());
  const res = makeRes();
  await handler(makeReq(), res);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.code, 'correlation_conflict');
});

test('reused Zoho event owned by a DIFFERENT contact/deal returns correlation_conflict', async () => {
  const googleMock = {
    checkFreeBusy: async () => [],
    listEventByJourneyId: async () => ({ id: 'g1' }),
    readEventPrivate: ownedReadEventPrivate,
    createGoogleEvent: async () => ({ id: 'g1' }),
    awaitMeetLink: async () => 'https://meet.google.com/abc'
  };
  const zohoMock = baseZoho({ searchEventByExternalId: async () => ownedZohoEvent({ Who_Id: { id: 'x' }, What_Id: { id: 'y' } }) });
  const handler = loadHandler(googleMock, zohoMock);
  const res = makeRes();
  await handler(makeReq(), res);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.code, 'correlation_conflict');
});

test('no existing event + busy slot returns SLOT_TAKEN', async () => {
  const googleMock = {
    checkFreeBusy: async () => [{ start: '2026-08-04T12:50:00.000Z', end: '2026-08-04T13:40:00.000Z' }],
    listEventByJourneyId: async () => null,
    readEventPrivate: ownedReadEventPrivate,
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
  const zohoFail = baseZoho({ createZohoEvent: async () => { throw Object.assign(new Error('zoho'), { code: 'event_create_failed' }); } });
  const googleA = {
    checkFreeBusy: async () => [],
    listEventByJourneyId: async () => null,
    readEventPrivate: ownedReadEventPrivate,
    createGoogleEvent: async () => ({ id: 'g1' }),
    awaitMeetLink: async () => 'https://meet.google.com/abc'
  };
  let handler = loadHandler(googleA, zohoFail);
  let res = makeRes();
  await handler(makeReq(), res);
  assert.strictEqual(res.statusCode, 502, 'first attempt fails at Zoho step');

  let freeBusyCalled = false;
  const googleB = {
    checkFreeBusy: async () => { freeBusyCalled = true; return []; },
    listEventByJourneyId: async () => ({ id: 'g1' }),
    readEventPrivate: ownedReadEventPrivate,
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
    listEventByJourneyId: async () => null,
    readEventPrivate: ownedReadEventPrivate,
    createGoogleEvent: async () => ({ id: 'g1' }),
    awaitMeetLink: async () => '' // conference still pending / unresolved
  };
  const handler = loadHandler(googleMock, zohoMock);
  const res = makeRes();
  await handler(makeReq(), res);

  assert.strictEqual(zohoCreated, false, 'must not create the Zoho event without a Meet link');
  assert.strictEqual(res.statusCode, 502);
});

test('successful booking returns a durable manageUrl (manage.html + journey id)', async () => {
  process.env.PUBLIC_BASE_URL = 'https://test.jurnii.io';
  const handler = loadHandler({
    checkFreeBusy: async () => [],
    listEventByJourneyId: async () => ({ id: 'g1' }),
    readEventPrivate: ownedReadEventPrivate,
    createGoogleEvent: async () => ({ id: 'g1' }),
    awaitMeetLink: async () => 'https://meet.google.com/abc'
  }, baseZoho());
  const res = makeRes();
  await handler(makeReq(), res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.manageUrl.startsWith('https://test.jurnii.io/manage.html?token='), 'manageUrl points at manage.html');
  assert.ok(res.body.manageUrl.includes('id=j1'), 'manageUrl carries the journey id');
  assert.strictEqual(res.body.bookingId, 'j1');
  delete process.env.PUBLIC_BASE_URL;
});

test('cancel accepts a 30-day management token bound to the journey (ownership-verified)', async () => {
  const handler = loadHandlerAt(CANCEL_PATH, {
    listEventByJourneyId: async () => ({ id: 'g1' }),
    readEventPrivate: ownedReadEventPrivate,
    cancelGoogleEvent: async () => {}
  }, {
    searchEventByExternalId: async () => ownedZohoEvent(),
    updateZohoEvent: async () => 'z1'
  });
  const res = makeRes();
  await handler({ method: 'DELETE', query: { id: 'j1' }, headers: { authorization: `Bearer ${manageToken('j1')}` } }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
});

test('reschedule accepts a management token and moves the booking', async () => {
  const handler = loadHandlerAt(RESCHED_PATH, {
    checkFreeBusy: async () => [],
    listEventByJourneyId: async () => ({ id: 'g1' }),
    readEventPrivate: ownedReadEventPrivate,
    updateGoogleEvent: async () => ({ id: 'g1' })
  }, {
    searchEventByExternalId: async () => ownedZohoEvent(),
    updateZohoEvent: async () => 'z1'
  });
  const res = makeRes();
  await handler({ method: 'PATCH', query: { id: 'j1' }, headers: { authorization: `Bearer ${manageToken('j1')}` }, body: { slotStart: '2026-08-04T13:00:00.000Z' } }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
});

test('cancel rejects a management token whose journeyId does not match the path id', async () => {
  const handler = loadHandlerAt(CANCEL_PATH, {
    listEventByJourneyId: async () => ({ id: 'g1' }),
    readEventPrivate: ownedReadEventPrivate,
    cancelGoogleEvent: async () => {}
  }, baseZoho());
  const res = makeRes();
  await handler({ method: 'DELETE', query: { id: 'j1' }, headers: { authorization: `Bearer ${manageToken('j2')}` } }, res);
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.body.code, 'forbidden');
});

test('booking without a resolved Deal returns NO_SINGLE_DEAL (no event created)', async () => {
  const noDealToken = jwt.sign({ journeyId: 'j1', email: 'v@e.com', contactId: 'c1', step: 2, purpose: 'flow' }, 'test-secret');
  let touched = false;
  const googleMock = {
    checkFreeBusy: async () => [],
    listEventByJourneyId: async () => { touched = true; return null; },
    readEventPrivate: ownedReadEventPrivate,
    createGoogleEvent: async () => ({ id: 'g1' }),
    awaitMeetLink: async () => 'x'
  };
  const handler = loadHandler(googleMock, baseZoho());
  const res = makeRes();
  await handler(makeReq({ headers: { authorization: `Bearer ${noDealToken}` } }), res);

  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.code, 'NO_SINGLE_DEAL');
  assert.strictEqual(touched, false, 'must reject before touching Google/Zoho');
});
