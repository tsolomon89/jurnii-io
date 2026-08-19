'use strict';

/**
 * ⚠ THIS FILE PINS CURRENT (SUPERSEDED) BEHAVIOUR.
 *   Authority: zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md
 *
 *   The approved model is one Account -> zero or one persistent Deal, with Products entering as
 *   Quotes. Under it, the entire "remaining Product Deals" block these tests pin
 *   (handleMeetingEvent.deluge ~458-596) is deleted — one Deal means no anchor-selection problem.
 *
 *   THESE ASSERTIONS ARE EXPECTED TO FAIL when the model is corrected. That failure is the
 *   intended signal. Invert them into the §14 acceptance guards; do NOT delete them. There is
 *   currently no test anywhere in the repo asserting the prohibited architecture is ABSENT.
 *
 * §8 — reconciling the Product Deals a multi-product booking selected beyond its anchor.
 *
 * A Deal is Account x Product, but a Zoho Event has exactly ONE native `What_Id`. So a
 * multi-product booking still produces ONE Google event and ONE Zoho Meeting, anchored on
 * one Product Deal, with the full scope carried in `Meeting_Task_Contract_Products`.
 * `handleMeetingEvent` reconciles the rest after the Contact transition.
 *
 * Deluge cannot be executed here, so this pins the behaviour two ways, as
 * `deluge-reminder-rule.test.js` does:
 *
 *   1. STRUCTURAL — the block exists, sits after the Contact transition, resolves Deals
 *      EXACTLY, and cannot fail a confirmed booking. These are what stop a later edit
 *      quietly reintroducing a guess or a stage write.
 *   2. BEHAVIOURAL — a JS reference of the decision table, exercised over every required
 *      scenario. A disagreement between the Deluge and this table is a visible failure
 *      rather than a silent production surprise.
 *
 * What neither layer can prove is that the LIVE workflow behaves this way. Contact and
 * Deal stage propagation is only observable in the tenant, and it stays on the live
 * verification list — a source assertion is not a behavioural one.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SRC_PATH = path.join(__dirname, '..', '..', 'zoho-functions', 'v6', 'activity', 'handleMeetingEvent.deluge');
const noDeluge = fs.existsSync(SRC_PATH) ? false : 'handleMeetingEvent.deluge is not present';
const SRC = noDeluge ? '' : fs.readFileSync(SRC_PATH, 'utf8');

/** The reconcile block only, so an assertion cannot be satisfied by unrelated code. */
function block() {
  const start = SRC.indexOf('remainingKeys = List();');
  assert.notStrictEqual(start, -1, 'the multi-product reconcile block is missing');
  return SRC.slice(start);
}

/**
 * The block with its comments removed. A comment must stay free to NAME the thing it
 * forbids — the lookup is documented as "no substring matching on Deal_Name", and a
 * naive search would read that explanation as the offence.
 *
 * This org's Deluge uses both `//` and a leading backslash as line-comment markers.
 */
const codeOnly = () => block().split('\n')
  .filter((l) => !/^\s*(\/\/|\\)/.test(l)).join('\n');

// ---------------------------------------------------------------------------
// 1. Structural
// ---------------------------------------------------------------------------

test('the block runs AFTER the Contact transition', { skip: noDeluge }, () => {
  // The remaining Deals derive their stage from a Contact that has already moved, so
  // ordering is load-bearing, not cosmetic.
  const routed = SRC.indexOf('"meeting:created"');
  const reconcile = SRC.indexOf('remainingKeys = List();');
  assert.notStrictEqual(routed, -1, 'the first-booking routeContactSequence call is missing');
  assert.ok(reconcile > routed,
    'reconciling the other Deals before the Contact moves would roll up a stale stage');
});

test('WF007 still refuses any Event that is not related to a Deal', { skip: noDeluge }, () => {
  // The block must not have weakened the function's first guard.
  assert.match(SRC, /seModule\s*!=\s*"Deals"/,
    'the $se_module guard is the reason a half-linked Meeting cannot route anything');
  assert.ok(SRC.indexOf('seModule != "Deals"') < SRC.indexOf('remainingKeys = List();'));
});

