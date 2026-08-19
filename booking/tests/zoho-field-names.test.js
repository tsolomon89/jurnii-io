'use strict';

/**
 * Field-name contract — every Zoho api_name this codebase writes must exist on the
 * module that receives it.
 *
 * ROOT CAUSE THIS PINS
 *
 *   `handleMeetingEvent` put `Demo_Start_DateTime` and `Demo_Reminder_Send_At` into ONE
 *   `zoho.crm.updateRecord("Deals", …)` map. `Demo_Start_DateTime` does not exist on
 *   Deals, so the whole map was rejected and the supported reminder field was never
 *   written — silently, on every booking, for as long as the code shipped. Nothing
 *   failed loudly because nothing compared the written names against live metadata.
 *
 *   Runs OFFLINE against `tests/fixtures/zoho-fields.json`, refreshed from live Zoho by
 *   `booking/scripts/zoho-field-snapshot.js` (`--check` fails on drift).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const snapshot = require('./fixtures/zoho-fields.json');
const has = (module, field) => (snapshot.modules[module] || []).includes(field);

const DELUGE_DIR = path.join(__dirname, '..', '..', 'zoho-functions', 'v6');
// The Deluge source is published to Zoho, and is only tracked in this repo once the
// live functions match it. Until then the source-scanning assertions skip rather than
// fail — the snapshot assertions, which need no source, always run.
const noDeluge = fs.existsSync(DELUGE_DIR) ? false : 'zoho-functions/v6 is not present';

function delugeFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? delugeFiles(p) : (e.name.endsWith('.deluge') ? [p] : []);
  });
}

// ---------------------------------------------------------------------------
// The snapshot itself
// ---------------------------------------------------------------------------

test('the field snapshot covers every module the booking chain writes to', () => {
  for (const m of ['Leads', 'Contacts', 'Accounts', 'Deals', 'Events', 'Tasks', 'Quotes']) {
    assert.ok(Array.isArray(snapshot.modules[m]) && snapshot.modules[m].length > 0,
      `snapshot is missing module ${m} — re-run booking/scripts/zoho-field-snapshot.js`);
  }
});

// ---------------------------------------------------------------------------
// The specific regression
// ---------------------------------------------------------------------------

test('Deals.Demo_Start_DateTime does not exist and must never be written again', () => {
  assert.strictEqual(has('Deals', 'Demo_Start_DateTime'), false,
    'live metadata now HAS this field — if it was created deliberately, update this test');

  // Comments are stripped first: the fix itself documents the dead field by name, and a
  // naive substring search would forbid explaining why it must never come back.
  const code = (src) => src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const offenders = delugeFiles(DELUGE_DIR)
    .filter((f) => code(fs.readFileSync(f, 'utf8')).includes('Demo_Start_DateTime'))
    .map((f) => path.relative(DELUGE_DIR, f));
  assert.deepStrictEqual(offenders, [],
    'Demo_Start_DateTime was reintroduced into Deluge; it is not a Deals field and its '
    + 'presence in an updateRecord map silently voids every other key in that map');
});

test('Deals.Demo_Reminder_Send_At exists and is the supported reminder field', () => {
  assert.ok(has('Deals', 'Demo_Reminder_Send_At'));
});

test('the Deal reminder mirror writes Demo_Reminder_Send_At and nothing else', { skip: noDeluge }, () => {
  const src = fs.readFileSync(path.join(DELUGE_DIR, 'activity', 'handleMeetingEvent.deluge'), 'utf8');
  const block = src.slice(src.indexOf('dUpd = Map();'));
  const puts = [...block.matchAll(/dUpd\.put\("([^"]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(puts, ['Demo_Reminder_Send_At'],
    'the Deal mirror must carry exactly one key, so an unsupported name can never void it');
});

// ---------------------------------------------------------------------------
// Every field the booking path writes, per module
// ---------------------------------------------------------------------------

const WRITTEN = {
  // booking/workflows/zoho-ops.js -> dataLoadPayload + buildMeetingPayload
  // `Job_Title` is written only on an exact live-picklist match; `Job_Title_Raw` always.
  Leads: ['First_Name', 'Last_Name', 'Email', 'Lead_Source', 'Company', 'Phone',
    'Country', 'Job_Title', 'Job_Title_Raw', 'Product_Interest', 'Contact_Marketing_Consent'],
  // the post-conversion Contact update, and processLead's step-5 enrichment
  // NB: no Country, no Product_Interest, no Personal_Phone — see the lead-only test below.
  Contacts: ['First_Name', 'Last_Name', 'Email', 'Lead_Source', 'Phone',
    'Job_Title', 'Job_Title_Raw', 'Marketing_Consent', 'Stage', 'State',
    'Status', 'Contact_Role1', 'Account_Name'],
  Events: ['Ext_Calendar_Booking_ID', 'Start_DateTime', 'End_DateTime', 'Who_Id',
    'What_Id', 'Description', 'Event_Title', 'Meeting_Task_Stage',
    'Meeting_Task_State', 'Meeting_Task_Status', 'Meeting_Task_Lost_Reasons',
    'Meeting_Task_Contract_Products', 'Meeting_Task_Pipeline',
    'Meeting_Task_Opportunity', 'Reminder_Send_At'],
  Deals: ['Deal_Name', 'Deal_Key', 'Deal_Product', 'Deal_Product_Key', 'Account_Name',
    'Contact_Name', 'Opportunity_State', 'Opportunity_Status', 'Stage', 'Pipeline',
    'Closing_Date', 'Lead_Source', 'Demo_Reminder_Send_At'],
  Accounts: ['Account_Name', 'Account_Key', 'Website', 'Phone', 'Company_Tier'],
  Tasks: ['Subject', 'Status', 'What_Id', 'Who_Id', 'Task_Type', 'Description'],
  Quotes: ['Subject', 'Quote_Stage', 'Quote_Type', 'Account_Name', 'Deal_Name',
    'Quote_Product', 'Quote_Target_ACV', 'Contract_ACV', 'Quoted_Items',
    'Quote_Applied_Activity_Keys', 'Contact_Name'],
};

for (const [module, fields] of Object.entries(WRITTEN)) {
  for (const field of fields) {
    test(`${module}.${field} exists in live metadata`, () => {
      assert.ok(has(module, field),
        `${module}.${field} is written by the booking chain but is absent from live `
        + 'metadata. Either the name is wrong or the field was deleted in Zoho.');
    });
  }
}

// ---------------------------------------------------------------------------
// Consent, which is module-specific and was the second live defect
// ---------------------------------------------------------------------------

test('marketing consent has a different api_name on Leads and Contacts', () => {
  assert.ok(has('Leads', 'Contact_Marketing_Consent'));
  assert.ok(has('Contacts', 'Marketing_Consent'));
  // The inverse names must NOT exist, or a wrong-module write would look valid.
  assert.strictEqual(has('Leads', 'Marketing_Consent'), false);
  assert.strictEqual(has('Contacts', 'Contact_Marketing_Consent'), false);
});

test('Phone and Job_Title_Raw exist on Contacts, so the conversion repair can land', () => {
  assert.ok(has('Contacts', 'Phone'));
  assert.ok(has('Contacts', 'Job_Title_Raw'));
});

// ---------------------------------------------------------------------------
// Zoho's "Unused Fields" bin — writes to it are SILENTLY DISCARDED
//
// A field removed from a module layout keeps its data and still reports
// `read_only: false` / `api_update: true`, but a write returns code=SUCCESS,
// message="record updated", bumps Modified_Time and throws the value away.
// Proved live 2026-08-02 on a scratch Deal: three unused fields discarded, an
// on-layout control persisted.
//
// This is the real reason no demo reminder has ever been written. The corrected
// Deluge is live and correct; `Deals.Demo_Reminder_Send_At` is simply in the bin,
// so neither Deluge nor REST can set it until it is restored to the layout.
// ---------------------------------------------------------------------------

// Exceptions, each justified empirically. The assertion below requires this set to
// match reality EXACTLY, so fixing the Zoho side makes the test fail and tells you
// to delete the entry — the debt cannot rot silently.
// RESOLVED 2026-08-02: `Deals.Demo_Reminder_Send_At` and `Deals.Automation_Suppressed`
// were restored to the Deals Standard layout (Pipeline Information section). Both now
// persist — proved by read-back on a scratch Deal, and by WF007 writing the reminder
// onto the retained Deal 991103000003230018 for the first time. The map is empty
// again, which is the state to defend: any new entry means a field written by this
// codebase has been moved into Unused Fields and its writes are being discarded.
const KNOWN_UNUSED_BUT_WRITTEN = {};

// `Quotes.Quoted_Items` is in the bin too but is NOT a hazard: it is the line-items
// subform, and both scaffold Quotes created on 2026-08-02 came back carrying their
// line. The bin rule applies to ordinary fields, not to the subform.
const UNUSED_BUT_PERSISTS = { Quotes: ['Quoted_Items'] };

test('no field the booking chain writes sits in the Unused Fields bin', () => {
  assert.ok(snapshot.unused, 'snapshot has no `unused` map — re-run zoho-field-snapshot.js');
  const found = {};
  for (const [module, fields] of Object.entries(WRITTEN)) {
    const bin = snapshot.unused[module] || [];
    const exempt = UNUSED_BUT_PERSISTS[module] || [];
    const hit = fields.filter((f) => bin.includes(f) && !exempt.includes(f));
    if (hit.length) found[module] = hit.sort();
  }
  assert.deepStrictEqual(found, KNOWN_UNUSED_BUT_WRITTEN,
    'The set of written-but-unused fields changed.\n'
    + '  · a NEW entry means a field was removed from its layout and writes to it are\n'
    + '    now being silently discarded — restore it or stop writing it;\n'
    + '  · a MISSING entry means the Zoho layout was fixed — delete it from\n'
    + '    KNOWN_UNUSED_BUT_WRITTEN so the debt does not linger in the test.');
});

// ---------------------------------------------------------------------------
// Contact_Role resolution must accept the RAW title, not only the picklist
//
// The booking backend writes `Job_Title` only when the visitor's title is one of the
// ~154 live picklist values; the other ~260 governed persona titles and every "Other"
// free text travel in `Job_Title_Raw` alone. All three functions that resolve a role
// must therefore fall back to it, or those visitors reach conversion with a blank
// `Contact_Role1` and never meet the activation gate — which is exactly what happened
// to every booking-sourced Lead before 2026-08-08.
// ---------------------------------------------------------------------------

const ROLE_RESOLVERS = ['processLead.deluge', 'processContact.deluge', 'processDeal.deluge'];

for (const fn of ROLE_RESOLVERS) {
  test(`${fn} resolves Contact_Role from Job_Title_Raw when the picklist is blank`, { skip: noDeluge }, () => {
    const src = fs.readFileSync(path.join(DELUGE_DIR, fn), 'utf8');
    const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

    assert.ok(/Job_Title_Raw/.test(code), `${fn} never reads Job_Title_Raw`);
    // The gate must admit a raw-only title: `picklist != "" || raw != ""`.
    assert.ok(/!=\s*""\s*\|\|\s*\w*[Rr]aw\w*\s*!=\s*""/.test(code),
      `${fn} still gates role resolution on the picklist alone`);
    // And the lookup key must come from the raw title when the picklist is blank.
    assert.ok(/titleKey|tKeyLoop/.test(code) && /if\(\s*\w*[Jj]ob\w*\s*!=\s*"",/.test(code),
      `${fn} does not select the lookup key by path`);
  });

  test(`${fn} does not default an unmatched RAW title to Decision Maker`, { skip: noDeluge }, () => {
    const src = fs.readFileSync(path.join(DELUGE_DIR, fn), 'utf8');
    const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    // The seed is path-dependent: "Decision Maker" for a curated picklist value whose map
    // entry is missing, "" for arbitrary visitor free text. Guessing on free text would
    // silently inflate the highest-value segment with every unrecognised title typed.
    assert.match(code, /=\s*if\(\s*\w+\s*!=\s*"",\s*"Decision Maker",\s*""\s*\)/,
      `${fn} must seed the role by path, not unconditionally`);
    // All three role lists must actually be consulted. `dmTitles` was declared and never
    // read in processContact and processDeal, which was harmless only while the default
    // was unconditionally "Decision Maker" — with a blank raw default it would have
    // dropped every raw Decision-Maker title.
    for (const list of ['dmTitles', 'euTitles', 'infTitles']) {
      assert.ok(new RegExp(`${list}\\.contains\\(`).test(code),
        `${fn} declares ${list} but never reads it`);
    }
  });
}

test('multi-product bookings defer activation to a human (current behaviour — SUPERSEDED, see authority §5.4)', { skip: noDeluge }, () => {
  // ⚠ PINS CURRENT (SUPERSEDED) BEHAVIOUR.
  //   Authority: zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md §5.4 —
  //   "Several Products or Quotes under the Deal do not make the Contact sequence ambiguous."
  //
  //   HARD RULE 7 (one active sequence per Contact) is CORRECT and survives. Deriving ambiguity
  //   from the NUMBER OF PRODUCTS is the violation. Under the approved model this branch is
  //   arithmetically unreachable — one Account has one Deal, so driverDealIds.size() is never > 1
  //   and [multi_product_sequence_ambiguous] deletes itself.
  //
  //   THIS ASSERTION IS EXPECTED TO FAIL when the model is corrected. Invert it into the §14.13
  //   guard — "a multi-product Contact activates normally" — do NOT delete it.
  //
  // The form can now send up to four products, and processLead fans out one Product Deal
  // per product. processContact applies HARD RULE 7 — one active automated sequence per
  // Contact — and raises a Manual Review instead of the Activation Task when a Contact
  // has more than one driver Deal.
  //
  // That branch was unreachable from the booking flow while the form was single-select.
  // It is now on the ordinary happy path, so it is pinned here: it fails safely to a
  // human, and neither side may be "fixed" to auto-pick a driver Deal without an
  // explicit decision (see booking/docs/architecture.md).
  const src = fs.readFileSync(path.join(DELUGE_DIR, 'processContact.deluge'), 'utf8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  assert.match(code, /driverDealIds\.size\(\)\s*>\s*1/,
    'the multi-driver guard is gone — a multi-product Contact would auto-pick a Deal');
  assert.match(code, /multi_product_sequence_ambiguous/,
    'the multi-driver branch must raise a Manual Review, not fail silently');

  // And the form must still be capable of producing that state, i.e. multi-select is real.
  const form = fs.readFileSync(
    path.join(__dirname, '..', 'assets', 'booking-form.js'), 'utf8');
  assert.match(form, /data-field="productInterests"/,
    'if the form went back to single-select, this whole interaction is moot');
});

// ---------------------------------------------------------------------------
// The metadata boundary — this codebase reads Zoho metadata and never creates it
//
// `booking/docs/implementation-notes.md` states the rule: nothing here may create a
// module, field, layout, PICKLIST VALUE, workflow or scope. It matters most for
// `Job_Title`, whose live picklist is a curated 154-value subset of the 415 persona
// titles: the tempting "fix" for a title that will not write is to add it as an option,
// which would silently take governance of the list away from the CRM owners.
// ---------------------------------------------------------------------------

const FORBIDDEN_METADATA_CALLS = [
  'createFields', 'createGlobalPicklist', 'replacePicklistValues',
  'updateGlobalPicklist', 'deleteCustomField', 'createModules',
];

test('no booking code creates or alters Zoho metadata', () => {
  const BOOKING = path.join(__dirname, '..');
  const SKIP = new Set(['node_modules', 'tests', '.git']);
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP.has(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : (/\.(js|mjs|cjs)$/.test(e.name) ? [p] : []);
  });

  const offenders = [];
  for (const file of walk(BOOKING)) {
    // Comments are stripped: the boundary is documented by name in several files, and a
    // naive search would forbid explaining the rule it enforces.
    const code = fs.readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
    for (const call of FORBIDDEN_METADATA_CALLS) {
      if (code.includes(call)) offenders.push(`${path.relative(BOOKING, file)}: ${call}`);
    }
  }
  assert.deepStrictEqual(offenders, [],
    'booking code must never create Zoho metadata. If a value will not write, the answer '
    + 'is to report it and stop — not to add the picklist option.');
});

test('the governed picklist snapshot agrees with the field-name fixture', () => {
  // Two artifacts, one generator run: the runtime file the handlers require, and the
  // fixture the offline tests read. They must not be able to drift apart.
  const runtime = require('../config/zoho-picklists');
  assert.ok(snapshot.picklists, 'the fixture has no `picklists` — re-run zoho-field-snapshot.js');
  for (const [module, fieldsOf] of Object.entries(snapshot.picklists)) {
    for (const [fieldName, values] of Object.entries(fieldsOf)) {
      const active = values.filter((v) => v.used).map((v) => v.value);
      assert.deepStrictEqual(runtime.valuesFor(module, fieldName), active,
        `${module}.${fieldName} differs between the runtime config and the fixture`);
    }
  }
});

// ---------------------------------------------------------------------------
// The Meeting's structured booking state
//
// These need `Events` in the fixture's `picklists`/`lengths`, which arrives with the
// next credentialed run of zoho-field-snapshot.js (the script now asks for it). Until
// then they SKIP rather than fail: the offline suite has no network, and a hard-coded
// table asserting against itself would prove nothing. The api_names themselves are
// already pinned unconditionally by WRITTEN.Events above, and by the Unused-bin test.
// ---------------------------------------------------------------------------

const noEventPicklists = (snapshot.picklists || {}).Events
  ? false : 'fixture has no Events picklists — re-run booking/scripts/zoho-field-snapshot.js';
const noEventLengths = (snapshot.lengths || {}).Events
  ? false : 'fixture has no Events lengths — re-run booking/scripts/zoho-field-snapshot.js';

const activeValues = (module, field) =>
  ((snapshot.picklists[module] || {})[field] || []).filter((v) => v.used).map((v) => v.value);

test('Meeting_Task_Contract_Products offers exactly the canonical products',
  { skip: noEventPicklists }, () => {
    // The decisive one. This field is a multiselect, so a value that has drifted out of
    // the active set is accepted with code SUCCESS and DISCARDED — the Meeting would
    // look fine and carry no product scope at all.
    const { PRODUCT_CANONICAL } = require('../api/_utils/products');
    assert.deepStrictEqual(
      new Set(activeValues('Events', 'Meeting_Task_Contract_Products')),
      new Set(Object.values(PRODUCT_CANONICAL)),
      'the products we send must be character-identical to the live active options');
  });

test('the booking writes only live-valid Meeting_Task values', { skip: noEventPicklists }, () => {
  const stage = activeValues('Events', 'Meeting_Task_Stage');
  assert.ok(stage.includes('Demo Booking'), 'the value buildMeetingPayload sends');
  // `Demo Confirmation` is a Contact/Deal stage. It is NOT a Meeting_Task_Stage option,
  // so the Meeting stays at `Demo Booking` and the Contact transition is the Deluge's.
  assert.equal(stage.includes('Demo Confirmation'), false,
    'if this now exists, revisit the Meeting stage rather than assuming it is writable');

  assert.ok(activeValues('Events', 'Meeting_Task_State').includes('Open'));

  const status = activeValues('Events', 'Meeting_Task_Status');
  assert.ok(status.includes('Working'), 'the value buildMeetingPayload sends');
  // handleMeetingEvent.deluge writes 'New' into a blank Meeting_Task_Status, and 'New'
  // is not an option — which is exactly why the payload sets a valid value at create.
  assert.equal(status.includes('New'), false,
    'the Deluge writes `New` into a blank; if it became valid, that write is no longer a bug');
});

test('EVENT_TITLE_MAX matches the live Event_Title length', { skip: noEventLengths }, () => {
  const { EVENT_TITLE_MAX } = require('../api/_utils/meeting-title');
  assert.strictEqual(EVENT_TITLE_MAX, snapshot.lengths.Events.Event_Title,
    'the title builder budgets a long company against this number');
});

test('the local job_title_raw limit does not exceed the live field length', () => {
  // A local cap above the Zoho length silently truncates (or rejects) at the CRM.
  const { LIMITS } = require('../lib/validate');
  const live = (snapshot.lengths.Leads || {}).Job_Title_Raw;
  assert.ok(live, 'the fixture has no Leads.Job_Title_Raw length');
  assert.ok(LIMITS.job_title_raw <= live,
    `LIMITS.job_title_raw (${LIMITS.job_title_raw}) exceeds the live length (${live})`);
  assert.strictEqual((snapshot.lengths.Contacts || {}).Job_Title_Raw, live,
    'the two modules must agree, or the Contact path would truncate differently');
});

test('the subform exemption is still justified', () => {
  for (const [module, fields] of Object.entries(UNUSED_BUT_PERSISTS)) {
    for (const f of fields) {
      assert.ok((snapshot.unused[module] || []).includes(f),
        `${module}.${f} is no longer unused — drop the exemption`);
    }
  }
});
