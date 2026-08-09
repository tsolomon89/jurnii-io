#!/usr/bin/env node
'use strict';

/**
 * Generate `booking/config/job-titles.js` from the authoritative persona CSV.
 *
 *   node booking/scripts/job-titles-generate.js
 *   node booking/scripts/job-titles-generate.js --check
 *
 * WHY THIS EXISTS
 *
 *   The Job Title autocomplete offers a governed list, and that list has exactly one
 *   source of truth: `Jurnii Personas - Job Tile to Contact Role Mapping.csv`. A second
 *   hand-copied list inside `booking-form.js` would drift the moment somebody edited
 *   one and not the other, and nothing would notice — the browser would keep offering a
 *   title the CRM no longer recognises.
 *
 *   `booking/tests/job-titles.test.js` runs this generator's pure half in memory on
 *   every `npm test` and asserts the committed file is byte-identical, so drift fails
 *   the build rather than reaching a visitor. `--check` is the same assertion in
 *   CI-facing form.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 *   It reads COLUMN 0 ONLY. `Contact_Role` never enters the generated file, and
 *   therefore never reaches the browser. Title -> role mapping is owned by Zoho and
 *   `processLead.deluge`; the form's job is to collect a title, not to classify a
 *   person. That is a structural guarantee here, not a convention: there is no code
 *   path in this generator that can emit a role.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CSV = path.join(
  __dirname, '..', '..', 'zoho-functions', '.agents', 'context', 'field_mapping',
  'Jurnii Personas - Job Tile to Contact Role Mapping.csv'
);
const OUT = path.join(__dirname, '..', 'config', 'job-titles.js');
const CHECK = process.argv.includes('--check');

/** The sentinel that reveals the free-text field. Must never collide with a real title. */
const OTHER = 'Other';

/**
 * RFC 4180 field scanner.
 *
 * A `line.split(',')` parse is wrong for this file: three rows quote a field that
 * contains a comma —
 *
 *   "Head of AML, Fraud & Risk",Influencer
 *   "Experience Director (Product, CX, Data, Research & PMO)",Influencer
 *   "Live Ops Product Manager, Head of Content",Influencer
 *
 * — and a naive split turns each into 3-5 columns, truncating the title at the first
 * comma. Only column 0 is ever returned, but the whole row must be scanned correctly
 * to know where column 0 ends.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let quoted = false;

  const endField = () => { row.push(cur); cur = ''; };
  const endRow = () => { endField(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') { cur += c; continue; }
      if (text[i + 1] === '"') { cur += '"'; i++; continue; }   // escaped quote
      quoted = false;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { endField(); continue; }
    if (c === '\r') { if (text[i + 1] === '\n') i++; endRow(); continue; }
    if (c === '\n') { endRow(); continue; }
    cur += c;
  }
  // The CSV has NO trailing newline, so the final row is still buffered here.
  if (cur !== '' || row.length) endRow();
  return rows;
}

/**
 * Deterministic ordering, independent of the host's ICU build.
 *
 * `localeCompare` is safe in `zoho-field-snapshot.js` because api_names are
 * `[A-Za-z0-9_]`, where every collation agrees. These titles contain `&`, `/`, `(`,
 * `,`, `-` and `+`, whose relative order is locale- and ICU-version-dependent — so a
 * `localeCompare` sort would make `--check` report drift purely because a different
 * machine regenerated the file. Case-insensitive first (so the list reads naturally),
 * code units as the tie-break (so it is total and stable).
 */
function compareTitles(a, b) {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la < lb) return -1;
  if (la > lb) return 1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * CSV text -> the distinct, trimmed, sorted title list. Pure, so the test can run it
 * without touching the filesystem.
 */
