#!/usr/bin/env node
'use strict';

/**
 * Capture the live Zoho field metadata this subsystem depends on.
 *
 *   node --env-file=.env integrations/lemlist-zoho/scripts/zoho-field-snapshot.js
 *   node --env-file=.env integrations/lemlist-zoho/scripts/zoho-field-snapshot.js --check
 *
 * READ ONLY. `GET /crm/v6/settings/fields` and nothing else — no record is read,
 * no record is written, and no metadata is created or altered.
 *
 * WHY IT EXISTS. Two Zoho behaviours have each caused a silent production
 * incident in this org:
 *
 *   · a field that EXISTS BUT IS OFF-LAYOUT silently discards writes to its own
 *     key while the rest of the map commits;
 *   · an api_name that DOES NOT EXIST can void the ENTIRE update map, taking
 *     valid keys down with it.
 *
 * `SUCCESS` therefore proves nothing. `tests/task.test.js` checks every api_name
 * this subsystem writes against the snapshot below, which is the only mechanism
 * that can catch a rename, a retirement or a layout change before it silently
 * eats data. `--check` exits non-zero when the live org has drifted from the
 * committed fixture.
 *
 * This writes the SUBSYSTEM'S OWN fixture. `booking/tests/fixtures/zoho-fields.json`
 * is a separate file with a separate script and is not touched.
 */

const fs = require('node:fs');
const path = require('node:path');

const { requestZoho } = require('../../../booking/integrations/zoho/index.js');

const MODULES = ['Tasks', 'Contacts', 'Accounts'];

/** Only the picklists this subsystem reasons about; capturing all of them is noise. */
const PICKLIST_FIELDS = {
  Tasks: ['Status', 'Task_Type', 'Task_State', 'Task_Status'],
  Contacts: [],
  Accounts: [],
};

/** Fields whose maximum length a payload could realistically exceed. */
const LENGTH_FIELDS = {
  Tasks: ['Subject', 'Description'],
  Contacts: ['Job_Title_Raw'],
  Accounts: ['Account_Key'],
};

/** Only the fields this subsystem might read or write, to keep the fixture legible. */
const FIELDS_OF_INTEREST = {
  Contacts: [
    'Account_Name', 'Description', 'Email', 'First_Name', 'Full_Name', 'id',
    'Job_Title', 'Job_Title_Raw', 'Last_Name', 'Lead_Source', 'Marketing_Consent',
    'Mobile', 'Owner', 'Personal_Linkedin', 'Phone', 'Salutation', 'Secondary_Email',
    'Stage', 'State', 'Status', 'Contact_Role1', 'Title',
  ],
  Accounts: [
    'Account_Key', 'Account_Name', 'Account_Number', 'Account_Site', 'Account_Status',
    'Account_Type', 'Automation_Suppressed', 'Company_Linkedin', 'Company_Tier',
    'Description', 'id', 'Industry', 'Jurnii_Org_ID', 'Owner', 'Phone', 'Website',
  ],
  // Tasks has only 37 fields, so all of them are captured.
  Tasks: null,
};

const OUT = path.join(__dirname, '..', 'tests', 'fixtures', 'zoho-fields.json');
const CHECK = process.argv.includes('--check');

async function fieldsFor(module) {
  const res = await requestZoho('GET',
    `/crm/v6/settings/fields?module=${encodeURIComponent(module)}&type=all`);
  const rows = (res && Array.isArray(res.fields)) ? res.fields : [];
  if (!rows.length) throw new Error(`no fields returned for ${module}`);
  return rows;
}

/**
 * A field is unwritable when Zoho says so, not when we assume so. `view_type`
 * carries the truth: `Closed_Time` reports `{edit:false, create:false}` and
 * every write to it is discarded.
 */
function isReadOnly(f) {
  const v = f.view_type || {};
  return f.read_only === true || (v.create === false && v.edit === false);
}

