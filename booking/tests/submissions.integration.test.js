const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Integration tests for the page-2 handler (both the Lead and Contact paths).
// zoho is mock-injected; products (validation) is the real module.
// The path id is the journeyId; CRM identity travels as recordType/recordId.
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
// Contact path (KISS): update the Contact, read its existing Account + exact Deal.
// No Account create, no reconciliation. Missing/ambiguous Deal → Contact-only
// Manual Review Task + 409.
// ---------------------------------------------------------------------------
function contactZoho(overrides = {}) {
  return Object.assign({
    getContact: async () => ({ id: 'C1', Account_Name: { id: 'A1' }, Product_Interest: ['Jurnii UX'] }),
    updateContact: async () => 'C1',
    getTasksForContact: async () => [],
    createTask: async () => 't1',
    resolveProductDeal: async () => ({ status: 'one', deal: { id: 'd1' } })
  }, overrides);
}

test('Contact path: existing Account + exact Deal → 200 (single lookup, additive Product_Interest, no create/reconcile)', async () => {
  let updatePayload = null, updateOpts = null, dealCalls = 0, taskCreated = false;
  const handler = loadHandler(contactZoho({
    updateContact: async (id, rec, opts) => { updatePayload = rec; updateOpts = opts; return id; },
    resolveProductDeal: async () => { dealCalls++; return { status: 'one', deal: { id: 'd1' } }; },
    createTask: async () => { taskCreated = true; return 't1'; }
  }));
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Growth', productInterest: 'Jurnii 360', country: 'United Kingdom' }, 'Contact', 'C1'), res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual('Company' in updatePayload, false, 'Contacts have no Company field');
  assert.strictEqual(updatePayload.Job_Title_Raw, 'Head of Growth');
  assert.deepStrictEqual(updatePayload.Product_Interest, ['Jurnii UX', 'Jurnii 360'], 'additive union, not replace');
  assert.strictEqual('Account_Name' in updatePayload, false, 'never relinks the Account');
  assert.deepStrictEqual(updateOpts, { trigger: [] }, 'enrichment write is workflow-suppressed');
  assert.strictEqual(dealCalls, 1, 'exactly one Deal lookup — no backoff on the Contact path');
  assert.strictEqual(taskCreated, false, 'no Task when the booking proceeds');
  assert.strictEqual(res.body.contactId, 'C1');
  assert.strictEqual(res.body.dealId, 'd1');
});

test('Contact path: no matching Deal → 409 deal_unresolved + Contact-only Manual Review Task', async () => {
  let taskData = null;
  const handler = loadHandler(contactZoho({
    resolveProductDeal: async () => ({ status: 'none', deal: null, count: 0 }),
    getTasksForContact: async () => [],
    createTask: async (data, opts) => { taskData = { data, opts }; return 't1'; }
  }));
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head', productInterest: 'Jurnii 360', country: 'United Kingdom' }, 'Contact', 'C1'), res);

  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.reason, 'deal_unresolved');
  assert.ok(taskData, 'a Manual Review Task is created');
  assert.deepStrictEqual(taskData.data.Who_Id, { id: 'C1' });
  assert.strictEqual('What_Id' in taskData.data, false, 'Contact-only — no What_Id');
  assert.strictEqual(taskData.data.$se_module, 'Contacts');
  assert.strictEqual(taskData.data.Task_Type, 'Manual Review');
  assert.strictEqual(taskData.data.Blocks_Sequence, 'Yes');
  assert.ok(taskData.data.Subject.includes('J1'), 'subject carries the journeyId');
  assert.ok(taskData.data.Description.startsWith('[deal_unresolved]'), 'description leads with the reason token');
  assert.deepStrictEqual(taskData.opts, { trigger: [] });
});

test('Contact path: retry reuses the open Manual Review Task (no duplicate create)', async () => {
  let createCalls = 0;
  const subject = 'Jurnii website manual review [J1]';
  const handler = loadHandler(contactZoho({
    resolveProductDeal: async () => ({ status: 'none', deal: null, count: 0 }),
    getTasksForContact: async () => [{ id: 't1', Subject: subject, Status: 'In Progress', Task_Type: 'Manual Review', Description: '[deal_unresolved]' }],
    createTask: async () => { createCalls++; return 't2'; }
  }));
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head', productInterest: 'Jurnii 360', country: 'United Kingdom' }, 'Contact', 'C1'), res);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(createCalls, 0, 'existing open Task reused, not duplicated');
});

test('Contact path: Contact with no Account → 409 deal_unresolved + Contact-only Task', async () => {
  let taskData = null;
  const handler = loadHandler(contactZoho({
    getContact: async () => ({ id: 'C1', Account_Name: null, Product_Interest: [] }),
    resolveProductDeal: async () => ({ status: 'none', deal: null, count: 0 }),
    createTask: async (data) => { taskData = data; return 't1'; }
  }));
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head', productInterest: 'Jurnii 360', country: 'United Kingdom' }, 'Contact', 'C1'), res);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.reason, 'deal_unresolved');
  assert.ok(taskData, 'a Contact-only Task is created even with no Account');
  assert.strictEqual('What_Id' in taskData, false);
});

test('Contact path: multiple matching Deals → 409 deal_ambiguous + Task', async () => {
  let taskData = null;
  const handler = loadHandler(contactZoho({
    resolveProductDeal: async () => ({ status: 'many', deal: null, count: 2 }),
    createTask: async (data) => { taskData = data; return 't1'; }
  }));
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head', productInterest: 'Jurnii 360', country: 'United Kingdom' }, 'Contact', 'C1'), res);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.reason, 'deal_ambiguous');
  assert.ok(taskData.Description.startsWith('[deal_ambiguous]'));
});

test('Contact path: no bookable product selected → 409 no_product_selected + Task', async () => {
  let taskData = null;
  const handler = loadHandler(contactZoho({
    createTask: async (data) => { taskData = data; return 't1'; }
  }));
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head', productInterest: 'Not sure yet', country: 'United Kingdom' }, 'Contact', 'C1'), res);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.reason, 'no_product_selected');
  assert.ok(taskData.Description.startsWith('[no_product_selected]'));
  assert.ok(taskData.Description.includes('Product: Not sure yet'), 'records the submitted product text');
});
