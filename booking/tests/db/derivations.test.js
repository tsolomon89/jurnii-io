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
// against a real database and leaves the row count exactly as it found it.
const created = new Set();
const track = (id) => { created.add(id); return id; };

async function fresh(fields) {
  const id = track(crypto.randomUUID());
  const row = await db.withTransaction((tx) => J.upsertPage1(tx, id, fields));
  return { id, row };
}

test.after(async () => {
  for (const id of created) {
    await db.withTransaction((tx) =>
      tx.query('DELETE FROM booking_journeys WHERE journey_id = $1', [id])).catch(() => {});
  }
});

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

test.after(async () => { await db.close().catch(() => {}); });