async function build() {
  const snapshot = {
    '//': 'Live Zoho field snapshot for the modules this subsystem writes to. Captured read-only via GET /crm/v6/settings/fields. Regenerate with `node scripts/zoho-field-snapshot.js`; `--check` fails on drift. This is the subsystem\'s OWN fixture — booking/tests/fixtures/zoho-fields.json is a separate file and is not touched.',
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'GET /crm/v6/settings/fields?module=<M>&type=all',
    modules: {},
    readOnly: {},
    unused: {},
    mandatory: {},
    unique: {},
    lengths: {},
    picklists: {},
  };

  for (const module of MODULES) {
    const rows = await fieldsFor(module);
    const wanted = FIELDS_OF_INTEREST[module];
    const keep = (name) => !wanted || wanted.includes(name);

    snapshot.modules[module] = rows.map((f) => f.api_name).filter(keep).sort();

    const readOnly = rows.filter((f) => isReadOnly(f)).map((f) => f.api_name).filter(keep).sort();
    if (readOnly.length) snapshot.readOnly[module] = readOnly;

    // An off-layout field is the silent-discard case. Zoho reports it as not
    // present on any layout section.
    const unused = rows
      .filter((f) => f.layout_associations !== undefined
        ? (Array.isArray(f.layout_associations) && f.layout_associations.length === 0)
        : false)
      .map((f) => f.api_name).filter(keep).sort();
    snapshot.unused[module] = unused;

    const mandatory = rows.filter((f) => f.system_mandatory === true)
      .map((f) => f.api_name).filter(keep).sort();
    if (mandatory.length) snapshot.mandatory[module] = mandatory;

    const unique = rows.filter((f) => f.unique && typeof f.unique === 'object')
      .map((f) => f.api_name).filter(keep).sort();
    if (unique.length) snapshot.unique[module] = unique;

    const lengths = {};
    for (const name of LENGTH_FIELDS[module] || []) {
      const f = rows.find((r) => r.api_name === name);
      if (f && f.length) lengths[name] = Number(f.length);
    }
    if (Object.keys(lengths).length) snapshot.lengths[module] = lengths;

    const picklists = {};
    for (const name of PICKLIST_FIELDS[module] || []) {
      const f = rows.find((r) => r.api_name === name);
      if (f && Array.isArray(f.pick_list_values) && f.pick_list_values.length) {
        // ACTUAL values, not display labels. Picklists round-trip in display
        // space over the API, so the two differ — `Task_Status` stores `Open`
        // and displays `New`. Writing a display label writes a non-member,
        // which is discarded exactly like an unknown api_name.
        picklists[name] = f.pick_list_values.map((v) => v.actual_value);
      }
    }
    if (Object.keys(picklists).length) snapshot.picklists[module] = picklists;
  }

  return snapshot;
}

/** Compare everything except the capture date, which always differs. */
function meaningful(snapshot) {
  const copy = JSON.parse(JSON.stringify(snapshot));
  delete copy.generatedAt;
  delete copy['//'];
  return JSON.stringify(copy, Object.keys(copy).sort(), 2);
}

async function main() {
  const live = await build();

  if (!CHECK) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${JSON.stringify(live, null, 2)}\n`, 'utf8');
    process.stdout.write(`wrote ${path.relative(process.cwd(), OUT)}\n`);
    for (const m of MODULES) {
      process.stdout.write(`  ${m}: ${live.modules[m].length} fields, `
        + `${(live.readOnly[m] || []).length} read-only, `
        + `${(live.unused[m] || []).length} off-layout\n`);
    }
    return 0;
  }

  if (!fs.existsSync(OUT)) {
    process.stderr.write(`no committed snapshot at ${OUT}; run without --check first\n`);
    return 1;
  }
  const committed = JSON.parse(fs.readFileSync(OUT, 'utf8'));

  if (meaningful(committed) === meaningful(live)) {
    process.stdout.write('field snapshot matches the live org\n');
    return 0;
  }

  process.stderr.write('\nFIELD METADATA HAS DRIFTED from the committed snapshot.\n\n');
  for (const m of MODULES) {
    const a = new Set(committed.modules[m] || []);
    const b = new Set(live.modules[m] || []);
    const added = [...b].filter((x) => !a.has(x));
    const removed = [...a].filter((x) => !b.has(x));
    if (added.length) process.stderr.write(`  ${m}: NEW      ${added.join(', ')}\n`);
    if (removed.length) {
      process.stderr.write(`  ${m}: REMOVED  ${removed.join(', ')}`
        + '   <-- a field this subsystem writes may now VOID THE WHOLE MAP\n');
    }
    const ua = new Set(committed.unused[m] || []);
    const ub = new Set(live.unused[m] || []);
    const nowUnused = [...ub].filter((x) => !ua.has(x));
    if (nowUnused.length) {
      process.stderr.write(`  ${m}: OFF-LAYOUT now  ${nowUnused.join(', ')}`
        + '   <-- writes to these are silently discarded\n');
    }
  }
  process.stderr.write('\nReview, then regenerate without --check and commit.\n\n');
  return 1;
}

main().then((code) => process.exit(code)).catch((err) => {
  process.stderr.write(`snapshot failed: ${err && (err.code || err.message)}\n`);
  process.exit(1);
});
