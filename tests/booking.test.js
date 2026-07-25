const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const products = require('../api/_utils/products');
const zoho = require('../api/_utils/zoho');
const google = require('../api/_utils/google');

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

test('validateLeadEnrichment (text mode, default) passes the job title through — never silently dropped', () => {
  const r = products.validateLeadEnrichment({
    company: 'Acme', jobTitle: 'Head of Product', phone: '+447', country: 'United Kingdom',
    product: 'Jurnii 360' // no mode / no allowlist
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.record.Company, 'Acme');
  assert.strictEqual(r.record.Phone, '+447');
  assert.deepStrictEqual(r.record.Product_Interest, ['Jurnii 360']);
  assert.strictEqual(r.record.Country, 'United Kingdom');
  assert.strictEqual(r.record.Job_Title, 'Head of Product'); // carried into the terminal update
});

test('validateLeadEnrichment (picklist mode) fails an unlisted title instead of dropping it', () => {
  const bad = products.validateLeadEnrichment({
    company: 'Acme', jobTitle: 'Wizard', jobTitleMode: 'picklist', allowedTitles: ['Head of Product']
  });
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.reason, 'job_title_not_allowed');

  // Missing allowlist in picklist mode also fails loudly (never a silent drop).
  const noAllow = products.validateLeadEnrichment({
    company: 'Acme', jobTitle: 'Head of Product', jobTitleMode: 'picklist', allowedTitles: []
  });
  assert.strictEqual(noAllow.ok, false);

  const good = products.validateLeadEnrichment({
    company: 'Acme', jobTitle: 'Head of Product', jobTitleMode: 'picklist', allowedTitles: ['Head of Product']
  });
  assert.strictEqual(good.ok, true);
  assert.strictEqual(good.record.Job_Title, 'Head of Product');
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
