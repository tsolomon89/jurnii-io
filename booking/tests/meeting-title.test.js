// Offline. Pure functions only — no network, no database, no Zoho.
//
// This file is the safety net for the ONE meeting title. Its job is to pin the exact
// strings that reach a visitor's inbox subject line and Zoho's `Event_Title`, and to
// prove the two can never be built differently.

const test = require('node:test');
const assert = require('node:assert/strict');

const P = require('../api/_utils/products');
const T = require('../api/_utils/meeting-title');
const J = require('../db/queries/journeys');

const row = (over = {}) => ({
  first_name: 'Sarah', last_name: 'Chen', company: 'BetCo',
  product_interests: ['Jurnii UX'], ...over,
});

// ---------------------------------------------------------------------------
// PRODUCT_ORDER / orderedProducts / anchorProduct
// ---------------------------------------------------------------------------

test('PRODUCT_ORDER is the canonical set, with Partnership last', () => {
  assert.deepStrictEqual(
    new Set(P.PRODUCT_ORDER), new Set(Object.values(P.PRODUCT_CANONICAL)),
    'the display order must cover exactly the canonical products, no more and no fewer');
  // Partnership being last IS the "prefer a B2B Deal" rule — anchorProduct takes the
  // first entry, so there is no second predicate. Moving it would silently change
  // which Deal a mixed booking anchors to.
  assert.strictEqual(P.PRODUCT_ORDER[P.PRODUCT_ORDER.length - 1], 'Partnership');
});

test('orderedProducts canonicalizes, dedupes and sorts into PRODUCT_ORDER', () => {
  assert.deepStrictEqual(P.orderedProducts(row({ product_interests: ['Jurnii Cortex', 'Jurnii UX'] })),
    ['Jurnii UX', 'Jurnii Cortex']);
  assert.deepStrictEqual(P.orderedProducts(row({ product_interests: ['jurnii ux', 'Jurnii UX'] })),
    ['Jurnii UX'], 'deduplicated on the canonical form');
  assert.deepStrictEqual(P.orderedProducts(row({ product_interests: ['cortex / growth'] })),
    ['Jurnii Cortex'], 'legacy input spelling still resolves');
  assert.deepStrictEqual(P.orderedProducts(row({ product_interests: ['Not sure yet'] })), []);
  assert.deepStrictEqual(
    P.orderedProducts(row({ product_interests: ['Jurnii UX — User Experience Benchmarking'] })),
    [], 'a marketing LABEL is not a product and is dropped, never rendered');
  assert.deepStrictEqual(P.orderedProducts(row({ product_interests: [], product_interest: 'Jurnii 360' })),
    ['Jurnii 360'], 'the legacy scalar column is still read');
});

test('orderedProducts does not mutate the stored tick order', () => {
  const stored = ['Jurnii Cortex', 'Jurnii UX'];
  const j = row({ product_interests: stored });
  P.orderedProducts(j);
  assert.deepStrictEqual(stored, ['Jurnii Cortex', 'Jurnii UX']);
  assert.strictEqual(P.primaryProduct(j), 'Jurnii Cortex', 'primaryProduct still sees tick order');
});

test('anchorProduct equals primaryProduct for every single-product journey', () => {
  // The no-op proof: switching the Deal anchor from tick order to canonical order
  // cannot change the answer for a one-product booking, whatever the product is.
  for (const p of P.PRODUCT_ORDER) {
    const j = row({ product_interests: [p] });
    assert.strictEqual(P.anchorProduct(j), P.primaryProduct(j), `single product: ${p}`);
  }
});

test('anchorProduct prefers B2B over Partnership and canonical order over tick order', () => {
  assert.strictEqual(P.anchorProduct(row({ product_interests: ['Partnership', 'Jurnii Cortex'] })),
    'Jurnii Cortex', 'a B2B product wins even when Partnership was ticked first');
  assert.strictEqual(P.anchorProduct(row({ product_interests: ['Jurnii Cortex', 'Jurnii UX'] })),
    'Jurnii UX');
  assert.strictEqual(P.anchorProduct(row({ product_interests: ['Partnership'] })), 'Partnership',
    'Partnership-only still anchors on its own Deal');
  assert.strictEqual(P.anchorProduct(row({ product_interests: [] })), null);
});

// ---------------------------------------------------------------------------
// Title generation
// ---------------------------------------------------------------------------

test('one product', () => {
  assert.strictEqual(T.meetingTitleFor(row()), 'Jurnii | BetCo - Sarah | Jurnii UX');
});

test('multiple products join with " + " in canonical order', () => {
  assert.strictEqual(T.meetingTitleFor(row({ product_interests: ['Jurnii UX', 'Jurnii Cortex'] })),
    'Jurnii | BetCo - Sarah | Jurnii UX + Jurnii Cortex');
});

