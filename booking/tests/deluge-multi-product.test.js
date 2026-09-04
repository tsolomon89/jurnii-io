'use strict';

/**
 * §8 — multi-product bookings under the APPROVED commercial model.
 *
 * Authority: zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md
 *
 * ⚠ THIS FILE WAS INVERTED (work item 4.3). It previously pinned the SUPERSEDED behaviour —
 * the "remaining Product Deals" block in handleMeetingEvent that resolved one Deal per
 * additional Product on a multi-product booking. Its own header said those assertions were
 * expected to fail when the model was corrected, that the failure was the intended signal,
 * and that they should be INVERTED into acceptance guards rather than deleted, because
 * nothing in the repo asserted the prohibited architecture was ABSENT.
 *
 * That is what this file now does. The approved model is:
 *
 *     one Account  ->  ZERO OR ONE persistent Deal
 *     one Product  ->  a QUOTE under that one Deal, never another Deal
 *
 * so a multi-product booking has no anchor-selection problem to solve: the Event's single
 * native What_Id points at the only Deal there is, and the full selected scope travels in
 * Meeting_Task_Contract_Products for processDeal to turn into one Quote per Product.
 *
 * Deluge cannot be executed here, so these are SOURCE assertions: they prove the prohibited
 * constructs are absent and cannot be quietly reintroduced by a later edit. What they cannot
 * prove is live behaviour — Contact and Deal propagation is only observable in the tenant and
 * stays on the live verification list (canary assertions C11/C12 in the correction plan).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const V6 = path.join(__dirname, '..', '..', 'zoho-functions', 'v6');

function src(rel) {
  return fs.readFileSync(path.join(V6, rel), 'utf8');
}

// Comments legitimately DESCRIBE the deleted architecture (that is how the removal stays
// legible), so every assertion below runs against code with line comments stripped.
function code(rel) {
  return src(rel)
    .split('\n')
    .map((l) => l.split('//')[0])
    .join('\n');
}

const ORCHESTRATORS = ['processLead.deluge', 'processContact.deluge', 'processAccount.deluge'];
const ALL_DELUGE = (function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith('.deluge')) out.push(path.relative(V6, full));
  }
  return out;
})(V6);

// ---------------------------------------------------------------------------
// ABSENCE GUARDS — the prohibited architecture must not come back
// ---------------------------------------------------------------------------

test('no Deluge source composes a product-scoped Deal_Key', () => {
  // Deal_Key == Account_Key. The "::" product suffix was the whole Product-Deal model in one
  // token, so its absence is the single most load-bearing guard in this file.
  const offenders = [];
  for (const rel of ALL_DELUGE) {
    const c = code(rel);
    if (/\+\s*"::"\s*\+/.test(c)) offenders.push(rel);
  }
  assert.deepEqual(offenders, [], 'a "::" Deal_Key composition reappeared');
});

test('the Product-Deal creation helper is gone and has no callers', () => {
  assert.equal(
    fs.existsSync(path.join(V6, 'activity', '_util_createOrReuseProductDeal.deluge')),
    false,
    '_util_createOrReuseProductDeal.deluge should have been deleted'
  );
  const callers = ALL_DELUGE.filter((rel) => /createOrReuseProductDeal\s*\(/.test(code(rel)));
  assert.deepEqual(callers, [], 'a caller of the deleted Product-Deal helper survives');
});

test('the Product-derived pipeline helper is gone and has no callers', () => {
  // 3.1: Pipeline is a property of the Account relationship, read from Deals.Pipeline.
  assert.equal(
    fs.existsSync(path.join(V6, 'activity', '_util_pipelineForProductKey.deluge')),
    false,
    '_util_pipelineForProductKey.deluge should have been deleted'
  );
  const callers = ALL_DELUGE.filter((rel) => /pipelineForProductKey\s*\(/.test(code(rel)));
  assert.deepEqual(callers, [], 'a caller of the deleted Product-pipeline helper survives');
});

test('handleMeetingEvent no longer reconciles per-Product sibling Deals', () => {
  const c = code('activity/handleMeetingEvent.deluge');
  assert.equal(/Deal_Product_Key/.test(c), false, 'the anchor Deal_Product_Key read survives');
  assert.equal(
    /multi_product_reconcile/.test(c),
    false,
    'the per-Product reconcile pass survives'
  );
  // The scope field itself MUST still be read — it is how Products reach processDeal as Quotes.
  assert.ok(
    /Meeting_Task_Contract_Products/.test(c),
    'Meeting_Task_Contract_Products must still be read: it carries the Quote scope'
  );
});

test('each orchestrator resolves the Account Deal exactly once, and never fans out', () => {
  for (const rel of ORCHESTRATORS) {
    const c = code(rel);
    const resolves = (c.match(/resolveOrCreateAccountDeal\s*\(/g) || []).length;
    assert.equal(resolves, 1, `${rel} should resolve the Account's Deal exactly once`);
  }
});

test('the three retired review codes are not raised anywhere', () => {
  // Retired with the correction: several Products under one Deal is normal operation, and
  // there are no Product Deals to duplicate.
  const retired = [
    'multi_product_sequence_ambiguous',
    'quote_product_mismatch',
    'duplicate_product_deal',
  ];
  const offenders = [];
  for (const rel of ALL_DELUGE) {
    const c = code(rel);
    for (const r of retired) {
      if (c.includes(r)) offenders.push(`${rel}:${r}`);
    }
  }
  assert.deepEqual(offenders, [], 'a retired review code is still raised');
});

test('a second Deal under one Account is never merged, re-keyed or Lost automatically', () => {
  // K6. The old duplicate-silencing pass wrote Opportunity_State=Lost, blanked Deal_Key and
  // renamed the Deal "(Duplicate)". A silent merge hides the concurrency defect that needs
  // seeing, so the correction replaces it with a review naming every candidate.
  const c = code('processAccount.deluge');
  assert.equal(/\(Duplicate\)/.test(c), false, 'the duplicate-renaming write survives');
  assert.equal(
    /"Deal_Key"\s*,\s*""/.test(c) || /put\("Deal_Key",\s*""\)/.test(c),
    false,
    'the Deal_Key-blanking write survives'
  );
  assert.ok(
    /multiple_deals_for_account/.test(c),
    'processAccount must raise multiple_deals_for_account instead of silencing'
  );
});

// ---------------------------------------------------------------------------
// STRUCTURAL — what MUST still be true of the corrected path
// ---------------------------------------------------------------------------

test('the Account-Deal resolver enforces the K6 match-count contract', () => {
  const c = code('activity/_util_resolveAccountDeal.deluge');
  for (const status of ['"none"', '"one"', '"many"']) {
    assert.ok(c.includes(status), `resolveAccountDeal must return ${status}`);
  }
  // "many" must never yield a deal id.
  assert.ok(
    /r\.put\("status",\s*"many"\)/.test(c),
    'the ambiguous branch must set status "many"'
  );
});

test('the create path re-searches Deal_Key and asserts exactly one match', () => {
  const c = code('activity/_util_resolveOrCreateAccountDeal.deluge');
  assert.ok(/searchRecords\("Deals",\s*"\(Deal_Key:equals:/.test(c), 'post-insert re-search missing');
  assert.ok(/insert_not_verifiable/.test(c), 'zero-match-after-insert branch missing');
  assert.ok(/duplicate_deal_key_after_insert/.test(c), 'multi-match-after-insert branch missing');
});

test('a Partnership Deal is reachable at creation, from Product evidence', () => {
  // ⚠ THIS IS A REGRESSION GUARD, and its absence is what let the defect ship.
  //
  // The resolver takes an optional pipelineHint, and every one of its three callers passes "".
  // An earlier revision derived Pipeline from that hint ALONE, so `pipeline` was always "B2B",
  // the Partnership REST-insert branch was unreachable dead code, and every Partnership
  // relationship was created as B2B. Because Deals.Pipeline is what the standing dispatch gate
  // in routeContactSequence reads, the end of that chain is a Partnership Contact receiving the
  // B2B sales sequence.
  //
  // Partnership is a real Product (Products record "Partnership", a live Product_Interest
  // option, and computeProductKey maps it to "partnership"), so Account Product evidence is the
  // correct source rather than a legacy coupling.
  const c = code('activity/_util_resolveOrCreateAccountDeal.deluge');

  // The hint must not be the ONLY route to Partnership.
  assert.match(c, /collectProductEvidence\s*\(\s*"Accounts"/,
    'the resolver must derive Pipeline from Account Product evidence, not the hint alone');
  assert.match(c, /computeProductKey\s*\(/,
    'evidence returns raw display names, so it must be normalised before comparison');
  assert.match(c, /"partnership"/,
    'the derivation must test for the partnership product key');

  // An explicit caller hint must still win, so the import path can skip the lookup.
  assert.match(c, /pHint == "Partnership"/,
    'an explicit caller hint must still be honoured');

  // And the REST-insert branch it feeds must still exist.
  assert.match(c, /restRec\.put\("Pipeline",\s*"Partnership"\)/,
    'the Partnership REST insert must remain reachable');
});

test('a Partnership relationship never gets a B2B scaffold Quote', () => {
  // The scaffold is a priced placeholder for a B2B opportunity. A partnership is not run as one,
  // so it must be excluded from scaffold candidacy even though it IS a real Product.
  const c = code('processDeal.deluge');
  assert.match(c, /computeProductKey\([^)]*\)\s*==\s*"partnership"/,
    'the scaffold path must exclude the partnership product');
});

test('the scaffold still fires on a plain reconcile when Account evidence exists', () => {
  // resolvedProductIds is only populated from activity context (ctx.products). On a plain
  // reconcile — processDeal(dealId, "{}") — it is empty, so without an Account-evidence fallback
  // the scaffold silently stopped firing. It used to read Deals.Deal_Product, which WAS populated
  // on existing Deals, so retiring that field removed the plain path's only source.
  const c = code('processDeal.deluge');
  assert.match(c, /collectProductEvidence\s*\(\s*"Accounts"/,
    'the scaffold needs an Account-evidence fallback for plain reconciles');
  // Still only ever ONE Product scaffolds; several means several real Quotes.
  assert.match(c, /scafCandIds\.size\(\)\s*==\s*1/,
    'the scaffold must require exactly one resolved Product');
});

test('the resolver writes Deal_Key = Account_Key and Deal_Name = Account_Name', () => {
  const c = code('activity/_util_resolveOrCreateAccountDeal.deluge');
  assert.ok(/dm\.put\("Deal_Key",\s*aKey\)/.test(c), 'Deal_Key must be the Account_Key');
  assert.ok(/dm\.put\("Deal_Name",\s*dealName\)/.test(c), 'Deal_Name must be derived from Account_Name');
  // and NEVER a Product identity
  assert.equal(/Deal_Product/.test(c), false, 'the resolver must not write any Deal_Product field');
});

test('the Partnership REST-insert branch is retained', () => {
  // Native createRecord DROPS the mandatory Pipeline special field, so a Partnership Deal must
  // be created through the v6 Records INSERT API with a compatible Stage in the same payload.
  const c = code('activity/_util_resolveOrCreateAccountDeal.deluge');
  assert.ok(/invokeurl/.test(c), 'the REST insert path was lost');
  assert.ok(/restRec\.put\("Pipeline",\s*"Partnership"\)/.test(c), 'Pipeline is not sent on the REST insert');
  assert.ok(/restRec\.put\("Stage",\s*"MQL"\)/.test(c), 'a compatible Stage must ride in the same payload');
});

test('dispatch resolves the Account Deal read-only and never creates one', () => {
  // A cadence pass must not manufacture commercial state.
  const c = code('activity/routeContactSequence.deluge');
  assert.ok(/resolveAccountDeal\s*\(/.test(c), 'dispatch must resolve the Account Deal');
  assert.equal(
    /resolveOrCreateAccountDeal\s*\(/.test(c),
    false,
    'dispatch must never call the CREATE-capable resolver'
  );
});
