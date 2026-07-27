const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Integration tests for the booking handler's Google-first ordering, one-shot CRM
// snapshot, ownership (signed journeyId + normalized email; NEVER Contact/Deal ids),
// and purpose enforcement. google + zoho utils are require-cache mock-injected;
// _utils/email is the real module (normalizeEmail).
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

// Default ownership reader: the event belongs to journey j1 / visitor@example.com.
function ownedReadEventPrivate() {
  return { journeyId: 'j1', email: 'visitor@example.com' };
}

function manageToken(journeyId, extra = {}) {
  return jwt.sign(
    Object.assign({ purpose: 'manage', journeyId, recordType: 'Contact', recordId: 'c1', email: 'visitor@example.com' }, extra),
    'test-secret',
    { expiresIn: '30d' }
  );
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
    { journeyId: 'j1', email: 'visitor@example.com', recordType: 'Contact', recordId: 'c1', product: 'Jurnii 360', step: 2, purpose: 'flow' },
    'test-secret'
  );
  return Object.assign({
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: { slotStart: '2026-08-04T13:00:00.000Z' }
  }, overrides);
}

// A journey-owned Zoho event (Ext_Calendar_Booking_ID = j1) unless overridden.
function ownedZohoEvent(overrides = {}) {
  return Object.assign({ id: 'z1', Event_Title: 'Jurnii Product Demo Meeting', Ext_Calendar_Booking_ID: 'j1' }, overrides);
}

function baseZoho(overrides = {}) {
  return Object.assign({
    getContact: async () => ({ id: 'c1', Account_Name: { id: 'a1' } }),
    getLead: async () => ({ id: 'L1', $converted: false }),
    readConversion: (lead) => ({
      converted: !!(lead && lead.$converted),
      contactId: (lead && lead.Converted_Contact && lead.Converted_Contact.id) || null,
      accountId: (lead && lead.Converted_Account && lead.Converted_Account.id) || null,
      dealId: null
    }),
    searchContactsByEmail: async () => [{ id: 'c1', Account_Name: { id: 'a1' } }],
    resolveProductDeal: async () => ({ status: 'one', deal: { id: 'd1' } }),
    searchEventByExternalId: async () => null,
    createZohoEvent: async () => 'z1'
  }, overrides);
}

