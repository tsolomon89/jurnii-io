const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const products = require('../api/_utils/products');
const account = require('../api/_utils/account');
const zoho = require('../api/_utils/zoho');
const google = require('../api/_utils/google');
const { isBusinessEmail } = require('../api/_utils/email');

test('canonicalProduct maps form values to canonical Zoho product names', () => {
  assert.strictEqual(products.canonicalProduct('Jurnii UX'), 'Jurnii UX');
  assert.strictEqual(products.canonicalProduct('Jurnii 360'), 'Jurnii 360');
  // The form label is "Cortex / Growth" but must resolve to the canonical product.
  assert.strictEqual(products.canonicalProduct('Cortex / Growth'), 'Jurnii Cortex');
  assert.strictEqual(products.canonicalProduct('Jurnii Cortex'), 'Jurnii Cortex');
  assert.strictEqual(products.canonicalProduct('Partnership'), 'Partnership');
});

test('canonicalProduct never fabricates a product for blank/unknown/Not sure yet', () => {
  assert.strictEqual(products.canonicalProduct('Not sure yet'), null);
  assert.strictEqual(products.canonicalProduct(''), null);
  assert.strictEqual(products.canonicalProduct(undefined), null);
  assert.strictEqual(products.canonicalProduct('Something Else'), null);
});

test('normalizeProductKey mirrors the Deluge computeProductKey normalization', () => {
  assert.strictEqual(products.normalizeProductKey('Jurnii UX'), 'jurnii_ux');
  assert.strictEqual(products.normalizeProductKey('Jurnii 360'), 'jurnii_360');
  assert.strictEqual(products.normalizeProductKey('Jurnii Cortex'), 'jurnii_cortex');
  assert.strictEqual(products.normalizeProductKey('  Partnership  '), 'partnership');
});

test('pickProductDeal returns exactly one open matching Deal', () => {
  const deals = [
    { id: '1', Deal_Product: { name: 'Jurnii UX' }, Opportunity_State: 'Open' },
    { id: '2', Deal_Product: { name: 'Jurnii 360' }, Opportunity_State: 'Open' }
  ];
  const r = products.pickProductDeal(deals, 'Jurnii UX');
  assert.strictEqual(r.status, 'one');
  assert.strictEqual(r.deal.id, '1');
});

test('pickProductDeal excludes Lost deals and reports none/many correctly', () => {
  const none = products.pickProductDeal(
    [{ id: '1', Deal_Product: { name: 'Jurnii UX' }, Opportunity_State: 'Lost' }],
    'Jurnii UX'
  );
  assert.strictEqual(none.status, 'none');

  const many = products.pickProductDeal(
    [
      { id: '1', Deal_Product_Key: 'jurnii_ux', Opportunity_State: 'Open' },
      { id: '2', Deal_Product: { name: 'Jurnii UX' }, Opportunity_State: 'Open' }
    ],
    'Jurnii UX'
  );
  assert.strictEqual(many.status, 'many');
  assert.strictEqual(many.count, 2);
});

test('writePayload suppresses workflows on create (trigger:[]) and defaults to all triggers', () => {
  const suppressed = zoho.writePayload({ First_Name: 'A' }, []);
  assert.deepStrictEqual(suppressed.trigger, []);           // Page-1 create: no workflow
  const enabled = zoho.writePayload({ Company: 'X' });
  assert.strictEqual('trigger' in enabled, false);          // Page-2 update: triggers run
});

test('readConversion handles lookup and $converted_detail shapes', () => {
  const viaLookup = zoho.readConversion({
    $converted: true,
    Converted_Contact: { id: 'C1' },
    Converted_Account: { id: 'A1' },
    Converted_Deal: { id: 'D1' }
  });
  assert.deepStrictEqual(viaLookup, { converted: true, contactId: 'C1', accountId: 'A1', dealId: 'D1' });

  const viaDetail = zoho.readConversion({
    Is_Converted: true,
    $converted_detail: { contact: 'C2', account: 'A2', deal: 'D2' }
  });
  assert.strictEqual(viaDetail.converted, true);
  assert.strictEqual(viaDetail.contactId, 'C2');
  assert.strictEqual(viaDetail.accountId, 'A2');

  const notConverted = zoho.readConversion({ $converted: false });
  assert.strictEqual(notConverted.converted, false);
  assert.strictEqual(notConverted.contactId, null);
});