function titlesFrom(csvText) {
  const text = csvText.replace(/^﻿/, '');
  const rows = parseCsv(text);
  rows.shift();                                   // header: Job_Title,Contact_Role

  const seen = new Map();                         // lowercase -> first-seen casing
  for (const row of rows) {
    // Column 0 ONLY. Column 1 is Contact_Role and is never read.
    const title = String(row[0] === undefined ? '' : row[0]).trim();
    if (!title || title === '-None-') continue;
    const key = title.toLowerCase();
    if (!seen.has(key)) seen.set(key, title);
  }
  return Array.from(seen.values()).sort(compareTitles);
}

/**
 * Render the UMD module. Line-oriented (one title per line) so a regeneration diff
 * shows which titles actually changed instead of one 15 KB line.
 */
function render(titles, sourceSha256) {
  const rel = 'zoho-functions/.agents/context/field_mapping/'
    + 'Jurnii Personas - Job Tile to Contact Role Mapping.csv';
  return `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 *   source:    ${rel}
 *   generator: booking/scripts/job-titles-generate.js
 *   verify:    node booking/scripts/job-titles-generate.js --check
 *
 * The governed Job Title list offered by the booking form's autocomplete, derived from
 * the DISTINCT non-empty \`Job_Title\` values of the persona mapping CSV.
 *
 * It carries NO \`Contact_Role\` data. Title -> role mapping is owned by Zoho and
 * \`processLead.deluge\`; the browser neither knows nor submits a role.
 *
 * Not every title here is a valid \`Leads.Job_Title\` picklist value — the live picklist
 * is a curated subset. The server decides which of these may enter the governed
 * picklist and which travel as \`Job_Title_Raw\` only; see \`governedTitle()\` in
 * \`booking/api/_utils/products.js\`. The browser deliberately does not make that call.
 *
 * To change this list, edit the CSV and re-run the generator.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JurniiBookingJobTitles = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var TITLES = [
${titles.map((t) => `    ${JSON.stringify(t)}`).join(',\n')}
  ];

  return {
    TITLES: TITLES,
    /** Sentinel appended after the governed list; reveals the free-text field. */
    OTHER: ${JSON.stringify(OTHER)},
    SOURCE: ${JSON.stringify(rel)},
    SOURCE_SHA256: ${JSON.stringify(sourceSha256)}
  };
});
`;
}

/** Everything except file I/O, so the drift test can call it directly. */
function generate(csvText) {
  const titles = titlesFrom(csvText);

  // The sentinel must not shadow a governed title, or selecting that title would
  // silently open the free-text field instead of committing the title.
  const clash = titles.find((t) => t.toLowerCase() === OTHER.toLowerCase());
  if (clash) {
    throw new Error(`"${clash}" collides with the "${OTHER}" sentinel — rename it in the CSV.`);
  }

  const sha = crypto.createHash('sha256').update(csvText, 'utf8').digest('hex');
  return { titles, source: render(titles, sha), sha256: sha };
}

function main() {
  const csvText = fs.readFileSync(CSV, 'utf8');
  const { titles, source } = generate(csvText);

  if (CHECK) {
    // Line-ending-normalised, for the same reason `zoho-field-snapshot.js --check` is:
    // git may check the committed file out with CRLF on Windows while the writer emits
    // LF, and a raw compare would report permanent drift unrelated to the CSV.
    const norm = (s) => s.replace(/\r\n/g, '\n');
    const current = fs.existsSync(OUT) ? norm(fs.readFileSync(OUT, 'utf8')) : '';
    if (current !== norm(source)) {
      console.error('JOB TITLE DRIFT: ' + path.relative(process.cwd(), OUT)
        + ' no longer matches the CSV.\nRe-run without --check, review the diff, and commit it.');
      process.exitCode = 1;
      return;
    }
    console.log(`Job titles match the CSV (${titles.length} titles).`);
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, source);
  console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${titles.length} titles).`);
}

module.exports = { parseCsv, titlesFrom, compareTitles, render, generate, OTHER, CSV, OUT };

if (require.main === module) main();
