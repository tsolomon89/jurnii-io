'use strict';

/**
 * §6 — server-derived journey columns, against real Postgres.
 *
 * REGRESSION: the retained Production E2E (journey c3a9b7d7…, 2026-08-02) committed
 * `marketing_consent = true` with `marketing_consent_at = NULL` and `email_domain =
 * NULL`. `upsertPage1` stamped the consent timestamp only on its ON CONFLICT branch,
 * so a journey that consented on its FIRST submission — the normal case — never got
 * one, and nothing derived the domain at all.
 *
 * Both values are provenance and must be derived from server state only: a
 * client-supplied domain decides Account resolution downstream, and a client-supplied
 * timestamp is attacker-chosen evidence of when consent was given.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const db = require('../../db');
const J = require('../../db/queries/journeys');
const { track, purgeTracked } = require('./_fixtures');

const skip = db.isConfigured() ? false : 'DATABASE_URL not set';

// `booking_journeys.email_normalized` is UNIQUE, so each journey needs its own address.
// The mixed case is deliberate: it proves the domain is derived from the NORMALISED
// value rather than echoed from the raw input.
let seq = 0;
const page1 = (over = {}) => {
  const local = `derive.test.${process.pid}.${seq += 1}`;
  return {
    email: `${local}@Sub.Example.CO`,
    email_normalized: `${local}@sub.example.co`,
    first_name: 'D',
    last_name: 'T',
    marketing_consent: false,
    ...over,
  };
};

// Every journey this file creates is tracked and removed, so the suite is safe to run
// against a real database and leaves the row count exactly as it found it. The rule now
// lives in `_fixtures.js` so all seven files share it — see the note there on why a
// leftover journey is not inert.
async function fresh(fields) {
  const id = track(crypto.randomUUID());
  const row = await db.withTransaction((tx) => J.upsertPage1(tx, id, fields));
  return { id, row };
}

test.after(async () => { await purgeTracked(); });

test('INSERT derives email_domain from the normalised email', { skip }, async () => {
  const { row } = await fresh(page1());
  assert.strictEqual(row.email_domain, 'sub.example.co');
});

test('INSERT stamps marketing_consent_at when consent is true', { skip }, async () => {
  const before = Date.now() - 1000;
  const { row } = await fresh(page1({ marketing_consent: true }));
  assert.strictEqual(row.marketing_consent, true);
  assert.ok(row.marketing_consent_at, 'timestamp must be stamped on the INSERT path');
  assert.ok(row.marketing_consent_at.getTime() >= before);
});

test('INSERT leaves marketing_consent_at null when consent is false', { skip }, async () => {
  const { row } = await fresh(page1({ marketing_consent: false }));
  assert.strictEqual(row.marketing_consent, false);
  assert.strictEqual(row.marketing_consent_at, null);
});

test('a client-supplied email_domain or consent timestamp is ignored', { skip }, async () => {
  const forged = new Date('2000-01-01T00:00:00Z');
  const { row } = await fresh(page1({
    marketing_consent: true,
    email_domain: 'attacker-controlled.example',
    marketing_consent_at: forged,
  }));
  assert.strictEqual(row.email_domain, 'sub.example.co');
  assert.notStrictEqual(row.marketing_consent_at.getTime(), forged.getTime());
});

test('a retry of the same journey preserves the first consent timestamp', { skip }, async () => {
  const id = track(crypto.randomUUID());
  const f = page1({ marketing_consent: true });
  const first = await db.withTransaction((tx) => J.upsertPage1(tx, id, f));
  await new Promise((r) => setTimeout(r, 20));
  const again = await db.withTransaction((tx) => J.upsertPage1(tx, id, f));
  assert.strictEqual(again.marketing_consent_at.getTime(), first.marketing_consent_at.getTime(),
    'first-write semantics: the original stamp must survive a retry');
  assert.strictEqual(again.email_domain, 'sub.example.co');
});

test('false -> true on a retry stamps the timestamp', { skip }, async () => {
  const id = track(crypto.randomUUID());
  const f = page1({ marketing_consent: false });
  const first = await db.withTransaction((tx) => J.upsertPage1(tx, id, f));
  assert.strictEqual(first.marketing_consent_at, null);
  const second = await db.withTransaction((tx) => J.upsertPage1(tx, id, { ...f, marketing_consent: true }));
  assert.strictEqual(second.marketing_consent, true);
  assert.ok(second.marketing_consent_at, 'the false -> true transition must stamp');
});

test('true -> false on a retry never clears the existing timestamp', { skip }, async () => {
  const id = track(crypto.randomUUID());
  const f = page1({ marketing_consent: true });
  const first = await db.withTransaction((tx) => J.upsertPage1(tx, id, f));
  const second = await db.withTransaction((tx) => J.upsertPage1(tx, id, { ...f, marketing_consent: false }));
  assert.strictEqual(second.marketing_consent, false);
  assert.ok(second.marketing_consent_at, 'the consent timestamp is history and is never cleared');
  assert.strictEqual(second.marketing_consent_at.getTime(), first.marketing_consent_at.getTime());
});

test('an email with no domain stores NULL, not an empty string', { skip }, async () => {
  const { row } = await fresh(page1({ email: 'nodomain', email_normalized: 'nodomain' }));
  assert.strictEqual(row.email_domain, null);
});

// ---------------------------------------------------------------------------
// R1 — the meeting title and the Deal anchor
//
// Both are derived on the same principle as email_domain above. A client-supplied title
// would decide what the visitor sees in their calendar invite and what a rep sees in the
// CRM; a client-supplied anchor would decide which Deal the automation advances.
// ---------------------------------------------------------------------------

const page2 = (over = {}) => ({
  company: 'BetCo',
  country_iso2: 'GB', country_name: 'United Kingdom',
  phone_dial_code: '+44', phone_national_number: '7123456789', phone_e164: '+447123456789',
  product_interests: ['Jurnii UX'],
  ...over,
});

/** A page-1 journey with a known first name, then a page-2 commit. */
async function committed(p2, p1 = {}) {
  const { id } = await fresh(page1({ first_name: 'Sarah', last_name: 'Chen', ...p1 }));
  const row = await db.withTransaction((tx) => J.R1_page2Commit(tx, id, page2(p2)));
  return { id, row };
}

