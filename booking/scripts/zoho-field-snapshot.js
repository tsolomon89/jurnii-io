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
const CHECK = process.argv.includes('--check');

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

async function fieldsFor(module) {
  // `type=all` is LOAD-BEARING. Without it v6 returns only the layout-scoped subset —
  // 65 of 70 Deal fields — and `Demo_Reminder_Send_At` is one of the five it omits.
  // A snapshot taken without it would have "proved" that the supported reminder field
  // does not exist, i.e. the harness would have confirmed the very bug it exists to
  // catch. Verified against the live org on 2026-08-02.
  const res = await Z.requestZoho('GET', `/crm/v6/settings/fields?module=${module}&type=all`);
  const list = ((res.body || res).fields) || [];
  return list
    .map((f) => f.api_name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

async function main() {
  const snapshot = { generatedFrom: 'live Zoho metadata', modules: {}, unused: {} };
  for (const m of MODULES) {
    snapshot.modules[m] = await fieldsFor(m);
    snapshot.unused[m] = await unusedFor(m);
    console.log(`${m.padEnd(10)} ${String(snapshot.modules[m].length).padStart(3)} fields`
      + `  ${snapshot.unused[m].length} unused`);
  }
  const next = `${JSON.stringify(snapshot, null, 2)}\n`;

  if (CHECK) {
    // Compare line-ending-normalised: git checks this file out with CRLF on Windows
    // while the writer emits LF, and a pure string compare would report permanent
    // "drift" that has nothing to do with Zoho.
    const norm = (s) => s.replace(/\r\n/g, '\n');
    const current = fs.existsSync(OUT) ? norm(fs.readFileSync(OUT, 'utf8')) : '';
    if (current !== norm(next)) {
      console.error('\nSNAPSHOT DRIFT: live Zoho metadata no longer matches '
        + path.relative(process.cwd(), OUT)
        + '\nRe-run without --check, review the diff, and commit it.');
      process.exitCode = 1;
      return;
    }
    console.log('\nSnapshot matches live metadata.');
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, next);
  console.log(`\nWrote ${path.relative(process.cwd(), OUT)}`);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exitCode = 1; });