test('extractMeetLink prefers the video entry point, not entryPoints[0]', () => {
  const event = {
    conferenceData: {
      entryPoints: [
        { entryPointType: 'phone', uri: 'tel:+441234' },
        { entryPointType: 'video', uri: 'https://meet.google.com/abc-defg-hij' }
      ]
    }
  };
  assert.strictEqual(google.extractMeetLink(event), 'https://meet.google.com/abc-defg-hij');
});

test('extractMeetLink falls back to hangoutLink and returns empty when no conference', () => {
  assert.strictEqual(
    google.extractMeetLink({ hangoutLink: 'https://meet.google.com/xyz', conferenceData: { entryPoints: [{ entryPointType: 'phone', uri: 'tel:1' }] } }),
    'https://meet.google.com/xyz'
  );
  assert.strictEqual(google.extractMeetLink({}), '');
  assert.strictEqual(google.extractMeetLink(null), '');
});

test('validateLeadEnrichment writes the raw title to Job_Title_Raw (never the governed picklist) and never blocks on it', () => {
  const r = products.validateLeadEnrichment({
    company: 'Acme', jobTitle: 'Supreme Overlord of Growth', phone: '+447', country: 'United Kingdom',
    product: 'Jurnii 360'
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.record.Company, 'Acme');
  assert.strictEqual(r.record.Phone, '+447');
  assert.deepStrictEqual(r.record.Product_Interest, ['Jurnii 360']);
  assert.strictEqual(r.record.Country, 'United Kingdom');
  assert.strictEqual(r.record.Job_Title_Raw, 'Supreme Overlord of Growth'); // raw text, no picklist pollution
  assert.strictEqual('Job_Title' in r.record, false);                        // governed picklist untouched

  const custom = products.validateLeadEnrichment({ company: 'Acme', jobTitle: 'X', rawTitleField: 'My_Raw_Field' });
  assert.strictEqual(custom.record.My_Raw_Field, 'X');
});

test('validateLeadEnrichment fails an unrecognized country rather than omitting it', () => {
  const bad = products.validateLeadEnrichment({ company: 'Acme', country: 'Atlantis' });
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.reason, 'country_not_recognized');

  const ok = products.validateLeadEnrichment({ company: 'Acme', country: 'Germany', product: null });
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.record.Country, 'Germany');
  assert.strictEqual('Product_Interest' in ok.record, false); // no product -> never fabricated
});

test('validateLeadEnrichment omits Company on the Contact path (includeCompany:false)', () => {
  const r = products.validateLeadEnrichment({ company: 'Acme', jobTitle: 'Head', includeCompany: false });
  assert.strictEqual(r.ok, true);
  assert.strictEqual('Company' in r.record, false);       // Contacts have no Company field
  assert.strictEqual(r.record.Job_Title_Raw, 'Head');
});

test('validateLeadEnrichment merges Product_Interest additively (never a bare replace)', () => {
  const r = products.validateLeadEnrichment({ company: 'Acme', jobTitle: 'H', product: 'Jurnii 360', existingProducts: ['Jurnii UX'] });
  assert.deepStrictEqual(r.record.Product_Interest, ['Jurnii UX', 'Jurnii 360']);
});

test('mergeMultiSelect dedups and preserves order (existing first)', () => {
  assert.deepStrictEqual(products.mergeMultiSelect(['a', 'b'], 'b'), ['a', 'b']);
  assert.deepStrictEqual(products.mergeMultiSelect(undefined, 'x'), ['x']);
  assert.deepStrictEqual(products.mergeMultiSelect(['a'], ['a', 'c']), ['a', 'c']);
});

test('resolveAccountForContact reuses an established Account that agrees with the domain', async () => {
  const deps = { getAccount: async () => ({ Account_Key: 'acme.com' }) };
  const r = await account.resolveAccountForContact({ contactAccountId: 'A1', email: 'x@acme.com', company: 'Acme' }, deps);
  assert.deepStrictEqual(r, { status: 'reuse', accountId: 'A1' });
});

