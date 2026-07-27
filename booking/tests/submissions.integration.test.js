const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Integration tests for the page-2 handler (both the Lead and Contact paths).
// zoho is mock-injected; products (validation) is the real module.
//
// Page 2 performs exactly ONE required Zoho save and advances immediately. It
// NEVER polls for conversion, waits for processLead, resolves an Account/Deal, or
// blocks booking. A failed save stays an error (no false success). No test may
// take real time (there are no sleeps) or treat a review gate as success.
process.env.JWT_SECRET = 'test-secret';

const ZPATH = require.resolve('../api/_utils/zoho.js');
const HPATH = require.resolve('../api/v1/submissions/[id].js');

function defaultReadConversion(lead) {
  if (!lead) return { converted: false, contactId: null, accountId: null, dealId: null };
  const converted = lead.$converted === true || lead.Is_Converted === true;
  const d = lead.$converted_detail || {};
  const pick = (l, k) => (l && l.id) ? l.id : (d[k] || null);
  return {
    converted,
    contactId: pick(lead.Converted_Contact, 'contact'),
    accountId: pick(lead.Converted_Account, 'account'),
    dealId: pick(lead.Converted_Deal, 'deal')
  };
}

function loadHandler(zohoMock) {
  require.cache[ZPATH] = { id: ZPATH, filename: ZPATH, loaded: true, exports: zohoMock };
  delete require.cache[HPATH];
  return require(HPATH);
}

function makeRes() {
  return { statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(o) { this.body = o; return this; } };
}

function makeReq(body, recordType = 'Lead', recordId = 'L1', email = 'v@acme.com') {
  const token = jwt.sign(
    { journeyId: 'J1', recordType, recordId, email, step: 1, purpose: 'flow' },
    'test-secret'
  );
  return { method: 'PATCH', query: { id: 'J1' }, headers: { authorization: `Bearer ${token}` }, body };
}

