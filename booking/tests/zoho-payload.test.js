'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { dataLoadPayload } = require('../workflows/zoho-ops');

// REGRESSION: a live Production smoke found that Product_Interest is a
// multiselectpicklist (jsonarray) in Zoho, so a bare string is rejected with
// INVALID_DATA -> record_write_failed, and every product-bearing booking failed
// the Zoho write. It must be sent as an array.
test('dataLoadPayload sends Product_Interest as a jsonarray, never a bare string', () => {
  const p = dataLoadPayload({
    first_name: 'A', last_name: 'B', email: 'a@b.co', product_interest: 'Jurnii UX',
  });
  assert.deepStrictEqual(p.Product_Interest, ['Jurnii UX']);
  assert.equal(typeof p.Product_Interest, 'object');
});

test('dataLoadPayload omits Product_Interest entirely when there is no product', () => {
  const p = dataLoadPayload({ first_name: 'A', last_name: 'B', email: 'a@b.co' });
  assert.strictEqual('Product_Interest' in p, false);
});

// ---------------------------------------------------------------------------
// Marketing consent (§4)
//
// REGRESSION: the retained Production E2E (journey c3a9b7d7…, 2026-08-02) submitted
// `marketingConsent: true`, Postgres stored `marketing_consent = true`, and BOTH the
// Lead and the Contact came back with consent false — `dataLoadPayload` never carried
// the field at all. Consent was collected and then silently discarded.
// ---------------------------------------------------------------------------

test('consent true reaches the Lead payload under the Leads api_name', () => {
  const p = dataLoadPayload({
    first_name: 'A', last_name: 'B', email: 'a@b.co', marketing_consent: true,
  });
  assert.strictEqual(p.Contact_Marketing_Consent, true);
});

test('consent true reaches the Contact payload under the Contacts api_name', () => {
  const p = dataLoadPayload(
    { first_name: 'A', last_name: 'B', email: 'a@b.co', marketing_consent: true },
    { includeCompany: false, module: 'Contacts' }
  );
  // Live metadata (2026-08-02): Contacts calls it `Marketing_Consent`; the Lead name
  // would be INVALID_DATA, which classify() treats as terminal and would escalate.
  assert.strictEqual(p.Marketing_Consent, true);
  assert.strictEqual('Contact_Marketing_Consent' in p, false);
});

test('the two modules never share a consent api_name', () => {
  const lead = dataLoadPayload({ email: 'a@b.co', marketing_consent: true });
  const contact = dataLoadPayload({ email: 'a@b.co', marketing_consent: true },
    { includeCompany: false, module: 'Contacts' });
  assert.strictEqual('Marketing_Consent' in lead, false);
  assert.strictEqual('Contact_Marketing_Consent' in contact, false);
});

for (const [label, value] of [['false', false], ['null', null], ['absent', undefined]]) {
  test(`consent ${label} omits the field entirely, so an existing true is never downgraded`, () => {
    const j = { first_name: 'A', last_name: 'B', email: 'a@b.co' };
    if (value !== undefined) j.marketing_consent = value;
    const lead = dataLoadPayload(j);
    const contact = dataLoadPayload(j, { includeCompany: false, module: 'Contacts' });
    assert.strictEqual('Contact_Marketing_Consent' in lead, false);
    assert.strictEqual('Marketing_Consent' in contact, false);
  });
}

test('consent is write-true-only on every path a reused Lead or existing Contact takes', () => {
  // Reused Lead (convergent update), new Lead (create) and the workflow-enabled
  // terminal update all share this payload, so one assertion covers all three.
  const consented = { email: 'a@b.co', marketing_consent: true };
  assert.strictEqual(dataLoadPayload(consented).Contact_Marketing_Consent, true);
  // An incoming true upgrades an empty/false value; nothing here can emit false.
  const values = Object.values(dataLoadPayload(consented));
  assert.strictEqual(values.includes(false), false);
});

test('consent never touches the unrelated email opt-out field', () => {
  const p = dataLoadPayload({ email: 'a@b.co', marketing_consent: true });
  assert.strictEqual('Email_Opt_Out' in p, false);
});

// ---------------------------------------------------------------------------
// Lead-only api_names (§4 follow-on)
//
// REGRESSION: `Country` and `Product_Interest` do not exist on Contacts (live metadata
// 2026-08-02 — Contacts has `Mailing_Country`, and product interest lives in the
// `Products_Linked` junction). Sending them on the Contact path made the whole update
// INVALID_DATA, which classify() treats as terminal. That path runs for a returning
// visitor whose Contact already exists, so their phone, job title AND consent were
// rejected together. Latent only because every journey so far created a new Lead.
// ---------------------------------------------------------------------------

test('Country and Product_Interest are sent on the Lead path', () => {
  const p = dataLoadPayload({
    email: 'a@b.co', country_name: 'United Kingdom', product_interest: 'Jurnii 360',
  });
  assert.strictEqual(p.Country, 'United Kingdom');
  assert.deepStrictEqual(p.Product_Interest, ['Jurnii 360']);
});

test('Country and Product_Interest are NEVER sent on the Contact path', () => {
  const p = dataLoadPayload(
    { email: 'a@b.co', country_name: 'United Kingdom', product_interest: 'Jurnii 360' },
    { includeCompany: false, module: 'Contacts' }
  );
  assert.strictEqual('Country' in p, false);
  assert.strictEqual('Product_Interest' in p, false);
});

test('the Contact payload still carries the fields that DO exist on Contacts', () => {
  const p = dataLoadPayload({
    first_name: 'A', last_name: 'B', email: 'a@b.co', phone_e164: '+447700900321',
    job_title_raw: 'Chief Revenue Officer', country_name: 'United Kingdom',
    product_interest: 'Jurnii 360', marketing_consent: true, company: 'Co',
  }, { includeCompany: false, module: 'Contacts' });
  assert.deepStrictEqual(Object.keys(p).sort(), [
    'Email', 'First_Name', 'Job_Title_Raw', 'Last_Name', 'Lead_Source',
    'Marketing_Consent', 'Phone',
  ]);
});
