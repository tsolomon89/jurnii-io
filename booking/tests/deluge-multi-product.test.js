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

test('createAuxTask searches the Contact axis it matches on, not only the Deal', () => {
  // ⚠ STRUCTURAL MISS, independent of concurrency. The identity evaluated is CONTACT-scoped
  // (Who_Id + Task_Type + open + [issue_code]), but the lookup searched by DEAL and only fell
  // back to Who_Id when there was no Deal. So if a Contact already held an open Manual Review
  // and a NEW Deal was created, the Deal's related-Task list was empty by construction, the
  // Contact-scoped identity was never evaluated, and a second Task was raised for a condition
  // already open.
  const c = code('activity/createAuxTask.deluge');

  // The Contact search is guarded by the Contact alone — never by the ABSENCE of a Deal.
  assert.match(c, /if\(contactId != 0\)\s*\{\s*scopeResults\.add\(zoho\.crm\.searchRecords\("Tasks", "\(Who_Id:equals:"/,
    'the Who_Id search must be guarded by contactId only, and must always run for a Contact');
  // …and the Deal scope is an ADDITIONAL independent guard, not an alternative branch.
  assert.match(c, /\}\s*if\(hasDeal\)\s*\{\s*relTasks = zoho\.crm\.getRelatedRecords/,
    'the Deal scope must be its own if, not an else — both scopes read on every call');
  // Both scopes are then unioned and de-duplicated by record id, so a Task reachable from
  // both (the ordinary case) is evaluated once.
  assert.match(c, /for each scope in scopeResults/, 'both scopes must be walked');
  assert.match(c, /seenTaskIds\.contains\(stId\)/, 'the union must be de-duplicated by record id');
});

test('createAuxTask openness respects all three lifecycle axes', () => {
  // The model carries three separate axes and the predicate used to read only the native one:
  //   Status      (native)     Not Started | Deferred | In Progress | Completed | Waiting…
  //   Task_Status (automation) Open (displays "New") | Working | Closed
  //   Task_State  (outcome)    Open | Won | Lost
  // A Task retired by automation (Task_Status=Closed) or concluded (Task_State=Won/Lost) must
  // not count as open merely because native Status was left at "In Progress".
  const c = code('activity/createAuxTask.deluge');

  assert.match(c, /tOpen\s*=\s*\(/, 'the openness predicate must be explicit');
  assert.match(c, /tStatus\s*!=\s*"Completed"/, 'native Completed must close');
  assert.match(c, /tTaskStatus\s*!=\s*"Closed"/, 'Task_Status Closed must close');
  assert.match(c, /tTaskState\s*!=\s*"Won"/, 'Task_State Won must close');
  assert.match(c, /tTaskState\s*!=\s*"Lost"/, 'Task_State Lost must close');

  // Deferred / Waiting stay OPEN and are reopened only for a genuinely new issue code —
  // live provenance 2026-08-02, Deal 991103000003257018.
  assert.doesNotMatch(c, /tStatus\s*!=\s*"Deferred"/,
    'Deferred must remain OPEN so a parked Task still absorbs a repeat');
  assert.match(c, /tStatus == "Deferred" \|\| tStatus == "Waiting on someone else"/,
    'the reopen rule for Deferred/Waiting must be preserved');
});

test('Contact-create and Contact-edit are distinguished by an explicit invocation mode', () => {
  // processLead owns the conversion, so it initializes the Contact it just converted and passes
  // "create". WF001b0 (Contacts field_update) supplies no second argument, which normalises to
  // "edit" — preserving its downstream reconciliation exactly.
  const pc = code('processContact.deluge');

  assert.match(pc, /automation\.processContact\(string contact_id, string invocationMode\)/,
    'processContact must take an explicit invocation mode');
  // Fail-safe: anything not exactly "create" reconciles.
  assert.match(pc, /if\(pcMode != "create"\)\s*\{\s*pcMode = "edit";/,
    'an absent or unrecognised mode must normalise to "edit", not silently skip work');
  // Create mode withholds ONLY the Deal cascade.
  assert.match(pc, /if\(pcMode == "create"\)/, 'create mode must gate the processDeal cascade');
  assert.match(pc, /else\s*\{\s*automation\.processDeal\(accountDealId, "\{\}"\);/,
    'edit mode must still cascade into processDeal');

  // The Activation Task sits BELOW the gate, so create mode still produces it.
  const gate = pc.indexOf('if(pcMode == "create")');
  const activation = pc.indexOf('Sequence Activation');
  assert.ok(gate > 0 && activation > gate,
    'the Sequence Activation Task must run after the cascade gate, in both modes');
});

test('a Lead conversion holds exactly one processContact and one processDeal', () => {
  // The ingestion invariant: all new data enters through Leads, processLead owns the conversion,
  // and direct Contact creation is not a supported path. So the converted Contact is initialized
  // ONCE — by its converter — and the opportunity bootstrap runs ONCE, with importCtx.
  //
  // WF001b2 (Contacts CREATE) is superseded and stays inactive. It is NOT replaced by another
  // workflow function: a wrapper existing only to keep a redundant rule alive would reintroduce
  // the second invocation under a new name.
  const pl = code('processLead.deluge');

  assert.match(pl, /automation\.processContact\(newContactId, "create"\)/,
    'processLead must initialize the converted Contact directly, in create mode');
  assert.equal((pl.match(/automation\.processContact\(/g) || []).length, 1,
    'processLead must call processContact exactly once');

  // Exactly one reconcile reaches processDeal per conversion: the import and plain context
  // branches are mutually exclusive arms of the same bootstrap, never both.
  const pdCalls = pl.match(/automation\.processDeal\([^)]*\)/g) || [];
  assert.equal(pdCalls.length, 2, 'processLead has exactly the two bootstrap arms');
  assert.ok(pdCalls.every((c) => /importCtx|plainCtx/.test(c)),
    'every processDeal call in processLead must carry the bootstrap context, never "{}"');

  // ORDERING: the authoritative reconcile precedes Contact initialization, because
  // processContact re-reads the Contact for values processDeal writes.
  assert.ok(pl.indexOf('automation.processDeal(dealId, importCtx.toString())')
    < pl.indexOf('automation.processContact(newContactId, "create")'),
    'processDeal(importCtx) must run BEFORE processContact("create")');

  // …and the Contact→Product linking precedes the reconcile, because the scaffold Draft Quote
  // reads that evidence through the Account. When it ran after, the scaffold only ever fired
  // from a SECOND, redundant processDeal — so removing the duplicate silently removed the Quote.
  assert.ok(pl.indexOf('linkPIMap.put("Product_Interest", lbProdId)')
    < pl.indexOf('automation.processDeal(dealId, importCtx.toString())'),
    'Contact→Products_Linked must be written BEFORE the Deal reconcile that consumes it');

  // No workflow function exists whose only purpose is to re-add the second invocation.
  assert.ok(!ALL_DELUGE.includes('processContactCreated.deluge'),
    'processContactCreated must not exist — WF001b2 is superseded, not re-pointed');
});

test('a conversion that RESOLVES an existing Contact follows the same single path', () => {
  // Conversion has two shapes and both must end at one processContact("create"):
  //   new Contact       -> convertLead creates it, convertRes.Contacts carries the new id
  //   existing Contact  -> processLead passes it in convertMap so conversion binds rather than
  //                        duplicates, and newContactId keeps that id
  // WF001b2 would only have fired on the first shape, which is precisely why it could never have
  // been the initialization mechanism: half of all conversions never triggered it.
  const pl = code('processLead.deluge');

  assert.match(pl, /if\(contactId != ""\)\s*\{ convertMap\.put\("Contacts", contactId\); \}/,
    'an already-resolved Contact must be passed into convertLead, not duplicated');
  assert.match(pl, /newContactId = contactId;\s*if\(convertRes\.get\("Contacts"\) != null\)/,
    'newContactId must fall back to the resolved Contact when conversion returns none');
  // One guarded call site serves both shapes.
  assert.match(pl, /if\(newContactId != "" && newContactId != "null"\)\s*\{[\s\S]*?automation\.processContact\(newContactId, "create"\);\s*\}/,
    'both conversion shapes must reach the same single processContact call');
});

test('WF001d is reserved for EXTERNAL Deal edits — automation never re-triggers itself', () => {
  // WF001d (Deals create_or_edit) runs processDeal. Its reconciliation is untouched by this
  // change, and the reason is structural: every Deal write the automation makes — insert and
  // update alike — is trigger-suppressed, so WF001d only ever fires for an edit made by a human
  // or an external system. Verified live 2026-09-06 on Deal 991103000004071002: Amount null →
  // 10500 written WITH the trigger on, Modified_Time advanced past the write.
  //
  // A Deal write that forgets the suppression re-enters processDeal from inside processDeal.
  const offenders = [];
  for (const rel of ALL_DELUGE) {
    const c = code(rel);
    for (const w of c.match(/(?:create|update)Record\("Deals"[\s\S]{0,400}?\);/g) || []) {
      if (!/\{"trigger": List\(\)\}|noTrigger|noTrig\b/.test(w)) offenders.push(`${rel}: ${w.slice(0, 90)}`);
    }
  }
  assert.deepEqual(offenders, [], 'every Deal write must suppress its own workflow trigger');
});

test('a function that builds an Account itself suppresses the Account-create trigger', () => {
  // ⚠ REGRESSION GUARD — duplicate auxiliary Tasks, observed live 2026-09-06 (three separate
  // Lead runs) and in the 2026-08-14 E2E run.
  //
  // processLead/processContact create the Account, which fired WF001c -> processAccount ->
  // processDeal("{}"), concurrently with their OWN processDeal call. Both reached the same
  // review point and both called createAuxTask before either's Task was visible to the other's
  // dedupe read, producing two identical Tasks in the same second.
  //
  // Tasks carries no unique or external field (verified live: 37 fields, 0 unique, 0 external),
  // so there is no atomic upsert identity, and a search immediately before creation cannot close
  // a race. The only lever is to not create the redundant execution.
  //
  // WF001c still fires on Accounts created anywhere else, and on every Account edit.
  for (const f of ['processLead.deluge', 'processContact.deluge']) {
    const c = code(f);
    const inserts = [...c.matchAll(/createRecord\s*\(\s*"Accounts"[^;]*?\)\s*;/g)].map((m) => m[0]);
    assert.ok(inserts.length > 0, `${f}: expected an Accounts insert to guard`);
    for (const ins of inserts) {
      assert.match(ins, /"trigger"\s*:\s*List\(\)/,
        `${f}: an Accounts insert does not suppress the trigger — WF001c will run a second, `
        + `weaker processDeal concurrently and race its own dedupe: ${ins}`);
    }
  }
});

test('processLead passes a Partnership pipeline hint derived from the Lead itself', () => {
  // ⚠ REGRESSION GUARD — proven live 2026-09-06. Lead caroline.maclean@test.com carried
  // Product_Interest ["Partnership"] and its Deal was still created with Pipeline = "B2B".
  //
  // The resolver's Account-evidence fallback CANNOT work at conversion time: the order is
  // Account -> Contact -> Deal, and collectProductEvidence("Accounts", …) reads each related
  // Contact's Products_Linked, which is written downstream of Deal creation. At the moment the
  // Deal is created there is nothing to find, so it defaults to B2B every time.
  //
  // Deals.Pipeline is what routeContactSequence's dispatch gate reads, so a wrong value here
  // runs the B2B sequence against a partner.
  const c = code('processLead.deluge');

  assert.doesNotMatch(c, /resolveOrCreateAccountDeal\([^)]*,\s*""\s*\)/,
    'processLead passes a blank pipelineHint — the Account-evidence fallback cannot resolve '
    + 'Partnership this early in the conversion');
  assert.match(c, /resolveOrCreateAccountDeal\([^)]*plPipelineHint\s*\)/,
    'processLead must pass a hint derived from the Lead');
  // NB: allow the nested call in computeProductKey(piNm.trim()) — a [^)]* class cannot span it.
  assert.match(c, /computeProductKey\([\s\S]{0,60}?"partnership"/,
    'the hint must be derived by normalising the Lead Product_Interest values');
  assert.match(c, /leadPIStr/,
    "the hint must come from the Lead's own parsed Product_Interest");
});

test('every Deal insert in the resolver suppresses the workflow trigger', () => {
  // ⚠ REGRESSION GUARD — observed live 2026-09-06 (Wave-1 dummy Lead) and 2026-08-14 (E2E run):
  // TWO identical [pipeline_target_acv_unresolved] Manual Reviews, same Contact, same Deal,
  // same second.
  //
  // The native insert did not suppress WF001d, so creating the Deal fired processDeal a SECOND
  // time while the caller was already running it on that same Deal. Both executions called
  // createAuxTask, whose dedupe is a getRelatedRecords/searchRecords read — and Zoho's index had
  // not yet surfaced the other's Task. No search-based dedupe can win that race.
  //
  // Every caller (processLead/processContact/processAccount) invokes processDeal itself, WITH
  // contextJson; WF001d passes deal_id alone and cannot do the Quote bootstrap. The rule's call
  // is therefore strictly weaker as well as redundant.
  const c = code('activity/_util_resolveOrCreateAccountDeal.deluge');

  const inserts = [...c.matchAll(/createRecord\s*\(\s*"Deals"[^)]*\)/g)].map((m) => m[0]);
  assert.ok(inserts.length > 0, 'expected at least one native Deals insert to guard');
  for (const ins of inserts) {
    assert.match(ins, /"trigger"\s*:\s*List\(\)/,
      `a Deals insert does not suppress the workflow trigger — WF001d will double-run '
      + 'processDeal and race its own dedupe: ${ins}`);
  }

  // The Partnership REST insert already did this; the two paths must stay symmetric.
  assert.match(c, /restBody\.put\("trigger",\s*List\(\)\)/,
    'the Partnership REST insert must keep suppressing the trigger');
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
