'use strict';

/**
 * Job-title list contract — the browser's governed list must BE the CSV, not a copy.
 *
 * The autocomplete offers 415 titles. If that list were maintained by hand inside
 * `booking-form.js`, an edit to the CSV (or to the list) would silently desynchronise
 * the two, and a visitor would be offered a title the CRM mapping no longer knows.
 * This suite re-runs the generator's pure half in memory and asserts the committed file
 * is byte-identical, so drift fails `npm test` rather than reaching production.
 *
 * It also pins the guarantee that no `Contact_Role` data reaches the browser.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const gen = require('../scripts/job-titles-generate.js');
const titles = require('../config/job-titles.js');

const csvText = fs.readFileSync(gen.CSV, 'utf8');
const generatedSource = fs.readFileSync(gen.OUT, 'utf8');

// git may check the committed file out with CRLF on Windows while the generator emits
// LF, so every source comparison here is line-ending-normalised.
const norm = (s) => s.replace(/\r\n/g, '\n');

test('booking/config/job-titles.js is exactly what the generator produces from the CSV', () => {
  const { source } = gen.generate(csvText);
  assert.strictEqual(norm(generatedSource), norm(source),
    'the committed job-title list has drifted from the CSV.\n'
    + '  Run: node booking/scripts/job-titles-generate.js\n'
    + '  then review the diff and commit it. Never hand-edit the generated file.');
});

test('every generated title is a distinct, trimmed, non-empty CSV Job_Title', () => {
  const rows = gen.parseCsv(csvText);
  rows.shift();
  const fromCsv = new Set(rows
    .map((r) => String(r[0] === undefined ? '' : r[0]).trim().toLowerCase())
    .filter(Boolean));

  assert.ok(titles.TITLES.length > 0);
  for (const t of titles.TITLES) {
    assert.strictEqual(t, t.trim(), `"${t}" carries surrounding whitespace`);
    assert.notStrictEqual(t, '', 'an empty title reached the list');
    assert.ok(fromCsv.has(t.toLowerCase()), `"${t}" is not a Job_Title in the CSV`);
  }

  const seen = new Set(titles.TITLES.map((t) => t.toLowerCase()));
  assert.strictEqual(seen.size, titles.TITLES.length, 'the list contains duplicate titles');
});

test('the CSV rows that quote an embedded comma survive intact', () => {
  // A `line.split(',')` parse truncates each of these at the first comma. They are the
  // only quoted rows in the file, and they are why the generator uses a real scanner.
  for (const t of [
    'Head of AML, Fraud & Risk',
    'Experience Director (Product, CX, Data, Research & PMO)',
    'Live Ops Product Manager, Head of Content',
  ]) {
    assert.ok(titles.TITLES.includes(t), `"${t}" was mangled by CSV parsing`);
  }
});

test('the generated list carries no Contact_Role data', () => {
  // Structural: the browser must never be able to classify a person. Role resolution is
  // owned by Zoho and processLead.deluge.
  //
  // Comments are stripped first — the generated header explains by name that it carries
  // no Contact_Role, and a naive substring search would forbid documenting the very
  // guarantee under test. Same treatment as zoho-field-names.test.js:62.
  const code = generatedSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  for (const needle of ['Decision Maker', 'End User', 'Influencer', 'Contact_Role']) {
    assert.ok(!code.includes(needle),
      `"${needle}" leaked into the browser-facing title list`);
  }
});

test('the Other sentinel is not a governed title', () => {
  assert.strictEqual(titles.OTHER, 'Other');
  const clash = titles.TITLES.filter((t) => t.toLowerCase() === titles.OTHER.toLowerCase());
  assert.deepStrictEqual(clash, [],
    'a governed title collides with the free-text sentinel — selecting it would open '
    + 'the Other field instead of committing the title');
});

test('SOURCE_SHA256 matches the CSV on disk', () => {
  // Catches a CSV edit that nobody regenerated, independently of the source comparison.
  const sha = crypto.createHash('sha256').update(csvText, 'utf8').digest('hex');
  assert.strictEqual(titles.SOURCE_SHA256, sha,
    'the CSV changed but booking/config/job-titles.js was not regenerated');
});

test('the title ordering is deterministic and locale-independent', () => {
  // `localeCompare` would order `&`, `/`, `(` and `,` differently across ICU builds,
  // making --check report drift purely because another machine regenerated the file.
  const resorted = titles.TITLES.slice().sort(gen.compareTitles);
  assert.deepStrictEqual(resorted, titles.TITLES);
});

test('the build ships the generated title list to the browser', () => {
  const vite = fs.readFileSync(path.join(__dirname, '..', '..', 'vite.config.js'), 'utf8');
  assert.ok(vite.includes('booking/config/job-titles.js'),
    'job-titles.js is not in BOOKING_RUNTIME, so the autocomplete would 404 in dist');
});