// ---------------------------------------------------------------------------
// Lead path
// ---------------------------------------------------------------------------
test('Lead path: one enrichment update (Job_Title_Raw); advances to step 2 without waiting for conversion or a Deal', async () => {
  let updatePayload = null, getLeadCalls = 0;
  const handler = loadHandler({
    getLead: async () => { getLeadCalls++; return { id: 'L1', $converted: false }; },
    updateLead: async (id, rec) => { updatePayload = rec; return 'L1'; },
    readConversion: defaultReadConversion,
    searchContactsByEmail: async () => []
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Supreme Overlord of Growth', productInterest: 'Jurnii 360', country: 'United Kingdom' }), res);

  assert.ok(updatePayload, 'updateLead must be called for a valid enrichment');
  assert.strictEqual(updatePayload.Job_Title_Raw, 'Supreme Overlord of Growth');
  assert.strictEqual('Job_Title' in updatePayload, false);
  assert.deepStrictEqual(updatePayload.Product_Interest, ['Jurnii 360']);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.token, 'returns a step-2 token');
  assert.strictEqual(res.body.step, 2);
  assert.strictEqual('dealId' in res.body, false, 'no Deal is resolved on page 2');
  assert.strictEqual(getLeadCalls, 1, 'single read — no conversion polling / no repeated CRM reads');

  const decoded = jwt.verify(res.body.token, 'test-secret');
  assert.strictEqual(decoded.step, 2);
  assert.strictEqual(decoded.purpose, 'flow');
  assert.strictEqual(decoded.product, 'Jurnii 360', 'canonical product is carried for a one-shot lookup at booking');
  assert.strictEqual('contactId' in decoded, false);
  assert.strictEqual('accountId' in decoded, false);
  assert.strictEqual('dealId' in decoded, false);
});

test('Lead path: an out-of-list job title never blocks advancing', async () => {
  let updateCalled = false;
  const handler = loadHandler({
    getLead: async () => ({ id: 'L1', $converted: false }),
    updateLead: async () => { updateCalled = true; return 'L1'; },
    readConversion: defaultReadConversion,
    searchContactsByEmail: async () => []
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Completely Made Up Title', productInterest: 'Jurnii UX', country: 'Germany' }), res);
  assert.strictEqual(updateCalled, true);
  assert.strictEqual(res.statusCode, 200);
});

test('Lead path: an unrecognized country is a validation error (no update, no advance)', async () => {
  let updateCalled = false;
  const handler = loadHandler({
    getLead: async () => ({ id: 'L1', $converted: false }),
    updateLead: async () => { updateCalled = true; return 'L1'; },
    readConversion: defaultReadConversion,
    searchContactsByEmail: async () => []
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Product', productInterest: 'Jurnii 360', country: 'Atlantis' }), res);
  assert.strictEqual(updateCalled, false);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.code, 'validation');
  assert.strictEqual(res.body.reason, 'country_not_recognized');
  assert.strictEqual('token' in res.body, false, 'no step-2 token on a validation error');
});

test('Lead path: retry after conversion resumes without a second update (still readable)', async () => {
  let updateCalls = 0, getLeadCalls = 0;
  const converted = { id: 'L1', $converted: true, Converted_Contact: { id: 'c1' }, Converted_Account: { id: 'a1' } };
  const handler = loadHandler({
    getLead: async () => { getLeadCalls++; return converted; },
    updateLead: async () => { updateCalls++; return 'L1'; },
    readConversion: defaultReadConversion,
    searchContactsByEmail: async () => []
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Product', productInterest: 'Jurnii 360', country: 'United Kingdom' }), res);
  assert.strictEqual(updateCalls, 0, 'must not update or re-create the already-converted Lead');
  assert.strictEqual(getLeadCalls, 1, 'single read — no polling');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.token);
});

test('Lead path: a disappeared Lead (converted by a prior request) recovers via ONE email lookup', async () => {
  let searchCalls = 0;
  const handler = loadHandler({
    getLead: async () => null,
    updateLead: async () => { throw new Error('must not update a missing lead'); },
    readConversion: defaultReadConversion,
    searchContactsByEmail: async () => { searchCalls++; return [{ id: 'c1', Account_Name: { id: 'a1' } }]; }
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head', productInterest: 'Jurnii 360', country: 'United Kingdom' }), res);
  assert.strictEqual(searchCalls, 1, 'exactly one recovery lookup — no polling');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.token);
});

test('Lead path: neither Lead nor Contact establishable → retryable error (no advance)', async () => {
  const handler = loadHandler({
    getLead: async () => null,
    updateLead: async () => 'L1',
    readConversion: defaultReadConversion,
    searchContactsByEmail: async () => []
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head', productInterest: 'Jurnii 360', country: 'United Kingdom' }), res);
  assert.strictEqual(res.statusCode, 502);
  assert.strictEqual('token' in res.body, false, 'no step-2 token when the person is unresolved');
});

test('Lead path: a failed Zoho write stays an error and does NOT advance', async () => {
  const handler = loadHandler({
    getLead: async () => ({ id: 'L1', $converted: false }),
    updateLead: async () => { throw Object.assign(new Error('zoho'), { code: 'lead_update_failed' }); },
    readConversion: defaultReadConversion,
    searchContactsByEmail: async () => []
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head', productInterest: 'Jurnii 360', country: 'United Kingdom' }), res);
  assert.strictEqual(res.statusCode, 502);
  assert.strictEqual('token' in res.body, false, 'never returns a token when the save failed');
});

// ---------------------------------------------------------------------------
// Contact path
// ---------------------------------------------------------------------------
test('Contact path: one suppressed enrichment update, additive Product_Interest, advances (no Deal, no Task)', async () => {
  let updatePayload = null, updateOpts = null, contactCalls = 0;
  const handler = loadHandler({
    getContact: async () => { contactCalls++; return { id: 'C1', Account_Name: { id: 'A1' }, Product_Interest: ['Jurnii UX'] }; },
    updateContact: async (id, rec, opts) => { updatePayload = rec; updateOpts = opts; return id; },
    readConversion: defaultReadConversion,
    searchContactsByEmail: async () => []
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Growth', productInterest: 'Jurnii 360', country: 'United Kingdom' }, 'Contact', 'C1'), res);

  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.token);
  assert.strictEqual('Company' in updatePayload, false, 'Contacts have no Company field');
  assert.strictEqual(updatePayload.Job_Title_Raw, 'Head of Growth');
  assert.deepStrictEqual(updatePayload.Product_Interest, ['Jurnii UX', 'Jurnii 360'], 'additive union, not replace');
  assert.strictEqual('Account_Name' in updatePayload, false, 'never relinks the Account');
  assert.deepStrictEqual(updateOpts, { trigger: [] }, 'enrichment write is workflow-suppressed');
  assert.strictEqual(contactCalls, 1, 'single read — no polling');
});

test('Contact path: no product selected still advances to the calendar', async () => {
  const handler = loadHandler({
    getContact: async () => ({ id: 'C1', Account_Name: { id: 'A1' }, Product_Interest: [] }),
    updateContact: async () => 'C1',
    readConversion: defaultReadConversion,
    searchContactsByEmail: async () => []
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head', productInterest: 'Not sure yet', country: 'United Kingdom' }, 'Contact', 'C1'), res);
  assert.strictEqual(res.statusCode, 200);
  const decoded = jwt.verify(res.body.token, 'test-secret');
  assert.strictEqual('product' in decoded, false, 'no canonical product carried when none was selected');
});

test('Contact path: a Contact with no Account still advances', async () => {
  const handler = loadHandler({
    getContact: async () => ({ id: 'C1', Account_Name: null, Product_Interest: [] }),
    updateContact: async () => 'C1',
    readConversion: defaultReadConversion,
    searchContactsByEmail: async () => []
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head', productInterest: 'Jurnii 360', country: 'United Kingdom' }, 'Contact', 'C1'), res);
  assert.strictEqual(res.statusCode, 200);
});

test('Contact path: a failed Zoho write stays an error and does NOT advance', async () => {
  const handler = loadHandler({
    getContact: async () => ({ id: 'C1', Account_Name: { id: 'A1' }, Product_Interest: [] }),
    updateContact: async () => { throw Object.assign(new Error('zoho'), { code: 'contact_update_failed' }); },
    readConversion: defaultReadConversion,
    searchContactsByEmail: async () => []
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head', productInterest: 'Jurnii 360', country: 'United Kingdom' }, 'Contact', 'C1'), res);
  assert.strictEqual(res.statusCode, 502);
  assert.strictEqual('token' in res.body, false);
});