test('retry reuses the journey-owned Google event and does NOT re-run FreeBusy (no self-conflict)', async () => {
  let freeBusyCalled = false;
  const googleMock = {
    checkFreeBusy: async () => { freeBusyCalled = true; return []; },
    listEventByJourneyId: async () => ({ id: 'g1' }),
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

test('reused Google event owned by a DIFFERENT email returns correlation_conflict', async () => {
  const googleMock = {
    checkFreeBusy: async () => [],
    listEventByJourneyId: async () => ({ id: 'g1' }),
    readEventPrivate: () => ({ journeyId: 'j1', email: 'someone-else@acme.com' }),
    createGoogleEvent: async () => { throw new Error('must not create'); },
    awaitMeetLink: async () => 'x'
  };
  const handler = loadHandler(googleMock, baseZoho());
  const res = makeRes();
  await handler(makeReq(), res);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.code, 'correlation_conflict');
});

test('reused Zoho event carrying a DIFFERENT journeyId returns correlation_conflict', async () => {
  const googleMock = {
    checkFreeBusy: async () => [],
    listEventByJourneyId: async () => ({ id: 'g1' }),
    readEventPrivate: ownedReadEventPrivate,
    createGoogleEvent: async () => ({ id: 'g1' }),
    awaitMeetLink: async () => 'https://meet.google.com/abc'
  };
  const zohoMock = baseZoho({ searchEventByExternalId: async () => ownedZohoEvent({ Ext_Calendar_Booking_ID: 'other-journey' }) });
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
  assert.strictEqual(res.statusCode, 502, 'first attempt fails at the Zoho step');

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

test('successful booking returns a durable manageUrl bound to journey + email (no dealId)', async () => {
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

  const tokenStr = decodeURIComponent(res.body.manageUrl.split('token=')[1].split('&')[0]);
  const mt = jwt.verify(tokenStr, 'test-secret');
  assert.strictEqual(mt.purpose, 'manage');
  assert.strictEqual(mt.journeyId, 'j1');
  assert.strictEqual(mt.email, 'visitor@example.com');
  assert.strictEqual('dealId' in mt, false, 'no Deal id in the management token');
  delete process.env.PUBLIC_BASE_URL;
});

test('booking with a resolved Product Deal creates a Contact-and-Deal-linked Zoho Event', async () => {
  let created = null;
  const handler = loadHandler({
    checkFreeBusy: async () => [],
    listEventByJourneyId: async () => null,
    readEventPrivate: ownedReadEventPrivate,
    createGoogleEvent: async () => ({ id: 'g1' }),
    awaitMeetLink: async () => 'https://meet.google.com/abc'
  }, baseZoho({
    getContact: async () => ({ id: 'c1', Account_Name: { id: 'a1' } }),
    resolveProductDeal: async () => ({ status: 'one', deal: { id: 'd1' } }),
    createZohoEvent: async (data) => { created = data; return 'z1'; }
  }));
  const res = makeRes();
  await handler(makeReq(), res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(created.Who_Id, { id: 'c1' });
  assert.deepStrictEqual(created.What_Id, { id: 'd1' });
  assert.strictEqual(created.$se_module, 'Deals');
});

test('booking without a resolved Deal creates a person-linked Zoho Event and still confirms', async () => {
  const noProductToken = jwt.sign({ journeyId: 'j1', email: 'visitor@example.com', recordType: 'Contact', recordId: 'c1', step: 2, purpose: 'flow' }, 'test-secret');
  let created = null, dealLookups = 0;
  const handler = loadHandler({
    checkFreeBusy: async () => [],
    listEventByJourneyId: async () => null,
    readEventPrivate: ownedReadEventPrivate,
    createGoogleEvent: async () => ({ id: 'g1' }),
    awaitMeetLink: async () => 'https://meet.google.com/abc'
  }, baseZoho({
    getContact: async () => ({ id: 'c1', Account_Name: { id: 'a1' } }),
    resolveProductDeal: async () => { dealLookups++; return { status: 'none', deal: null, count: 0 }; },
    createZohoEvent: async (data) => { created = data; return 'z1'; }
  }));
  const res = makeRes();
  await handler(makeReq({ headers: { authorization: `Bearer ${noProductToken}` } }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.status, 'confirmed');
  assert.deepStrictEqual(created.Who_Id, { id: 'c1' });
  assert.strictEqual('What_Id' in created, false, 'no Deal linked');
  assert.strictEqual('$se_module' in created, false);
  assert.strictEqual(dealLookups, 0, 'no product selected → no Deal lookup');
});

test('Lead token confirmed unconverted links the meeting to the Lead (Who_Id = Lead, no Deal)', async () => {
  const leadToken = jwt.sign({ journeyId: 'j1', email: 'visitor@example.com', recordType: 'Lead', recordId: 'L1', product: 'Jurnii 360', step: 2, purpose: 'flow' }, 'test-secret');
  let created = null;
  const handler = loadHandler({
    checkFreeBusy: async () => [],
    listEventByJourneyId: async () => null,
    readEventPrivate: ownedReadEventPrivate,
    createGoogleEvent: async () => ({ id: 'g1' }),
    awaitMeetLink: async () => 'https://meet.google.com/abc'
  }, baseZoho({
    getLead: async () => ({ id: 'L1', $converted: false }),
    resolveProductDeal: async () => { throw new Error('must not resolve a Deal with no Account'); },
    createZohoEvent: async (data) => { created = data; return 'z1'; }
  }));
  const res = makeRes();
  await handler(makeReq({ headers: { authorization: `Bearer ${leadToken}` } }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(created.Who_Id, { id: 'L1' });
  assert.strictEqual('What_Id' in created, false, 'unconverted Lead has no Account → no Deal');
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

test('purpose enforcement: a manage token cannot book and a flow token cannot cancel', async () => {
  // manage token on the booking endpoint → rejected before any Google/Zoho work.
  const bookHandler = loadHandler({
    checkFreeBusy: async () => [], listEventByJourneyId: async () => null,
    readEventPrivate: ownedReadEventPrivate, createGoogleEvent: async () => ({ id: 'g1' }),
    awaitMeetLink: async () => 'x'
  }, baseZoho());
  let res = makeRes();
  await bookHandler({ method: 'POST', headers: { authorization: `Bearer ${manageToken('j1')}` }, body: { slotStart: '2026-08-04T13:00:00.000Z' } }, res);
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.body.code, 'forbidden');

  // flow token on the cancel endpoint → rejected.
  const flowToken = jwt.sign({ journeyId: 'j1', email: 'visitor@example.com', recordType: 'Contact', recordId: 'c1', step: 2, purpose: 'flow' }, 'test-secret');
  const cancelHandler = loadHandlerAt(CANCEL_PATH, {
    listEventByJourneyId: async () => ({ id: 'g1' }), readEventPrivate: ownedReadEventPrivate, cancelGoogleEvent: async () => {}
  }, baseZoho());
  res = makeRes();
  await cancelHandler({ method: 'DELETE', query: { id: 'j1' }, headers: { authorization: `Bearer ${flowToken}` } }, res);
  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.body.code, 'forbidden');
});
