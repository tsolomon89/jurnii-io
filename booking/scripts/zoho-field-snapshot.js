#!/usr/bin/env node
'use strict';

/**
 * Refresh the checked-in Zoho field-name snapshot from LIVE metadata.
 *
 *   node --env-file=.env.production.local booking/scripts/zoho-field-snapshot.js
 *   node --env-file=.env.production.local booking/scripts/zoho-field-snapshot.js --check
 *
 * WHY THIS EXISTS
 *
 *   `handleMeetingEvent` wrote `Deals.Demo_Start_DateTime` for months. That field does
 *   not exist. Deluge sends one `updateRecord` map, so the unknown key took the
 *   SUPPORTED key in the same map (`Demo_Reminder_Send_At`) down with it and every
 *   demo reminder was silently lost — with no error anywhere, because nothing ever
 *   compared a written field name against the module that receives it.
 *
 *   `zoho-field-names.test.js` runs OFFLINE against the snapshot this writes, so the
 *   contract is enforced on every `npm test` without network access. Re-run this script
 *   (and commit the result) whenever Zoho metadata legitimately changes; `--check`
 *   exits non-zero if the snapshot has drifted, which is the CI-facing form.
 *
 *   It is read-only against Zoho: `GET /settings/fields` only.
 */

const fs = require('fs');
const path = require('path');
const Z = require('../integrations/zoho');

const MODULES = ['Leads', 'Contacts', 'Accounts', 'Deals', 'Events', 'Tasks', 'Quotes'];
const OUT = path.join(__dirname, '..', 'tests', 'fixtures', 'zoho-fields.json');
const PICKLIST_OUT = path.join(__dirname, '..', 'config', 'zoho-picklists.js');
const LEAD_SOURCE_OUT = path.join(__dirname, '..', 'config', 'lead-sources.js');
const CHECK = process.argv.includes('--check');

/**
 * Picklists the RUNTIME gates on, so they must be captured, not just named.
 *
 *   Leads/Contacts.Job_Title   — `governedTitle()` writes the picklist only on an exact
 *                                match; the 154-value live list is a curated SUBSET of
 *                                the 415 persona titles, so the gate needs the values.
 *   Leads/Contacts.Lead_Source — the internal form offers these and the server validates
 *                                against them. `display_value` differs from
 *                                `actual_value` for five of them (Advertisement shows as
 *                                "Import", Trade Show as "Event", Twitter as
 *                                "X (Twitter)"), so BOTH are captured: we show the
 *                                display and submit the actual.
 *   Leads.Product_Interest     — pins the four canonical products.
 *   Leads.Country              — pins that every name in config/countries.js is valid.
 *   Leads.Contact_Role1        — documentation only; nothing here writes it (Deluge owns
 *                                role resolution), but drift is worth seeing.
 *
 * `-None-` is Zoho's empty sentinel, never a writable value, and is dropped at capture.
 */
const PICKLIST_FIELDS = {
  Leads: ['Job_Title', 'Lead_Source', 'Product_Interest', 'Country', 'Contact_Role1'],
  Contacts: ['Job_Title', 'Lead_Source'],
  /**
   * The Meeting's structured booking state, all four written by `buildMeetingPayload`.
   *
   * `Meeting_Task_Contract_Products` is the one that most needs pinning: it is a
   * multiselectpicklist, so an option that has drifted out of the active set is written
   * with `code: SUCCESS` and silently discarded — the Meeting would look correct and
   * carry no products. Capturing it lets the offline suite assert that the four values
   * we send are character-identical to the live ones.
   *
   * The Stage/State/Status trio pins the vocabulary the Deluge branches on. It is not
   * the canonical 8-stage list — `Demo Confirmation` is a Contact/Deal stage and is NOT
   * a valid `Meeting_Task_Stage`, which is why a booked demo is `Demo Booking` here.
   */
  Events: ['Meeting_Task_Stage', 'Meeting_Task_State', 'Meeting_Task_Status',
    'Meeting_Task_Contract_Products'],
};

/** Field lengths worth pinning, because a local LIMIT that exceeds one truncates in Zoho. */
const LENGTH_FIELDS = {
  Leads: ['Job_Title_Raw', 'Phone'],
  Contacts: ['Job_Title_Raw', 'Phone'],
  // `Event_Title` is the budget the meeting-title builder truncates a long company
  // against; `Ext_Calendar_Booking_ID` holds the journey UUID that correlates every
  // Meeting write.
  Events: ['Event_Title', 'Ext_Calendar_Booking_ID'],
};

