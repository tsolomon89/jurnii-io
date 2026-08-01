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