test('tick order and canonical order produce the SAME title', () => {
  const a = T.meetingTitleFor(row({ product_interests: ['Jurnii Cortex', 'Jurnii UX'] }));
  const b = T.meetingTitleFor(row({ product_interests: ['Jurnii UX', 'Jurnii Cortex'] }));
  assert.strictEqual(a, b);
  assert.strictEqual(a, 'Jurnii | BetCo - Sarah | Jurnii UX + Jurnii Cortex');
});

test('Partnership', () => {
  assert.strictEqual(T.meetingTitleFor(row({ product_interests: ['Partnership'] })),
    'Jurnii | BetCo - Sarah | Partnership');
});

test('no selected product -> Product Discovery', () => {
  for (const products of [[], undefined, null, ['Not sure yet'], ['']]) {
    assert.strictEqual(T.meetingTitleFor(row({ product_interests: products })),
      'Jurnii | BetCo - Sarah | Product Discovery', `products: ${JSON.stringify(products)}`);
  }
  assert.strictEqual(T.meetingTitleFor(row({ product_interests: [], product_interest: 'Not sure yet' })),
    'Jurnii | BetCo - Sarah | Product Discovery', 'the legacy scalar sentinel too');
});

test('"Not sure yet" never appears in a title, whatever shape it arrives in', () => {
  const shapes = [
    ['Not sure yet'], ['not sure yet'], ['  Not Sure Yet  '], ['Not sure yet', 'Jurnii UX'],
    ['Jurnii UX', 'Not sure yet'],
  ];
  for (const product_interests of shapes) {
    const title = T.meetingTitleFor(row({ product_interests }));
    assert.ok(!/not sure yet/i.test(title), `leaked into: ${title}`);
  }
  assert.ok(!/not sure yet/i.test(T.meetingTitleFor(row({
    product_interests: [], product_interest: 'Not sure yet',
  }))));
});

test('degradation when company or first name is missing', () => {
  assert.strictEqual(T.meetingTitleFor(row({ first_name: null })), 'Jurnii | BetCo | Jurnii UX');
  assert.strictEqual(T.meetingTitleFor(row({ company: null })), 'Jurnii | Sarah | Jurnii UX');
  assert.strictEqual(T.meetingTitleFor(row({ company: '   ', first_name: '' })),
    'Jurnii | Jurnii UX');
  assert.strictEqual(T.meetingTitleFor(row({ company: null, first_name: null, product_interests: [] })),
    'Jurnii | Product Discovery');
});

test('never returns an empty string', () => {
  const inputs = [
    {}, { company: '' }, { firstName: '' }, { products: '' },
    { company: null, firstName: null, products: null },
    { company: '\n\n', firstName: '\t', products: '   ' },
  ];
  for (const i of inputs) {
    assert.ok(T.buildMeetingTitle(i).length > 0, `empty for ${JSON.stringify(i)}`);
  }
  assert.ok(T.buildMeetingTitle().length > 0, 'called with no argument at all');
  assert.ok(T.meetingTitleFor({}).length > 0);
  assert.ok(T.meetingTitleFor().length > 0);
});

test('deterministic — the same row twice gives the identical string', () => {
  const j = row({ product_interests: ['Jurnii 360', 'Partnership'] });
  assert.strictEqual(T.meetingTitleFor(j), T.meetingTitleFor(j));
});

test('a persisted meeting_title wins over any recomputation', () => {
  // This is what makes "Google and Zoho send the same string" true across a later data
  // edit, and what makes a reschedule keep the original title.
  const j = row({ meeting_title: 'Jurnii | OldCo - Sam | Jurnii 360', company: 'NewCo' });
  assert.strictEqual(T.meetingTitleFor(j), 'Jurnii | OldCo - Sam | Jurnii 360');
});

// ---------------------------------------------------------------------------
// Sanitisation and truncation
// ---------------------------------------------------------------------------

test('whitespace is collapsed and trimmed', () => {
  assert.strictEqual(T.meetingTitleFor(row({ company: '  Bet   Co \n\tLtd ' })),
    'Jurnii | Bet Co Ltd - Sarah | Jurnii UX');
  const nbsp = String.fromCharCode(0xa0);
  assert.strictEqual(T.sanitizeTitlePart(`a${nbsp}${nbsp}b`), 'a b', 'NBSP collapses too');
});

test('line breaks become a space, never a join', () => {
  assert.strictEqual(T.sanitizeTitlePart('Bet\n\nCo'), 'Bet Co');
  assert.strictEqual(T.sanitizeTitlePart('Bet\r\nCo'), 'Bet Co');
});

test('control characters are removed from the title', () => {
  const dirty = `Bet${String.fromCharCode(0)}Co${String.fromCharCode(7)} Ltd`;
  const title = T.meetingTitleFor(row({ company: dirty }));
  for (const ch of title) {
    const c = ch.codePointAt(0);
    assert.ok(!(c < 0x20 || (c >= 0x7f && c <= 0x9f)), `control char survived: U+${c.toString(16)}`);
  }
  assert.strictEqual(title, 'Jurnii | Bet Co Ltd - Sarah | Jurnii UX');
});

