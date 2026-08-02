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
  Leads: ['First_Name', 'Last_Name', 'Email', 'Lead_Source', 'Company', 'Phone',
    'Country', 'Job_Title_Raw', 'Product_Interest', 'Contact_Marketing_Consent'],
  // the post-conversion Contact update, and processLead's step-5 enrichment
  // NB: no Country, no Product_Interest, no Personal_Phone — see the lead-only test below.
  Contacts: ['First_Name', 'Last_Name', 'Email', 'Lead_Source', 'Phone',
    'Job_Title_Raw', 'Marketing_Consent', 'Stage', 'State',
    'Status', 'Contact_Role1', 'Account_Name'],
  Events: ['Ext_Calendar_Booking_ID', 'Start_DateTime', 'End_DateTime', 'Who_Id',
    'What_Id', 'Description', 'Event_Title', 'Meeting_Task_Stage',
    'Meeting_Task_Status', 'Meeting_Task_Pipeline', 'Meeting_Task_Opportunity',
    'Reminder_Send_At'],
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

test('the subform exemption is still justified', () => {
  for (const [module, fields] of Object.entries(UNUSED_BUT_PERSISTS)) {
    for (const f of fields) {
      assert.ok((snapshot.unused[module] || []).includes(f),
        `${module}.${f} is no longer unused — drop the exemption`);
    }
  }
});