test('Deals are resolved EXACTLY, by unique Deal_Key', { skip: noDeluge }, () => {
  const b = block();
  assert.match(b, /searchRecords\("Deals", "\(Deal_Key:equals:"/,
    'Deal_Key is UNIQUE, so an equals lookup is unambiguous by construction');
  assert.equal(/Deal_Name/.test(codeOnly()), false,
    'no substring matching on Deal_Name here — that is a guess, and guessing is forbidden');
  assert.match(b, /computeProductKey/, 'product names must be keyed through the shared normaliser');
});

test('the block never creates a Deal', { skip: noDeluge }, () => {
  const b = block();
  assert.equal(/createOrReuseProductDeal/.test(b), false,
    'a missing Product Deal raises a review; it is never conjured');
  assert.equal(/createRecord\("Deals"/.test(b), false);
});

test('the block never writes a Contact, Deal or Event field itself', { skip: noDeluge }, () => {
  const b = block();
  // processDeal owns every Deal field change, including never-regress and the RTP floor.
  assert.equal(/updateRecord\("Deals"/.test(b), false, 'processDeal owns Deal fields');
  assert.equal(/updateRecord\("Contacts"/.test(b), false, 'routeContactSequence owns Contact fields');
  // An Event write here would re-enter WF007 unless suppressed — and MTG-4 guards
  // terminal states, not this path.
  assert.equal(/updateRecord\("Events"/.test(b), false, 'an Event write would re-trigger WF007');
  assert.match(b, /automation\.processDeal\(rDealId, "\{\}"\)/,
    'the roll-up must delegate to processDeal with empty context, not commercial evidence');
});

test('a missing or ambiguous Deal raises the existing review codes and continues', { skip: noDeluge }, () => {
  const b = block();
  assert.match(b, /createManualReview\(contactId, "", "product_unresolved"/);
  assert.match(b, /createManualReview\(contactId, "", "duplicate_product_deal"/);
  // `continue`, never `return`: one unresolvable product must not abandon the others,
  // and must never fail a booking Google has already confirmed.
  assert.equal(/\breturn\s*;/.test(b), false,
    'a bare return here would abandon the remaining products and the rest of the function');
});

test('the review names the journey, account, contact and product', { skip: noDeluge }, () => {
  const b = block();
  assert.match(b, /Ext_Calendar_Booking_ID/, 'the review must carry the booking reference');
  for (const token of ['rDealKey', 'contactId', 'rName']) {
    assert.ok(b.includes(token), `the review detail omits ${token}`);
  }
});

test('Partnership is skipped before the lookup, with no review', { skip: noDeluge }, () => {
  const b = block();
  const gate = b.indexOf('pipelineForProductKey');
  const lookup = b.indexOf('searchRecords("Deals"');
  assert.notStrictEqual(gate, -1, 'the Partnership gate is missing');
  assert.ok(gate < lookup, 'Partnership must be skipped BEFORE a Deal lookup, not after');
  const partnershipBranch = b.slice(gate, lookup);
  assert.equal(/createManualReview/.test(partnershipBranch), false,
    'a Partnership Deal no B2B flow would touch must not raise a review');
});

test('a non-primary Contact is skipped without a review', { skip: noDeluge }, () => {
  const b = block();
  assert.match(b, /rPrimaryId != contactId/,
    'the Contact must be the Deal primary before its stage may move');
  assert.match(b, /non_primary_skipped/);
  const idx = b.indexOf('rPrimaryId != contactId');
  const branch = b.slice(idx, b.indexOf('processDeal(rDealId'));
  assert.equal(/createManualReview/.test(branch), false,
    'a non-primary Contact is a legitimate state, not a data error');
});

test('the anchor product is excluded, and the block exits before any CRM read', { skip: noDeluge }, () => {
  const b = block();
  assert.match(b, /Deal_Product_Key/, 'the anchor is excluded by its own Deal_Product_Key');
  const exit = b.indexOf('if(remainingKeys.size() > 0)');
  assert.notStrictEqual(exit, -1, 'the early exit is missing');
  const before = b.slice(0, exit);
  assert.equal(/getRecordById|searchRecords/.test(before), false,
    'a single-product save must cost WF007 no extra CRM read');
});

// ---------------------------------------------------------------------------
// 2. Behavioural — the decision table
// ---------------------------------------------------------------------------

/**
 * A JS reference of the Deluge block's decision table. It is the intended answer for
 * each scenario, written once so the cases below read as a specification.
 *
 * Returns `{ reconcile, review, skip }`, each an array of product keys.
 */
function decideRemaining({
  contractProducts = [], anchorKey = '', dealsByKey = {}, primaryByKey = {},
  contactId = 'C1', partnershipKeys = ['partnership'],
} = {}) {
  const out = { reconcile: [], review: [], skip: [] };

  const key = (name) => String(name || '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const remaining = [];
  for (const name of contractProducts) {
    const s = String(name || '').trim();
    if (!s || s === '-None-') continue;
    const k = key(s);
    if (!k || k === anchorKey || remaining.includes(k)) continue;
    remaining.push(k);
  }
  if (!remaining.length) return out;                       // single-product: a no-op

  for (const k of remaining) {
    if (partnershipKeys.includes(k)) { out.skip.push(k); continue; }   // before any lookup
    const matches = dealsByKey[k] || [];
    if (matches.length > 1) { out.review.push({ key: k, code: 'duplicate_product_deal' }); continue; }
    if (matches.length === 0) { out.review.push({ key: k, code: 'product_unresolved' }); continue; }
    if (primaryByKey[k] !== contactId) { out.skip.push(k); continue; } // legitimate, no review
    out.reconcile.push(k);
  }
  return out;
}

const CASES = [
  {
    name: 'one product: nothing beyond the anchor, so nothing happens',
    input: { contractProducts: ['Jurnii UX'], anchorKey: 'jurnii_ux' },
    expect: { reconcile: [], review: [], skip: [] },
  },
  {
    name: 'no product selected at all',
    input: { contractProducts: [], anchorKey: '' },
    expect: { reconcile: [], review: [], skip: [] },
  },
  {
    name: 'two products, primary Contact: the non-anchor Deal is reconciled',
    input: {
      contractProducts: ['Jurnii UX', 'Jurnii Cortex'], anchorKey: 'jurnii_ux',
      dealsByKey: { jurnii_cortex: ['D2'] }, primaryByKey: { jurnii_cortex: 'C1' },
    },
    expect: { reconcile: ['jurnii_cortex'], review: [], skip: [] },
  },
  {
    name: 'three products: every exact Deal with this Contact as primary is reconciled',
    input: {
      contractProducts: ['Jurnii UX', 'Jurnii 360', 'Jurnii Cortex'], anchorKey: 'jurnii_ux',
      dealsByKey: { jurnii_360: ['D2'], jurnii_cortex: ['D3'] },
      primaryByKey: { jurnii_360: 'C1', jurnii_cortex: 'C1' },
    },
    expect: { reconcile: ['jurnii_360', 'jurnii_cortex'], review: [], skip: [] },
  },
  {
    name: 'non-primary Contact: skipped, and NOT forced onto that Deal',
    input: {
      contractProducts: ['Jurnii UX', 'Jurnii Cortex'], anchorKey: 'jurnii_ux',
      dealsByKey: { jurnii_cortex: ['D2'] }, primaryByKey: { jurnii_cortex: 'C9' },
    },
    expect: { reconcile: [], review: [], skip: ['jurnii_cortex'] },
  },
  {
    name: 'missing Deal: review, and the other products still reconcile',
    input: {
      contractProducts: ['Jurnii UX', 'Jurnii 360', 'Jurnii Cortex'], anchorKey: 'jurnii_ux',
      dealsByKey: { jurnii_cortex: ['D3'] }, primaryByKey: { jurnii_cortex: 'C1' },
    },
    expect: {
      reconcile: ['jurnii_cortex'],
      review: [{ key: 'jurnii_360', code: 'product_unresolved' }], skip: [],
    },
  },
  {
    name: 'ambiguous Deal: review, never a guess',
    input: {
      contractProducts: ['Jurnii UX', 'Jurnii Cortex'], anchorKey: 'jurnii_ux',
      dealsByKey: { jurnii_cortex: ['D2', 'D3'] }, primaryByKey: { jurnii_cortex: 'C1' },
    },
    expect: {
      reconcile: [], review: [{ key: 'jurnii_cortex', code: 'duplicate_product_deal' }], skip: [],
    },
  },
  {
    name: 'Partnership alongside B2B: skipped before any lookup, no review',
    input: {
      contractProducts: ['Jurnii UX', 'Partnership'], anchorKey: 'jurnii_ux',
      dealsByKey: {}, primaryByKey: {},
    },
    expect: { reconcile: [], review: [], skip: ['partnership'] },
  },
  {
    name: 'Partnership-only booking: it IS the anchor, so nothing remains',
    input: { contractProducts: ['Partnership'], anchorKey: 'partnership' },
    expect: { reconcile: [], review: [], skip: [] },
  },
  {
    name: 'blanks and the -None- sentinel are not products',
    input: {
      contractProducts: ['Jurnii UX', '', '-None-', null], anchorKey: 'jurnii_ux',
    },
    expect: { reconcile: [], review: [], skip: [] },
  },
];

for (const c of CASES) {
  test(`decision table: ${c.name}`, () => {
    assert.deepStrictEqual(decideRemaining(c.input), c.expect);
  });
}

test('re-running on the same meeting produces the identical outcome', () => {
  // WF007 fires on every Event save, so this block re-enters on a rep's own edits. It
  // must be inherently repeatable — processDeal never regresses a stage, and
  // createManualReview dedups on its leading [code] token.
  const input = {
    contractProducts: ['Jurnii UX', 'Jurnii 360', 'Jurnii Cortex'], anchorKey: 'jurnii_ux',
    dealsByKey: { jurnii_cortex: ['D3'] }, primaryByKey: { jurnii_cortex: 'C1' },
  };
  assert.deepStrictEqual(decideRemaining(input), decideRemaining(input));
});

test('the anchor product is never reconciled twice', () => {
  // routeContactSequence already reconciled it. Doing it again here would be harmless
  // but wasteful, and would muddy the automation log.
  const r = decideRemaining({
    contractProducts: ['Jurnii UX', 'Jurnii UX', 'Jurnii Cortex'], anchorKey: 'jurnii_ux',
    dealsByKey: { jurnii_cortex: ['D2'] }, primaryByKey: { jurnii_cortex: 'C1' },
  });
  assert.deepStrictEqual(r.reconcile, ['jurnii_cortex']);
});
