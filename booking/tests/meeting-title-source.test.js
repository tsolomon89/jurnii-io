// Offline, source-text assertions.
//
// Some of this change's guarantees are STRUCTURAL — they hold because a code path does
// not exist, not because a function returns the right value. "A reschedule keeps the
// title" is the clearest: it is true because nothing anywhere patches an event's summary
// after creation. No runtime test can observe the absence of a call, so these read the
// source. Same technique, and the same honesty about its limits, as
// `deluge-reminder-rule.test.js`.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.vercel', 'tests', '.git']);

function jsFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) jsFiles(path.join(dir, e.name), out);
    } else if (e.name.endsWith('.js')) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

/**
 * Strip comments, both kinds. A comment must stay free to NAME a retired constant in
 * order to explain why it was retired — `meeting-title.js` does exactly that.
 */
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** The body of a named function, from its declaration to the next top-level one. */
function fnBody(src, name) {
  const start = src.indexOf(`function ${name}(`);
  assert.notStrictEqual(start, -1, `${name} not found — was it renamed?`);
  const rest = src.slice(start + 1);
  const next = rest.search(/\n(?:async )?function /);
  return next === -1 ? rest : rest.slice(0, next);
}

// ---------------------------------------------------------------------------
// One title, decided in one place
// ---------------------------------------------------------------------------

test('the old constant title is gone from every runtime file', () => {
  const offenders = jsFiles(ROOT)
    .filter((f) => code(fs.readFileSync(f, 'utf8')).includes('Jurnii Product Demo Meeting'))
    .map((f) => path.relative(ROOT, f));
  assert.deepStrictEqual(offenders, [],
    'the meeting title is generated now; a literal here is a second, divergent answer');
});

test('only meeting-title.js decides the shape of a title', () => {
  // `Product Discovery` is the no-product label. If a second file spells it, that file
  // is building its own title and the two will drift.
  const offenders = jsFiles(ROOT)
    .filter((f) => path.basename(f) !== 'meeting-title.js')
    .filter((f) => code(fs.readFileSync(f, 'utf8')).includes('Product Discovery'))
    .map((f) => path.relative(ROOT, f));
  assert.deepStrictEqual(offenders, ['integrations\\zoho\\index.js'.replace('\\', path.sep)]
    .filter((p) => offenders.includes(p)),
    'only the Zoho Description fallback may repeat the label; nothing else builds a title');
});

// ---------------------------------------------------------------------------
// A reschedule changes the times, not the title
// ---------------------------------------------------------------------------

test('no Google path can rewrite an event summary or description after creation', () => {
  const src = read('integrations/google/index.js');

  const update = fnBody(src, 'updateEventTimes');
  assert.equal(/\bsummary\b/.test(update), false,
    'updateEventTimes must patch times only — a summary here would let a reschedule retitle');
  assert.equal(/\bdescription\b/.test(update), false);

  // And there is no OTHER function that could: outside insertEvent — which takes it as
  // a parameter and passes it through — the module never mentions a summary at all.
  const insert = fnBody(code(src), 'insertEvent');
  const elsewhere = code(src).replace(insert, '');
  assert.equal(/\bsummary\b/.test(elsewhere), false,
    'a summary outside insertEvent is a second way to name an event');
});

test('the Zoho reschedule and cancel writes never carry Event_Title', () => {
  const src = code(read('workflows/zoho-ops.js'));
  for (const fn of ['reschedulePropagate', 'cancelPropagate']) {
    assert.equal(fnBody(src, fn).includes('Event_Title'), false,
      `${fn} must not restate the title; the create is its only author`);
  }
});

test('the title column is written at page-2 commit and nowhere else', () => {
  const offenders = jsFiles(ROOT)
    .filter((f) => !f.endsWith(path.join('db', 'queries', 'journeys.js')))
    .filter((f) => code(fs.readFileSync(f, 'utf8')).includes('meeting_title:'))
    .map((f) => path.relative(ROOT, f));
  assert.deepStrictEqual(offenders, [],
    'only R1_page2Commit may assign meeting_title; a second writer could retitle a live event');
});

// ---------------------------------------------------------------------------
// The attendee-facing event
// ---------------------------------------------------------------------------

test('the calendar invite still notifies the attendee', () => {
  const src = read('integrations/google/index.js');
  assert.ok(fnBody(src, 'insertEvent').includes("sendUpdates: 'all'"),
    'the invite IS the confirmation email — there is no other mailer');
});

test('the Google description carries the five agreed lines, in order', () => {
  const src = read('api/v1/bookings/index.js');
  const block = src.slice(src.indexOf('const inserted = await G.insertEvent('));
  const labels = [...block.matchAll(/`([A-Z][A-Za-z ]+): \$\{/g)].map((m) => m[1]);
  assert.deepStrictEqual(labels,
    ['Contact', 'Company', 'Products', 'Booking Reference', 'Manage or cancel']);
});

test('the attendee-facing event leaks no CRM identity', () => {
  const src = read('api/v1/bookings/index.js');
  const block = code(src.slice(src.indexOf('const inserted = await G.insertEvent('),
    src.indexOf('const owned = verifyEventOwnership')));
  for (const token of ['zoho_', 'Who_Id', 'What_Id', 'Deal', 'Contact_Name', 'se_module']) {
    assert.equal(block.includes(token), false,
      `\`${token}\` reached the visitor's calendar entry`);
  }
});

test('the booking request path still makes no Zoho call', () => {
  // The browser must never wait on the CRM. The title is read from the row precisely so
  // that it needs no Account resolution.
  const src = code(read('api/v1/bookings/index.js'));
  assert.equal(/require\(['"][^'"]*integrations\/zoho/.test(src), false);
  assert.equal(/\bZ\./.test(src), false, 'no Zoho integration calls in the request path');
});

// ---------------------------------------------------------------------------
// The Meeting anchor is resolved identically on both passes
// ---------------------------------------------------------------------------

test('meetingCreate and dealReconcile resolve the Deal through the same helper', () => {
  const src = code(read('workflows/zoho-ops.js'));

  const calls = (src.match(/Z\.resolveProductDeal\(/g) || []).length;
  assert.strictEqual(calls, 2, 'exactly two Deal resolutions: the create, and the retro-link');

  // Both must route through `meetingAnchor` — once in meetingCreate, once in
  // dealReconcile. A resolution that picked its own product could target a second Deal,
  // defeat `alreadyLinked`, and fire WF007 again.
  const callers = src.replace(fnBody(src, 'meetingAnchor'), '');   // drop its own declaration
  const uses = (callers.match(/meetingAnchor\(j\)/g) || []).length;
  assert.strictEqual(uses, 2, 'each resolution must take its product from meetingAnchor');

  // And nothing bypasses it: `primaryProduct` survives only as the helper's own
  // pre-migration fallback.
  assert.strictEqual((src.match(/primaryProduct\(/g) || []).length, 1,
    'primaryProduct outside meetingAnchor means a call site chose its own anchor rule');
  assert.ok(fnBody(src, 'meetingAnchor').includes('primaryProduct('));
});

test('the anchor falls back to tick order for rows predating the migration', () => {
  const src = code(read('workflows/zoho-ops.js'));
  assert.ok(fnBody(src, 'meetingAnchor').includes('j.meeting_anchor_product || primaryProduct(j)'),
    'falling back to the NEW rule would let an in-flight journey flip its Deal mid-flight');
});