test('resolveAccountForContact flags a materially conflicting established Account', async () => {
  const deps = { getAccount: async () => ({ Account_Key: 'other.com', Website: 'https://other.com', Account_Name: 'Other' }) };
  const r = await account.resolveAccountForContact({ contactAccountId: 'A1', email: 'x@acme.com', company: 'Acme' }, deps);
  assert.strictEqual(r.status, 'conflict');
});

test('resolveAccountForContact creates an Account named after the COMPANY when none exists', async () => {
  let created = null;
  const deps = {
    searchAccountsByKey: async () => [],
    searchAccountsByWebsite: async () => [],
    searchAccountsByName: async () => [],
    createAccount: async (d) => { created = d; return 'Anew'; }
  };
  const r = await account.resolveAccountForContact({ contactAccountId: null, email: 'x@acme.com', company: 'Acme' }, deps);
  assert.deepStrictEqual(r, { status: 'created', accountId: 'Anew' });
  assert.strictEqual(created.Account_Name, 'Acme');   // never the person's name
  assert.strictEqual(created.Account_Key, 'acme.com');
});

test('resolveAccountForContact returns ambiguous on >1 distinct fallback candidate', async () => {
  const deps = {
    searchAccountsByKey: async () => [],
    searchAccountsByWebsite: async () => [{ id: 'A1' }],
    searchAccountsByName: async () => [{ id: 'A2' }]
  };
  const r = await account.resolveAccountForContact({ contactAccountId: null, email: 'x@acme.com', company: 'Acme' }, deps);
  assert.strictEqual(r.status, 'ambiguous');
});

test('resolveAccountForContact reuses a unique Account_Key match', async () => {
  const deps = { searchAccountsByKey: async () => [{ id: 'A9' }] };
  const r = await account.resolveAccountForContact({ contactAccountId: null, email: 'x@acme.com', company: 'Acme' }, deps);
  assert.deepStrictEqual(r, { status: 'reuse', accountId: 'A9' });
});

test('reconcileContact fails closed when ZOHO_PROCESS_CONTACT_URL is unset', async () => {
  // Loaded with the env unset (default in tests) → must reject before any network call.
  assert.strictEqual(process.env.ZOHO_PROCESS_CONTACT_URL, undefined);
  await assert.rejects(() => zoho.reconcileContact('C1'), /reconcile_not_configured/);
});

test('isBusinessEmail accepts work domains (incl. subdomains) and rejects free/personal/disposable', () => {
  assert.strictEqual(isBusinessEmail('alex@acme.com'), true);
  assert.strictEqual(isBusinessEmail('alex@mail.acme.co.uk'), true); // work subdomain
  for (const bad of ['x@gmail.com', 'x@hotmail.com', 'x@yahoo.co.uk', 'x@outlook.com', 'x@icloud.com', 'x@aol.com', 'x@mailinator.com']) {
    assert.strictEqual(isBusinessEmail(bad), false, `${bad} should be rejected`);
  }
  // Case / whitespace normalization and malformed input.
  assert.strictEqual(isBusinessEmail('X@GMAIL.COM '), false);
  assert.strictEqual(isBusinessEmail('no-at-sign'), false);
  assert.strictEqual(isBusinessEmail(''), false);
});

test('BLOCKED_EMAIL_DOMAINS env extends the blocklist at runtime', () => {
  assert.strictEqual(isBusinessEmail('x@partner.com'), true);
  process.env.BLOCKED_EMAIL_DOMAINS = 'partner.com, foo.com';
  try {
    assert.strictEqual(isBusinessEmail('x@partner.com'), false);
    assert.strictEqual(isBusinessEmail('x@foo.com'), false);
  } finally {
    delete process.env.BLOCKED_EMAIL_DOMAINS;
  }
});

test('all serverless handler modules load without MODULE_NOT_FOUND', () => {
  const handlers = [
    '../api/v1/availability.js',
    '../api/v1/submissions/start.js',
    '../api/v1/submissions/[id].js',
    '../api/v1/bookings/index.js',
    '../api/v1/bookings/[id]/index.js',
    '../api/v1/bookings/[id]/reschedule.js'
  ];
  for (const h of handlers) {
    const mod = require(path.join(__dirname, h));
    assert.strictEqual(typeof mod, 'function', `${h} should export a handler function`);
  }
});
