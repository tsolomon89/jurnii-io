const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const products = require('../api/_utils/products');
const zoho = require('../api/_utils/zoho');

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
