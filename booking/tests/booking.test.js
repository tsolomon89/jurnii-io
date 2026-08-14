const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const products = require('../api/_utils/products');
// Repointed to the new integration layer (api/_utils/{google,zoho}.js are deleted).
// Every behavioural requirement these tests cover is still valid, so they are adapted
// rather than replaced: writePayload, readConversion and extractMeetLink all carry the
// same contracts in the new modules.
const zoho = require('../integrations/zoho');
const google = require('../integrations/google');
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

// ---------------------------------------------------------------------------
// canonicalProductList — the page-2 product contract (§3)
// ---------------------------------------------------------------------------

test('canonicalProductList canonicalizes an array and preserves selection order', () => {
  const r = products.canonicalProductList(['Partnership', 'jurnii ux', 'Cortex / Growth']);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.products, ['Partnership', 'Jurnii UX', 'Jurnii Cortex']);
});

test('canonicalProductList still accepts the old scalar form', () => {
  // Transitional: a browser holding a snapshot from the single-select build sends this.
  const r = products.canonicalProductList('Jurnii 360');
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.products, ['Jurnii 360']);
});

test('canonicalProductList deduplicates on the canonical value, not the input string', () => {
  const r = products.canonicalProductList(['Jurnii Cortex', 'Cortex / Growth', 'jurnii cortex']);
  assert.deepStrictEqual(r.products, ['Jurnii Cortex'], 'three spellings, one product');
});

test('canonicalProductList strips blanks without treating them as errors', () => {
  const r = products.canonicalProductList(['', '   ', 'Jurnii UX', null, undefined]);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.products, ['Jurnii UX']);
});

test('canonicalProductList rejects a malformed body rather than coercing it', () => {
  // An object or array here means the caller sent something structurally wrong;
  // String()-ing it would produce "[object Object]" and a confusing 400.
  const r = products.canonicalProductList([{ value: 'Jurnii UX' }]);
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(r.products, []);
});

test('canonicalProductList rejects an unknown product rather than dropping it', () => {
  const r = products.canonicalProductList(['Jurnii UX', 'Jurnii Telepathy']);
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(r.rejected, ['Jurnii Telepathy']);
});

test('canonicalProductList never accepts a user-facing LABEL as a CRM value', () => {
  // The form shows this text; the value it submits is `Jurnii UX`. If the label ever
  // reached the endpoint it would be marketing copy written into the CRM.
  const r = products.canonicalProductList(['Jurnii UX — User Experience Benchmarking']);
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(r.products, []);
});

test('canonicalProductList treats "Not sure yet" as no product, not as an error', () => {
  const r = products.canonicalProductList(['Not sure yet']);
  assert.strictEqual(r.ok, true, 'the old sentinel must not 400 a returning browser');
  assert.deepStrictEqual(r.products, []);
  assert.deepStrictEqual(products.canonicalProductList([]).products, []);
  assert.deepStrictEqual(products.canonicalProductList(undefined).products, []);
});

test('productList and primaryProduct read the array, falling back to the legacy scalar', () => {
  assert.deepStrictEqual(products.productList({ product_interests: ['Jurnii UX', 'Partnership'] }),
    ['Jurnii UX', 'Partnership']);
  // A row written before migration 0004.
  assert.deepStrictEqual(products.productList({ product_interest: 'Jurnii 360' }), ['Jurnii 360']);
  assert.deepStrictEqual(products.productList({}), []);

  // First-selected resolves the single Deal a Meeting can link to.
  assert.strictEqual(products.primaryProduct({ product_interests: ['Partnership', 'Jurnii UX'] }),
    'Partnership');
  assert.strictEqual(products.primaryProduct({ product_interest: 'Jurnii 360' }), 'Jurnii 360',
    'a pre-0004 row resolves exactly the Deal it always did');
  assert.strictEqual(products.primaryProduct({}), null);
});

// ---------------------------------------------------------------------------
// governedTitle / canonicalLeadSource — gated on live picklist metadata (§2, §6)
// ---------------------------------------------------------------------------

test('governedTitle matches case-insensitively and returns Zoho’s casing', () => {
  assert.strictEqual(products.governedTitle('Head of Product'), 'Head of Product');
  assert.strictEqual(products.governedTitle('head of product'), 'Head of Product');
  assert.strictEqual(products.governedTitle('  HEAD OF PRODUCT  '), 'Head of Product');
});

test('governedTitle returns null for anything not in the live picklist', () => {
  // Including persona titles that are real but not governed — most of the 415 are not.
  assert.strictEqual(products.governedTitle('Chief Revenue Officer'), null);
  assert.strictEqual(products.governedTitle('Head of Widgets'), null);
  assert.strictEqual(products.governedTitle('Other'), null, 'the UI sentinel is not a title');
  assert.strictEqual(products.governedTitle(''), null);
  assert.strictEqual(products.governedTitle(null), null);
  assert.strictEqual(products.governedTitle('-None-'), null, 'the empty sentinel is not writable');
});

test('governedTitle resolves against the same picklist on Leads and Contacts', () => {
  assert.strictEqual(products.governedTitle('Head of Product', 'Contacts'), 'Head of Product');
  assert.strictEqual(products.governedTitle('Head of Widgets', 'Contacts'), null);
});

test('canonicalLeadSource accepts the stored value and rejects the display label', () => {
  assert.strictEqual(products.canonicalLeadSource('Website'), 'Website');
  assert.strictEqual(products.canonicalLeadSource('trade show'), 'Trade Show');
  // Zoho DISPLAYS `Trade Show` as "Trade Show / Event". Accepting a label would write a value
  // the picklist does not contain.
  assert.strictEqual(products.canonicalLeadSource('Event'), null);
  assert.strictEqual(products.canonicalLeadSource('Import'), null);
  assert.strictEqual(products.canonicalLeadSource('X (Twitter)'), null);
});

test('canonicalLeadSource rejects values sitting in Zoho’s unused bin', () => {
  // They exist on the field but a write to one is silently discarded.
  for (const binned of ['Cold Call', 'Partner', 'Web Research', 'Chat', 'Seminar Partner']) {
    assert.strictEqual(products.canonicalLeadSource(binned), null, `${binned} must not be accepted`);
  }
  assert.strictEqual(products.canonicalLeadSource('Definitely Not A Source'), null);
  assert.strictEqual(products.canonicalLeadSource(''), null);
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