test('R1 derives the title from the MERGED page-1 + page-2 snapshot', { skip }, async () => {
  // `first_name` was written on page 1; `company` and the products arrive in this patch.
  // A builder that saw only the patch would produce "Jurnii | BetCo | Jurnii UX".
  const { row } = await committed();
  assert.strictEqual(row.meeting_title, 'Jurnii | BetCo - Sarah | Jurnii UX');
});

test('R1 derives the title for every product shape', { skip }, async () => {
  const cases = [
    [['Jurnii UX', 'Jurnii Cortex'], 'Jurnii | BetCo - Sarah | Jurnii UX + Jurnii Cortex'],
    [['Jurnii Cortex', 'Jurnii UX'], 'Jurnii | BetCo - Sarah | Jurnii UX + Jurnii Cortex'],
    [['Partnership'], 'Jurnii | BetCo - Sarah | Partnership'],
    [[], 'Jurnii | BetCo - Sarah | Product Discovery'],
  ];
  for (const [product_interests, expected] of cases) {
    const { row } = await committed({ product_interests });
    assert.strictEqual(row.meeting_title, expected, JSON.stringify(product_interests));
  }
});

test('R1 derives the Deal anchor in canonical order, preferring B2B', { skip }, async () => {
  const one = await committed({ product_interests: ['Jurnii UX'] });
  assert.strictEqual(one.row.meeting_anchor_product, 'Jurnii UX');

  // Tick order says Partnership; canonical order says the B2B Deal is the anchor.
  const mixed = await committed({ product_interests: ['Partnership', 'Jurnii Cortex'] });
  assert.strictEqual(mixed.row.meeting_anchor_product, 'Jurnii Cortex');
  assert.deepStrictEqual(mixed.row.product_interests, ['Partnership', 'Jurnii Cortex'],
    'the stored tick order is never reordered — it is load-bearing for primaryProduct');

  const none = await committed({ product_interests: [] });
  assert.strictEqual(none.row.meeting_anchor_product, null);
});

