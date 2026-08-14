'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { dataLoadPayload } = require('../workflows/zoho-ops');
const PICKLISTS = require('../config/zoho-picklists');

// REGRESSION: a live Production smoke found that Product_Interest is a
// multiselectpicklist (jsonarray) in Zoho, so a bare string is rejected with
// INVALID_DATA -> record_write_failed, and every product-bearing booking failed
// the Zoho write. It must be sent as an array.
test('dataLoadPayload sends Product_Interest as a jsonarray, never a bare string', () => {
  const p = dataLoadPayload({
    first_name: 'A', last_name: 'B', email: 'a@b.co', product_interests: ['Jurnii UX'],
  });
  assert.deepStrictEqual(p.Product_Interest, ['Jurnii UX']);
  assert.equal(typeof p.Product_Interest, 'object');
});

test('dataLoadPayload omits Product_Interest entirely when there is no product', () => {
  const p = dataLoadPayload({ first_name: 'A', last_name: 'B', email: 'a@b.co' });
  assert.strictEqual('Product_Interest' in p, false);
  const empty = dataLoadPayload({ email: 'a@b.co', product_interests: [] });
  assert.strictEqual('Product_Interest' in empty, false);
});

// ---------------------------------------------------------------------------
// Multi-select products (§3)
// ---------------------------------------------------------------------------

test('every selected product is sent, not just the first', () => {
  const p = dataLoadPayload({
    email: 'a@b.co', product_interests: ['Partnership', 'Jurnii UX', 'Jurnii Cortex'],
  });
  assert.deepStrictEqual(p.Product_Interest, ['Partnership', 'Jurnii UX', 'Jurnii Cortex']);
});

test('Partnership is sent under exactly that name', () => {
  const p = dataLoadPayload({ email: 'a@b.co', product_interests: ['Partnership'] });
  assert.deepStrictEqual(p.Product_Interest, ['Partnership']);
  // And it is a real live picklist value, not something this code invented.
  assert.ok(PICKLISTS.valuesFor('Leads', 'Product_Interest').includes('Partnership'));
});

test('every value the form can submit is a live Product_Interest picklist value', () => {
  const live = PICKLISTS.valuesFor('Leads', 'Product_Interest');
  for (const v of ['Jurnii UX', 'Jurnii 360', 'Jurnii Cortex', 'Partnership']) {
    assert.ok(live.includes(v), `${v} is not a live Product_Interest option`);
  }
});

test('a journey written before migration 0004 still sends its scalar product', () => {
  // `productList` falls back to the legacy column, so rows persisted before the array
  // existed keep working through the worker.
  const p = dataLoadPayload({ email: 'a@b.co', product_interest: 'Jurnii 360' });
  assert.deepStrictEqual(p.Product_Interest, ['Jurnii 360']);
});

// A Zoho multiselect write REPLACES. Without the merge, a returning visitor booking a
// second demo would silently drop every product interest recorded against their Lead.
test('existing Product_Interest values are preserved, not clobbered', () => {
  const p = dataLoadPayload(
    { email: 'a@b.co', product_interests: ['Jurnii UX', 'Partnership'] },
    { existingProducts: ['Jurnii 360'] }
  );
  assert.deepStrictEqual(p.Product_Interest, ['Jurnii 360', 'Jurnii UX', 'Partnership'],
    'existing first, then the new selection');
});

test('the merge deduplicates rather than repeating a product', () => {
  const p = dataLoadPayload(
    { email: 'a@b.co', product_interests: ['Jurnii 360', 'Jurnii UX'] },
    { existingProducts: ['Jurnii 360'] }
  );
  assert.deepStrictEqual(p.Product_Interest, ['Jurnii 360', 'Jurnii UX']);
});

test('a failed enrichment read degrades to a plain replace rather than blocking', () => {
  // `leadTerminalUpdate` passes null when the pre-latch read failed. That must still
  // produce a valid payload — the single allowed workflow-enabled send is too
  // expensive to spend on an enrichment failure.
  const p = dataLoadPayload(
    { email: 'a@b.co', product_interests: ['Jurnii UX'] },
    { existingProducts: null }
  );
  assert.deepStrictEqual(p.Product_Interest, ['Jurnii UX']);
});

// ---------------------------------------------------------------------------
// Job Title — the governed picklist and the raw text (§2)
//
// REGRESSION: nothing here ever wrote `Job_Title`. `processLead.deluge` resolves
// `Contact_Role1` from that picklist, not from `Job_Title_Raw`, so every
// booking-sourced Lead reached conversion with a blank Contact Role and never met the
// activation gate. The raw field alone was never enough.
// ---------------------------------------------------------------------------

test('a governed title populates BOTH Job_Title and Job_Title_Raw', () => {
  const p = dataLoadPayload({ email: 'a@b.co', job_title_raw: 'Head of Product' });
  assert.strictEqual(p.Job_Title, 'Head of Product');
  assert.strictEqual(p.Job_Title_Raw, 'Head of Product',
    'the visitor’s own text is retained regardless');
});

test('the governed title is written in Zoho’s casing, not the visitor’s', () => {
  const p = dataLoadPayload({ email: 'a@b.co', job_title_raw: 'head of PRODUCT' });
  assert.strictEqual(p.Job_Title, 'Head of Product');
  assert.strictEqual(p.Job_Title_Raw, 'head of PRODUCT');
});

test('a persona title that is NOT a live picklist value omits Job_Title entirely', () => {
  // `Chief Revenue Officer` is one of the ~260 persona titles absent from the live
  // 154-value picklist. Sending it would make the WHOLE update INVALID_DATA and take
  // the phone, company and consent in the same map down with it.
  assert.strictEqual(PICKLISTS.match('Leads', 'Job_Title', 'Chief Revenue Officer'), null);
  const p = dataLoadPayload({ email: 'a@b.co', job_title_raw: 'Chief Revenue Officer' });
  assert.strictEqual('Job_Title' in p, false);
  assert.strictEqual(p.Job_Title_Raw, 'Chief Revenue Officer', 'but the title is still recorded');
});

