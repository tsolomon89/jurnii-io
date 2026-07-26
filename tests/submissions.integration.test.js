const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Integration tests for the page-2 handler (both the Lead and Contact paths).
// zoho is mock-injected; products (validation) + account (resolution) are real.
// The path id is the journeyId; CRM identity travels as recordType/recordId.
process.env.JWT_SECRET = 'test-secret';

const ZPATH = require.resolve('../api/_utils/zoho.js');
const APATH = require.resolve('../api/_utils/account.js');
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
  delete require.cache[APATH]; // re-require so account.js binds the mocked zoho
  delete require.cache[HPATH];
  return require(HPATH);
}

function makeRes() {
  return { statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(o) { this.body = o; return this; } };
}

function makeReq(body, recordType = 'Lead', recordId = 'L1', email = 'v@acme.com') {
  const token = jwt.sign(
    { journeyId: 'J1', recordType, recordId, email, contactId: recordType === 'Contact' ? recordId : null, step: 1, purpose: 'flow' },
    'test-secret'
  );
  return { method: 'PATCH', query: { id: 'J1' }, headers: { authorization: `Bearer ${token}` }, body };
}

// ---------------------------------------------------------------------------
// Lead path
// ---------------------------------------------------------------------------
test('Lead path: valid enrichment writes Job_Title_Raw in the single update and converts', async () => {
  let updatePayload = null;
  const converted = { id: 'L1', $converted: true, Converted_Contact: { id: 'c1' }, Converted_Account: { id: 'a1' } };
  const handler = loadHandler({
    getLead: async () => (updatePayload ? converted : { id: 'L1', $converted: false }),
    updateLead: async (id, rec) => { updatePayload = rec; return 'L1'; },
    readConversion: defaultReadConversion,
    resolveProductDeal: async () => ({ status: 'one', deal: { id: 'd1' } })
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Supreme Overlord of Growth', productInterest: 'Jurnii 360', country: 'United Kingdom' }), res);

  assert.ok(updatePayload, 'updateLead must be called for a valid enrichment');
  assert.strictEqual(updatePayload.Job_Title_Raw, 'Supreme Overlord of Growth');
  assert.strictEqual('Job_Title' in updatePayload, false);
  assert.deepStrictEqual(updatePayload.Product_Interest, ['Jurnii 360']);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.dealId, 'd1');
});

test('Lead path: an out-of-list job title never blocks conversion', async () => {
  let updateCalled = false;
  const converted = { id: 'L1', $converted: true, Converted_Contact: { id: 'c1' }, Converted_Account: { id: 'a1' } };
  const handler = loadHandler({
    getLead: async () => (updateCalled ? converted : { id: 'L1', $converted: false }),
    updateLead: async () => { updateCalled = true; return 'L1'; },
    readConversion: defaultReadConversion,
    resolveProductDeal: async () => ({ status: 'one', deal: { id: 'd1' } })
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Completely Made Up Title', productInterest: 'Jurnii UX', country: 'Germany' }), res);
  assert.strictEqual(updateCalled, true);
  assert.strictEqual(res.statusCode, 200);
});

test('Lead path: an unrecognized country blocks the update (Lead left unconverted)', async () => {
  let updateCalled = false;
  const handler = loadHandler({
    getLead: async () => ({ id: 'L1', $converted: false }),
    updateLead: async () => { updateCalled = true; return 'L1'; },
    readConversion: defaultReadConversion,
    resolveProductDeal: async () => ({ status: 'one', deal: { id: 'd1' } })
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Product', productInterest: 'Jurnii 360', country: 'Atlantis' }), res);
  assert.strictEqual(updateCalled, false);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.reason, 'country_not_recognized');
});

test('Lead path: retry after conversion resumes (no second update) and returns the deal', async () => {
  let updateCalls = 0;
  const converted = { id: 'L1', $converted: true, Converted_Contact: { id: 'c1' }, Converted_Account: { id: 'a1' } };
  const handler = loadHandler({
    getLead: async () => converted,
    updateLead: async () => { updateCalls++; return 'L1'; },
    readConversion: defaultReadConversion,
    resolveProductDeal: async () => ({ status: 'one', deal: { id: 'd1' } })
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Product', productInterest: 'Jurnii 360', country: 'United Kingdom' }), res);
  assert.strictEqual(updateCalls, 0, 'must not update or re-create the converted Lead');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.dealId, 'd1');
});

// ---------------------------------------------------------------------------
// Contact path
// ---------------------------------------------------------------------------
function contactZoho(overrides = {}) {
  return Object.assign({
    getContact: async () => ({ id: 'C1', Account_Name: { id: 'A1' }, Product_Interest: ['Jurnii UX'] }),
    getAccount: async () => ({ Account_Key: 'acme.com', Account_Name: 'Acme', Website: '' }),
    searchAccountsByKey: async () => [],
    searchAccountsByWebsite: async () => [],
    searchAccountsByName: async () => [],
    createAccount: async () => 'Anew',
    updateContact: async () => 'C1',
    reconcileContact: async () => ({}),
    resolveProductDeal: async () => ({ status: 'one', deal: { id: 'd1' } })
  }, overrides);
}

test('Contact path: reuses the existing Account, merges Product_Interest, fires processContact', async () => {
  let updatePayload = null, updateOpts = null, reconciledId = null;
  const handler = loadHandler(contactZoho({
    updateContact: async (id, rec, opts) => { updatePayload = rec; updateOpts = opts; return id; },
    reconcileContact: async (id) => { reconciledId = id; return {}; }
  }));
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Growth', productInterest: 'Jurnii 360', country: 'United Kingdom' }, 'Contact', 'C1'), res);

  assert.strictEqual(res.statusCode, 200);
  assert.ok(updatePayload, 'the Contact is updated');
  assert.strictEqual('Company' in updatePayload, false, 'Contacts have no Company field');
  assert.strictEqual(updatePayload.Job_Title_Raw, 'Head of Growth');
  assert.deepStrictEqual(updatePayload.Product_Interest, ['Jurnii UX', 'Jurnii 360'], 'additive union, not replace');
  assert.strictEqual('Account_Name' in updatePayload, false, 'existing Account reused — not relinked');
  assert.deepStrictEqual(updateOpts, { trigger: [] }, 'enrichment write is workflow-suppressed');
  assert.strictEqual(reconciledId, 'C1', 'processContact invoked with the contact id');
  assert.strictEqual(res.body.contactId, 'C1');
  assert.strictEqual(res.body.dealId, 'd1');
});

test('Contact path: no Account on the Contact → creates one named after the COMPANY and links it', async () => {
  let createdData = null, updatePayload = null;
  const handler = loadHandler(contactZoho({
    getContact: async () => ({ id: 'C1', Account_Name: null, Product_Interest: [] }),
    searchAccountsByKey: async () => [],
    searchAccountsByWebsite: async () => [],
    searchAccountsByName: async () => [],
    createAccount: async (data) => { createdData = data; return 'Anew'; },
    updateContact: async (id, rec) => { updatePayload = rec; return id; }
  }));
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Growth', productInterest: 'Jurnii 360', country: 'United Kingdom' }, 'Contact', 'C1'), res);

  assert.strictEqual(res.statusCode, 200);
  assert.ok(createdData, 'a new Account is created');
  assert.strictEqual(createdData.Account_Name, 'Acme', 'named after the company, never the person');
  assert.strictEqual(createdData.Account_Key, 'acme.com');
  assert.deepStrictEqual(updatePayload.Account_Name, { id: 'Anew' }, 'the new Account is linked onto the Contact');
});

test('Contact path: established Account conflicting with submitted company/domain → 409 account_conflict', async () => {
  let updateCalled = false, reconcileCalled = false;
  const handler = loadHandler(contactZoho({
    getContact: async () => ({ id: 'C1', Account_Name: { id: 'A1' }, Product_Interest: [] }),
    getAccount: async () => ({ Account_Key: 'other.com', Account_Name: 'Other Inc', Website: 'https://other.com' }),
    updateContact: async () => { updateCalled = true; return 'C1'; },
    reconcileContact: async () => { reconcileCalled = true; return {}; }
  }));
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Growth', productInterest: 'Jurnii 360', country: 'United Kingdom' }, 'Contact', 'C1'), res);

  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.reason, 'account_conflict');
  assert.strictEqual(updateCalled, false, 'no Contact write on conflict');
  assert.strictEqual(reconcileCalled, false, 'no reconciliation on conflict');
});

test('Contact path: >1 candidate Account on the fallback tiers → 409 account_ambiguous', async () => {
  const handler = loadHandler(contactZoho({
    getContact: async () => ({ id: 'C1', Account_Name: null, Product_Interest: [] }),
    searchAccountsByKey: async () => [],
    searchAccountsByWebsite: async () => [{ id: 'A1' }],
    searchAccountsByName: async () => [{ id: 'A2' }]
  }));
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Growth', productInterest: 'Jurnii 360', country: 'United Kingdom' }, 'Contact', 'C1'), res);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.reason, 'account_ambiguous');
});