/**
 * Zoho's "Unused Fields" bin. A field removed from a module layout keeps its stored
 * data and still reports `read_only: false, api_update: true` — but a write to it
 * returns `code: SUCCESS`, `message: "record updated"`, bumps `Modified_Time`, and
 * SILENTLY DISCARDS the value. Proved on 2026-08-02 against a scratch Deal:
 *
 *   Demo_Reminder_Send_At     unused  api=SUCCESS  -> DISCARDED
 *   Next_Comm_Follow_Up_Date  unused  api=SUCCESS  -> DISCARDED
 *   Next_Step                 unused  api=SUCCESS  -> DISCARDED
 *   Description               on-layout            -> PERSISTED
 *
 * This is why no demo reminder has ever been written: the field is in the bin, so
 * neither Deluge nor REST can set it, however correct the calling code is.
 */
async function unusedFor(module) {
  const res = await Z.requestZoho('GET', `/crm/v6/settings/fields?module=${module}&type=unused`);
  return (((res.body || res).fields) || [])
    .map((f) => f.api_name).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

async function rawFieldsFor(module) {
  // `type=all` is LOAD-BEARING. Without it v6 returns only the layout-scoped subset —
  // 65 of 70 Deal fields — and `Demo_Reminder_Send_At` is one of the five it omits.
  // A snapshot taken without it would have "proved" that the supported reminder field
  // does not exist, i.e. the harness would have confirmed the very bug it exists to
  // catch. Verified against the live org on 2026-08-02.
  const res = await Z.requestZoho('GET', `/crm/v6/settings/fields?module=${module}&type=all`);
  return ((res.body || res).fields) || [];
}

function apiNames(list) {
  return list.map((f) => f.api_name).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

/**
 * Picklist values for the gated fields of one module, in Zoho's own sequence order.
 *
 * `type: 'unused'` on a VALUE means the option sits in the picklist's unused bin: it is
 * not offered on the layout and must never be presented to a visitor. It is captured
 * rather than dropped so the runtime can assert on the active set explicitly.
 */
function picklistsFor(module, list) {
  const want = PICKLIST_FIELDS[module] || [];
  const out = {};
  for (const name of want) {
    const f = list.find((x) => x.api_name === name);
    if (!f || !Array.isArray(f.pick_list_values)) continue;
    out[name] = f.pick_list_values
      // `-None-` is the empty sentinel, never a writable value.
      .filter((v) => v.actual_value && v.actual_value !== '-None-')
      .map((v) => ({
        value: v.actual_value,
        label: v.display_value || v.actual_value,
        used: (v.type || 'used') === 'used',
      }));
  }
  return out;
}

function lengthsFor(module, list) {
  const want = LENGTH_FIELDS[module] || [];
  const out = {};
  for (const name of want) {
    const f = list.find((x) => x.api_name === name);
    if (f && typeof f.length === 'number') out[name] = f.length;
  }
  return out;
}

const HEADER = (source) => `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 *   source:    live Zoho field metadata (GET /crm/v6/settings/fields)
 *   generator: booking/scripts/zoho-field-snapshot.js
 *   verify:    node --env-file=.env.production.local \\
 *                   booking/scripts/zoho-field-snapshot.js --check
 *
 * ${source}
 */`;

/**
 * The server-side gate data. Active (`used`) values only, because an unused value is
 * silently discarded on write. This is a RUNTIME file rather than a test fixture: the
 * serverless handlers must not require out of `tests/`, and the Lambda should not bundle
 * a seven-module dump to check 154 strings.
 */
function renderPicklists(picklists) {
  const active = {};
  for (const [module, fields] of Object.entries(picklists)) {
    active[module] = {};
    for (const [field, values] of Object.entries(fields)) {
      active[module][field] = values.filter((v) => v.used).map((v) => v.value);
    }
  }
  const body = Object.entries(active).map(([module, fields]) => {
    const inner = Object.entries(fields)
      .map(([field, values]) => `      ${JSON.stringify(field)}: [\n`
        + values.map((v) => `        ${JSON.stringify(v)}`).join(',\n')
        + '\n      ]')
      .join(',\n');
    return `    ${JSON.stringify(module)}: {\n${inner}\n    }`;
  }).join(',\n');

  return `${HEADER('The ACTIVE picklist values the booking backend validates against. An option in\n * Zoho\'s unused bin is omitted: a write to one returns SUCCESS and is discarded.')}
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JurniiBookingZohoPicklists = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PICKLISTS = {
${body}
  };

  /** Case-insensitive lookup returning ZOHO'S canonical casing, or null. */
  function match(module, field, value) {
    var values = (PICKLISTS[module] || {})[field];
    if (!values || value === undefined || value === null) return null;
    var needle = String(value).trim().toLowerCase();
    if (!needle) return null;
    for (var i = 0; i < values.length; i++) {
      if (values[i].toLowerCase() === needle) return values[i];
    }
    return null;
  }

  function valuesFor(module, field) {
    return ((PICKLISTS[module] || {})[field] || []).slice();
  }

  return { PICKLISTS: PICKLISTS, match: match, valuesFor: valuesFor };
});
`;
}

/**
 * The browser-facing Lead Source options for the internal form. Carries `label`
 * (`display_value`) and `value` (`actual_value`) separately, because they differ for
 * five live options and only the actual value may be submitted.
 */
function renderLeadSources(picklists) {
  const values = ((picklists.Leads || {}).Lead_Source || []).filter((v) => v.used);
  const rows = values
    .map((v) => `    { value: ${JSON.stringify(v.value)}, label: ${JSON.stringify(v.label)} }`)
    .join(',\n');

  return `${HEADER('The ACTIVE Leads.Lead_Source options offered by the internal booking form.\n *\n * `label` is Zoho\'s display_value and `value` is its actual_value; five options differ\n * (Advertisement shows as "Import", Trade Show as "Event", Twitter as "X (Twitter)").\n * The form shows the label and submits the value — a label must never reach the CRM.')}
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JurniiBookingLeadSources = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var LEAD_SOURCES = [
${rows}
  ];

  return { LEAD_SOURCES: LEAD_SOURCES };
});
`;
}

function build(byModule) {
  const snapshot = {
    generatedFrom: 'live Zoho metadata',
    modules: {},
    unused: {},
    picklists: {},
    lengths: {},
  };
  for (const m of MODULES) {
    const entry = byModule[m];
    if (!entry) continue;
    snapshot.modules[m] = apiNames(entry.fields);
    snapshot.unused[m] = entry.unused;
    const pl = picklistsFor(m, entry.fields);
    if (Object.keys(pl).length) snapshot.picklists[m] = pl;
    const len = lengthsFor(m, entry.fields);
    if (Object.keys(len).length) snapshot.lengths[m] = len;
  }
  return {
    [OUT]: `${JSON.stringify(snapshot, null, 2)}\n`,
    [PICKLIST_OUT]: renderPicklists(snapshot.picklists),
    [LEAD_SOURCE_OUT]: renderLeadSources(snapshot.picklists),
  };
}

async function main() {
  const byModule = {};
  for (const m of MODULES) {
    const fields = await rawFieldsFor(m);
    const unused = await unusedFor(m);
    byModule[m] = { fields, unused };
    console.log(`${m.padEnd(10)} ${String(fields.length).padStart(3)} fields`
      + `  ${unused.length} unused`);
  }
  const artifacts = build(byModule);

  if (CHECK) {
    // Compare line-ending-normalised: git checks these files out with CRLF on Windows
    // while the writer emits LF, and a pure string compare would report permanent
    // "drift" that has nothing to do with Zoho.
    const norm = (s) => s.replace(/\r\n/g, '\n');
    const drifted = Object.entries(artifacts).filter(([file, next]) => {
      const current = fs.existsSync(file) ? norm(fs.readFileSync(file, 'utf8')) : '';
      return current !== norm(next);
    }).map(([file]) => path.relative(process.cwd(), file));

    if (drifted.length) {
      console.error('\nSNAPSHOT DRIFT: live Zoho metadata no longer matches:\n  '
        + drifted.join('\n  ')
        + '\nRe-run without --check, review the diff, and commit it.');
      process.exitCode = 1;
      return;
    }
    console.log('\nSnapshot and generated config match live metadata.');
    return;
  }

  for (const [file, contents] of Object.entries(artifacts)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
    console.log(`\nWrote ${path.relative(process.cwd(), file)}`);
  }
}

module.exports = { build, picklistsFor, lengthsFor, renderPicklists, renderLeadSources,
  MODULES, OUT, PICKLIST_OUT, LEAD_SOURCE_OUT };

if (require.main === module) {
  main().catch((e) => { console.error('ERROR:', e.message); process.exitCode = 1; });
}