test('an Other free-text title never enters the governed picklist', () => {
  const p = dataLoadPayload({ email: 'a@b.co', job_title_raw: 'Head of Widgets and Sprockets' });
  assert.strictEqual('Job_Title' in p, false);
  assert.strictEqual(p.Job_Title_Raw, 'Head of Widgets and Sprockets');
  // Nothing about it can block Lead creation: the rest of the payload is intact.
  assert.strictEqual(p.Email, 'a@b.co');
});

test('the Contact path gets the governed title too, from the identical picklist', () => {
  const p = dataLoadPayload({ email: 'a@b.co', job_title_raw: 'Head of Product' },
    { includeCompany: false, module: 'Contacts' });
  assert.strictEqual(p.Job_Title, 'Head of Product');
  assert.strictEqual(p.Job_Title_Raw, 'Head of Product');
});

test('no title at all writes neither field', () => {
  const p = dataLoadPayload({ email: 'a@b.co' });
  assert.strictEqual('Job_Title' in p, false);
  assert.strictEqual('Job_Title_Raw' in p, false);
});

test('the browser’s Contact Role never appears in a payload', () => {
  const p = dataLoadPayload({ email: 'a@b.co', job_title_raw: 'Head of Product' });
  assert.strictEqual('Contact_Role1' in p, false,
    'role resolution is owned by processLead.deluge, not by this codebase');
});

// ---------------------------------------------------------------------------
// Lead Source — per journey, defaulting to the configured public value (§6)
// ---------------------------------------------------------------------------

test('a public journey keeps the configured default Lead Source', () => {
  const p = dataLoadPayload({ email: 'a@b.co' });
  assert.strictEqual(p.Lead_Source, process.env.ZOHO_LEAD_SOURCE || 'Website');
});

test('an internal journey sends its own Lead Source, on both modules', () => {
  const j = { email: 'a@b.co', lead_source: 'Trade Show' };
  assert.strictEqual(dataLoadPayload(j).Lead_Source, 'Trade Show');
  assert.strictEqual(
    dataLoadPayload(j, { includeCompany: false, module: 'Contacts' }).Lead_Source, 'Trade Show');
});

test('every offered Lead Source is an ACTIVE live picklist value', () => {
  // The five options whose display differs from their stored value are the trap: showing
  // "Trade Show / Event" but submitting the label would be INVALID_DATA — the value is `Trade Show`.
  const sources = require('../config/lead-sources').LEAD_SOURCES;
  const live = PICKLISTS.valuesFor('Leads', 'Lead_Source');
  assert.ok(sources.length > 0);
  for (const s of sources) {
    assert.ok(live.includes(s.value), `${s.value} is not an active Lead_Source option`);
  }
  const byValue = Object.fromEntries(sources.map((s) => [s.value, s.label]));
  assert.strictEqual(byValue['Trade Show'], 'Trade Show / Event');
  assert.strictEqual(byValue.Advertisement, 'Import');
  assert.strictEqual(byValue.Twitter, 'X (Twitter)');
  // And the values Zoho keeps in its unused bin must never be offered.
  for (const binned of ['Cold Call', 'Partner', 'Web Research', 'Chat']) {
    assert.ok(!byValue[binned], `${binned} is in the unused bin and must not be offered`);
  }
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
    email: 'a@b.co', country_name: 'United Kingdom', product_interests: ['Jurnii 360'],
  });
  assert.strictEqual(p.Country, 'United Kingdom');
  assert.deepStrictEqual(p.Product_Interest, ['Jurnii 360']);
});

test('Country and Product_Interest are NEVER sent on the Contact path', () => {
  const p = dataLoadPayload(
    { email: 'a@b.co', country_name: 'United Kingdom', product_interests: ['Jurnii 360'] },
    { includeCompany: false, module: 'Contacts' }
  );
  assert.strictEqual('Country' in p, false);
  assert.strictEqual('Product_Interest' in p, false);
});

test('the Contact payload still carries the fields that DO exist on Contacts', () => {
  const p = dataLoadPayload({
    first_name: 'A', last_name: 'B', email: 'a@b.co', phone_e164: '+447700900321',
    // Deliberately a NON-governed title, so this key list stays about module scope
    // rather than quietly depending on whether `Job_Title` was added.
    job_title_raw: 'Chief Revenue Officer', country_name: 'United Kingdom',
    product_interests: ['Jurnii 360'], marketing_consent: true, company: 'Co',
  }, { includeCompany: false, module: 'Contacts' });
  assert.deepStrictEqual(Object.keys(p).sort(), [
    'Email', 'First_Name', 'Job_Title_Raw', 'Last_Name', 'Lead_Source',
    'Marketing_Consent', 'Phone',
  ]);
});

test('a governed title adds Job_Title to the Contact payload and nothing else', () => {
  const p = dataLoadPayload({
    first_name: 'A', last_name: 'B', email: 'a@b.co', phone_e164: '+447700900321',
    job_title_raw: 'Head of Product', country_name: 'United Kingdom',
    product_interests: ['Jurnii 360'], marketing_consent: true, company: 'Co',
  }, { includeCompany: false, module: 'Contacts' });
  assert.deepStrictEqual(Object.keys(p).sort(), [
    'Email', 'First_Name', 'Job_Title', 'Job_Title_Raw', 'Last_Name', 'Lead_Source',
    'Marketing_Consent', 'Phone',
  ]);
});