test('a literal pipe in a value does not counterfeit a separator', () => {
  assert.strictEqual(T.meetingTitleFor(row({ company: 'Bet|Co' })),
    'Jurnii | Bet/Co - Sarah | Jurnii UX');
});

test('a long company is truncated, and the contact and products survive', () => {
  const title = T.meetingTitleFor(row({
    company: 'C'.repeat(300),
    first_name: 'S'.repeat(40),
    product_interests: ['Jurnii UX', 'Jurnii 360', 'Jurnii Cortex', 'Partnership'],
  }));
  assert.ok(title.length <= T.EVENT_TITLE_MAX, `title was ${title.length} chars`);
  assert.ok(title.includes(` - ${'S'.repeat(40)} | `), 'the contact segment must not be sacrificed');
  assert.ok(title.endsWith('Jurnii UX + Jurnii 360 + Jurnii Cortex + Partnership'),
    'the full product context must not be sacrificed');
  assert.ok(title.startsWith('Jurnii | CCC'), 'the company is what absorbs the loss');
});

test('the 255 cap holds at the realistic worst case', () => {
  // V.LIMITS.company is 200 and V.LIMITS.first_name is 80 — the widest a validated
  // page-2 submission can be.
  const title = T.buildMeetingTitle({
    company: 'C'.repeat(200),
    firstName: 'S'.repeat(80),
    products: 'Jurnii UX + Jurnii 360 + Jurnii Cortex + Partnership',
  });
  assert.ok(title.length <= T.EVENT_TITLE_MAX, `title was ${title.length} chars`);
  assert.ok(title.includes('Jurnii UX + Jurnii 360 + Jurnii Cortex + Partnership'));
});

test('a truncated company does not end in dangling punctuation', () => {
  // No first name, so the company segment is followed directly by the ` | ` separator
  // and the cut point is exactly computable: 255 - 6 (brand) - 3 - 3 - 52 (products).
  const products = 'Jurnii UX + Jurnii 360 + Jurnii Cortex + Partnership';
  const budget = 255 - 'Jurnii'.length - 3 - 3 - products.length;
  const company = `${'C'.repeat(budget - 1)},${'X'.repeat(50)}`;   // the cut lands on the comma
  const title = T.buildMeetingTitle({ company, products });

  assert.strictEqual(title, `Jurnii | ${'C'.repeat(budget - 1)} | ${products}`);
  assert.ok(!title.includes(', |'), `dangling punctuation before a separator: ${title}`);
});

test('a first name past FIRST_NAME_MAX is capped rather than eating the company', () => {
  const title = T.buildMeetingTitle({
    company: 'BetCo', firstName: 'S'.repeat(200), products: 'Jurnii UX',
  });
  assert.ok(title.includes('BetCo - '), 'the company survives a runaway first name');
  assert.ok(title.includes(`- ${'S'.repeat(T.FIRST_NAME_MAX)} |`));
});

// ---------------------------------------------------------------------------
// productsLabel / contactFullName — shared by both event descriptions
// ---------------------------------------------------------------------------

test('productsLabel matches what the title renders', () => {
  const j = row({ product_interests: ['Jurnii Cortex', 'Jurnii UX'] });
  assert.strictEqual(T.productsLabel(j), 'Jurnii UX + Jurnii Cortex');
  assert.ok(T.meetingTitleFor(j).endsWith(T.productsLabel(j)),
    'the description and the title can never disagree about the selection');
  assert.strictEqual(T.productsLabel(row({ product_interests: [] })), 'Product Discovery');
});

test('contactFullName sanitizes and tolerates a missing half', () => {
  assert.strictEqual(T.contactFullName(row()), 'Sarah Chen');
  assert.strictEqual(T.contactFullName(row({ last_name: null })), 'Sarah');
  assert.strictEqual(T.contactFullName(row({ first_name: null })), 'Chen');
  assert.strictEqual(T.contactFullName({}), '');
  assert.strictEqual(T.contactFullName(row({ first_name: 'Sa\nrah' })), 'Sa rah Chen');
});

// ---------------------------------------------------------------------------
// The title is structurally unwritable by any step that could change it
// ---------------------------------------------------------------------------

test('no allow-list can name meeting_title or meeting_anchor_product', () => {
  // The guarantee behind "a reschedule changes the times, not the title": a Google or
  // Zoho step cannot name the column, so `buildSet` throws rather than updating it.
  // This is structural, not a matter of caller discipline.
  for (const col of ['meeting_title', 'meeting_anchor_product']) {
    assert.strictEqual(J.GOOGLE_COLUMNS.has(col), false, `GOOGLE_COLUMNS must not allow ${col}`);
    assert.strictEqual(J.ZOHO_COLUMNS.has(col), false, `ZOHO_COLUMNS must not allow ${col}`);
    assert.strictEqual(J.PAGE2_COLUMNS.has(col), false,
      `${col} is DERIVED at R1, never accepted from the page-2 body`);
  }
});
