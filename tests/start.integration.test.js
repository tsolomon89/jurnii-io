const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Integration tests for Page-1 (start.js): strictly-sequential Contact-first
// resolution, client journeyId validation, and mandatory Page-1 persistence.
// zoho is mock-injected; email (business-domain gate) is the real module.
process.env.JWT_SECRET = 'test-secret';

const ZPATH = require.resolve('../api/_utils/zoho.js');
const HPATH = require.resolve('../api/v1/submissions/start.js');
const UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function loadHandler(zohoMock) {
  require.cache[ZPATH] = { id: ZPATH, filename: ZPATH, loaded: true, exports: zohoMock };
  delete require.cache[HPATH];
  return require(HPATH);
}

function makeRes() {
  return { statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(o) { this.body = o; return this; } };
}

function makeReq(body) {
  return { method: 'POST', headers: {}, body: Object.assign({
    journeyId: UUID, firstName: 'Alex', lastName: 'Mercer', email: 'alex@acme.com', consent: true
  }, body) };
}

test('existing single Contact → recordType Contact, NO Lead search, NO Lead created', async () => {
  let leadsSearched = false, createLeadCalled = false, contactUpdated = null;
  const handler = loadHandler({
    searchContactsByEmail: async () => [{ id: 'C1' }],
    searchLeadsByEmail: async () => { leadsSearched = true; return []; },
    createLead: async () => { createLeadCalled = true; return 'L1'; },
    updateLead: async () => 'L1',
    updateContact: async (id, rec) => { contactUpdated = { id, rec }; return id; }
  });
  const res = makeRes();
  await handler(makeReq(), res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(leadsSearched, false, 'a matched Contact must NOT trigger a Lead search');
  assert.strictEqual(createLeadCalled, false, 'no Lead is created when a Contact exists');
  assert.ok(contactUpdated, 'Page-1 consent is persisted to the Contact');
  assert.strictEqual(contactUpdated.rec.Contact_Marketing_Consent, true);
  const decoded = jwt.verify(res.body.token, 'test-secret');
  assert.strictEqual(decoded.recordType, 'Contact');
  assert.strictEqual(decoded.recordId, 'C1');
  assert.strictEqual(decoded.contactId, 'C1');
  assert.strictEqual(decoded.journeyId, UUID);
  assert.strictEqual(res.body.journeyId, UUID);
});

test('no Contact + one unconverted Lead → reuse Lead, NO new Lead', async () => {
  let createLeadCalled = false, leadUpdated = null;
  const handler = loadHandler({
    searchContactsByEmail: async () => [],
    searchLeadsByEmail: async () => [{ id: 'L9' }],
    createLead: async () => { createLeadCalled = true; return 'Lnew'; },
    updateLead: async (id, rec, opts) => { leadUpdated = { id, rec, opts }; return id; },
    updateContact: async () => 'C1'
  });
  const res = makeRes();
  await handler(makeReq(), res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(createLeadCalled, false);
  assert.ok(leadUpdated, 'the reused Lead is updated with Page-1 fields');
  assert.deepStrictEqual(leadUpdated.opts, { trigger: [] }, 'Page-1 Lead write suppresses workflows');
  const decoded = jwt.verify(res.body.token, 'test-secret');
  assert.strictEqual(decoded.recordType, 'Lead');
  assert.strictEqual(decoded.recordId, 'L9');
  assert.strictEqual(decoded.contactId, null);
});

test('no Contact + no Lead → create Lead with trigger:[]', async () => {
  let createOpts = null;
  const handler = loadHandler({
    searchContactsByEmail: async () => [],
    searchLeadsByEmail: async () => [],
    createLead: async (rec, opts) => { createOpts = opts; return 'Lnew'; },
    updateLead: async () => 'x',
    updateContact: async () => 'x'
  });
  const res = makeRes();
  await handler(makeReq(), res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(createOpts, { trigger: [] });
  const decoded = jwt.verify(res.body.token, 'test-secret');
  assert.strictEqual(decoded.recordType, 'Lead');
  assert.strictEqual(decoded.recordId, 'Lnew');
});

test('multiple Contacts → 409 identity_ambiguous, no Lead search, no create', async () => {
  let leadsSearched = false, createLeadCalled = false;
  const handler = loadHandler({
    searchContactsByEmail: async () => [{ id: 'C1' }, { id: 'C2' }],
    searchLeadsByEmail: async () => { leadsSearched = true; return []; },
    createLead: async () => { createLeadCalled = true; return 'L1'; },
    updateLead: async () => 'x',
    updateContact: async () => 'x'
  });
  const res = makeRes();
  await handler(makeReq(), res);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.reason, 'identity_ambiguous');
  assert.strictEqual(leadsSearched, false);
  assert.strictEqual(createLeadCalled, false);
});

test('no Contact + multiple Leads → 409 identity_ambiguous', async () => {
  const handler = loadHandler({
    searchContactsByEmail: async () => [],
    searchLeadsByEmail: async () => [{ id: 'L1' }, { id: 'L2' }],
    createLead: async () => 'x',
    updateLead: async () => 'x',
    updateContact: async () => 'x'
  });
  const res = makeRes();
  await handler(makeReq(), res);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.reason, 'identity_ambiguous');
});

test('a missing / malformed journeyId is rejected (400); the server never mints its own', async () => {
  const handler = loadHandler({
    searchContactsByEmail: async () => [], searchLeadsByEmail: async () => [],
    createLead: async () => 'x', updateLead: async () => 'x', updateContact: async () => 'x'
  });
  for (const bad of [undefined, '', 'not-a-uuid', '12345']) {
    const res = makeRes();
    await handler(makeReq({ journeyId: bad }), res);
    assert.strictEqual(res.statusCode, 400, `journeyId=${bad} must be rejected`);
    assert.strictEqual(res.body.code, 'validation');
  }
});

test('a free/personal email is rejected before any CRM call', async () => {
  let searched = false;
  const handler = loadHandler({
    searchContactsByEmail: async () => { searched = true; return []; },
    searchLeadsByEmail: async () => [], createLead: async () => 'x', updateLead: async () => 'x', updateContact: async () => 'x'
  });
  const res = makeRes();
  await handler(makeReq({ email: 'alex@gmail.com' }), res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.code, 'EMAIL_NOT_BUSINESS');
  assert.strictEqual(searched, false);
});
