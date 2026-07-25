const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Integration tests for the page-2 handler's enrichment-validation gate.
// zoho is mock-injected; products (validation) is the real module.
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

function makeReq(body) {
  const token = jwt.sign({ submissionId: 's1', email: 'v@e.com', leadId: 'L1', contactId: null, step: 1 }, 'test-secret');
  return { method: 'PATCH', query: { id: 's1' }, headers: { authorization: `Bearer ${token}` }, body };
}

test('invalid picklist Job_Title blocks the terminal update and leaves the Lead unconverted', async () => {
  process.env.ZOHO_LEAD_JOBTITLE_MODE = 'picklist';
  process.env.ZOHO_LEAD_JOBTITLE_ALLOWED = 'Head of Product';
  let updateCalled = false;
  const handler = loadHandler({
    getLead: async () => ({ id: 'L1', $converted: false }),
    updateLead: async () => { updateCalled = true; return 'L1'; },
    readConversion: defaultReadConversion,
    resolveProductDeal: async () => ({ status: 'one', deal: { id: 'd1' } }),
    updateSubmissionRecord: async () => 's1'
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Wizard', productInterest: 'Jurnii 360', country: 'United Kingdom' }), res);

  assert.strictEqual(updateCalled, false, 'updateLead must NOT be called when validation fails');
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.code, 'MANUAL_REVIEW');
  assert.strictEqual(res.body.reason, 'job_title_not_allowed');
  delete process.env.ZOHO_LEAD_JOBTITLE_MODE;
  delete process.env.ZOHO_LEAD_JOBTITLE_ALLOWED;
});

test('missing allowlist in picklist mode cannot silently remove Job_Title (fails loudly)', async () => {
  process.env.ZOHO_LEAD_JOBTITLE_MODE = 'picklist';
  delete process.env.ZOHO_LEAD_JOBTITLE_ALLOWED;
  let updateCalled = false;
  const handler = loadHandler({
    getLead: async () => ({ id: 'L1', $converted: false }),
    updateLead: async () => { updateCalled = true; return 'L1'; },
    readConversion: defaultReadConversion,
    resolveProductDeal: async () => ({ status: 'one', deal: { id: 'd1' } }),
    updateSubmissionRecord: async () => 's1'
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Product', productInterest: 'Jurnii 360', country: 'United Kingdom' }), res);

  assert.strictEqual(updateCalled, false);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.code, 'MANUAL_REVIEW');
  delete process.env.ZOHO_LEAD_JOBTITLE_MODE;
});

test('invalid country blocks conversion rather than being omitted', async () => {
  delete process.env.ZOHO_LEAD_JOBTITLE_MODE;
  let updateCalled = false;
  const handler = loadHandler({
    getLead: async () => ({ id: 'L1', $converted: false }),
    updateLead: async () => { updateCalled = true; return 'L1'; },
    readConversion: defaultReadConversion,
    resolveProductDeal: async () => ({ status: 'one', deal: { id: 'd1' } }),
    updateSubmissionRecord: async () => 's1'
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Product', productInterest: 'Jurnii 360', country: 'Atlantis' }), res);

  assert.strictEqual(updateCalled, false);
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.reason, 'country_not_recognized');
});

test('valid enrichment (text mode) includes Job_Title in the single terminal update and converts', async () => {
  delete process.env.ZOHO_LEAD_JOBTITLE_MODE;
  delete process.env.ZOHO_LEAD_JOBTITLE_ALLOWED;
  let updatePayload = null;
  const converted = { id: 'L1', $converted: true, Converted_Contact: { id: 'c1' }, Converted_Account: { id: 'a1' } };
  const handler = loadHandler({
    getLead: async () => (updatePayload ? converted : { id: 'L1', $converted: false }),
    updateLead: async (id, rec) => { updatePayload = rec; return 'L1'; },
    readConversion: defaultReadConversion,
    resolveProductDeal: async () => ({ status: 'one', deal: { id: 'd1' } }),
    updateSubmissionRecord: async () => 's1'
  });
  const res = makeRes();
  await handler(makeReq({ company: 'Acme', jobTitle: 'Head of Product', productInterest: 'Jurnii 360', country: 'United Kingdom' }), res);

  assert.ok(updatePayload, 'updateLead must be called for a valid enrichment');
  assert.strictEqual(updatePayload.Job_Title, 'Head of Product'); // title carried into the terminal update
  assert.deepStrictEqual(updatePayload.Product_Interest, ['Jurnii 360']);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.dealId, 'd1');
});