test('a single-product journey anchors exactly as it did before', { skip }, async () => {
  // The no-op guarantee, against real Postgres rather than in the abstract.
  const { primaryProduct } = require('../../api/_utils/products');
  for (const p of ['Jurnii UX', 'Jurnii 360', 'Jurnii Cortex', 'Partnership']) {
    const { row } = await committed({ product_interests: [p] });
    assert.strictEqual(row.meeting_anchor_product, primaryProduct(row), `single product: ${p}`);
  }
});

test('a client-supplied meeting title is REFUSED, not ignored', { skip }, async () => {
  const { id } = await fresh(page1());
  await assert.rejects(
    () => db.withTransaction((tx) => J.R1_page2Commit(tx, id,
      page2({ meeting_title: 'Jurnii | Attacker - Eve | Jurnii UX' }))),
    /column not permitted on the page-2 path: meeting_title/,
    'the column is absent from PAGE2_COLUMNS, so the guard throws rather than stripping');

  await assert.rejects(
    () => db.withTransaction((tx) => J.R1_page2Commit(tx, id,
      page2({ meeting_anchor_product: 'Partnership' }))),
    /column not permitted on the page-2 path: meeting_anchor_product/);
});

test('a corrected page-2 submission recomputes both derived values', { skip }, async () => {
  const { id, row } = await committed();
  assert.strictEqual(row.meeting_title, 'Jurnii | BetCo - Sarah | Jurnii UX');

  // Safe by construction: R1 admits only draft/reserved/booking_failed, all of which
  // precede confirmation, so this can never retitle a live calendar event.
  const again = await db.withTransaction((tx) => J.R1_page2Commit(tx, id,
    page2({ company: 'BetCo Group', product_interests: ['Partnership', 'Jurnii 360'] })));
  assert.strictEqual(again.meeting_title, 'Jurnii | BetCo Group - Sarah | Jurnii 360 + Partnership');
  assert.strictEqual(again.meeting_anchor_product, 'Jurnii 360');
});

test('the title is sanitised and fits the live Event_Title length', { skip }, async () => {
  const { row } = await committed({ company: `  Bet\n\tCo   Ltd ` });
  assert.strictEqual(row.meeting_title, 'Jurnii | Bet Co Ltd - Sarah | Jurnii UX');

  const long = await committed({ company: 'C'.repeat(200) });
  assert.ok(long.row.meeting_title.length <= 255, 'the CHECK constraint would reject a longer one');
  assert.ok(long.row.meeting_title.endsWith(' - Sarah | Jurnii UX'),
    'the company absorbs the truncation, never the contact or the products');
});

test('no Google or Zoho step can rewrite the title', { skip }, async () => {
  // The guarantee behind "a reschedule changes the times, not the title". Structural:
  // the allow-lists cannot name the column, so `buildSet` throws before any SQL runs.
  const { id } = await fresh(page1());
  await assert.rejects(
    () => db.withTransaction((tx) => J.patchGoogle(tx, id, { meeting_title: 'x' })),
    /google_step_may_not_write:meeting_title/);
  await assert.rejects(
    () => db.withTransaction((tx) => J.patchZoho(tx, id, { meeting_anchor_product: 'Partnership' })),
    /zoho_step_may_not_write:meeting_anchor_product/);
});

test.after(async () => { await db.close().catch(() => {}); });
