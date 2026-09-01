'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Z = require('../zoho');

const SNAPSHOT = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'zoho-fields.json'), 'utf8'));

const ACTIVITY_ID = 'act_x6esGLhoPa2SMHCZ7';

function description(overrides = {}) {
  return Z.buildDescription(Object.assign({
    activityId: ACTIVITY_ID,
    sentAtIso: '2026-08-30T14:03:11+00:00',
    campaignName: 'Q3 UK Operators',
    campaignId: 'cam_oxeGg6paG3ZVxjHkH',
    sequenceStep: 3,
    senderEmail: 'alex.doe@example.com',
    lemlistContactId: 'ctc_FkeUdQHEfhqG2HMbK',
    body: 'Hi Tuf, saw your work on the sportsbook rebuild.',
    bodyAvailable: true,
  }, overrides));
}

function payload(overrides = {}) {
  return Z.buildTaskPayload(Object.assign({
    activityId: ACTIVITY_ID,
    zohoContactId: '991103000002883343',
    zohoAccountId: '991103000002872067',
    zohoOwnerId: '991103000001576001',
    description: description(),
  }, overrides));
}

// ---------------------------------------------------------------------------
// The Subject is the import identity
// ---------------------------------------------------------------------------

test('taskSubject is a pure function of the activity id alone', () => {
  assert.equal(Z.taskSubject(ACTIVITY_ID), `LinkedIn Sent ${ACTIVITY_ID}`);
  assert.equal(Z.taskSubject.length, 1,
    'a second parameter would let a mutable value such as a campaign name in');
});

test('the Subject is colon-free, so it cannot break Zoho search criteria', () => {
  assert.ok(!Z.taskSubject(ACTIVITY_ID).includes(':'));
});

test('the Subject fits the live Subject length', () => {
  assert.ok(Z.taskSubject(ACTIVITY_ID).length <= SNAPSHOT.lengths.Tasks.Subject);
});

test('taskSubject refuses an activity id it cannot vouch for', () => {
  for (const bad of ['', null, 'lea_abcdef', "act_x' OR '1'='1", 'act_ab', 'Act_abcdef']) {
    assert.throws(() => Z.taskSubject(bad), /lemlist_activity_id_invalid/, String(bad));
  }
});

// ---------------------------------------------------------------------------
// Payload shape and — more importantly — omissions
// ---------------------------------------------------------------------------

test('the payload carries exactly the intended keys', () => {
  const p = payload();
  assert.deepEqual(Object.keys(p).sort(), [
    '$se_module', 'Description', 'Owner', 'Status', 'Subject',
    'Task_Sequence_Managed', 'What_Id', 'Who_Id',
  ]);
  assert.equal(p.Status, 'Completed');
  assert.deepEqual(p.Who_Id, { id: '991103000002883343' });
  assert.equal(p.Task_Sequence_Managed, false);
});

test('every field written exists on the live Tasks module and is writable', () => {
  const live = new Set(SNAPSHOT.modules.Tasks);
  const readOnly = new Set(SNAPSHOT.readOnly.Tasks);
  const unused = new Set(SNAPSHOT.unused.Tasks || []);

  for (const key of Z.TASK_PAYLOAD_FIELDS) {
    if (key === '$se_module') continue;   // a Zoho control key, not a field
    assert.ok(live.has(key), `api_name not on the live Tasks module: ${key}`);
    assert.ok(!readOnly.has(key), `field is read-only and would be discarded: ${key}`);
    assert.ok(!unused.has(key), `field is off-layout and would be silently discarded: ${key}`);
  }

  // And nothing outside the declared allow-list can appear.
  for (const key of Object.keys(payload())) {
    assert.ok(Z.TASK_PAYLOAD_FIELDS.includes(key), `undeclared payload key: ${key}`);
  }
});

test('every load-bearing omission holds', () => {
  const p = payload();
  // Each of these is omitted against a specific live guard; see zoho.js.
  for (const key of [
    'Task_Type',              // no safe picklist member; blank keeps WF008 a no-op
    'Task_State',             // blank is an independent handleTaskCompletion guard
    'Task_Status',
    'Due_Date',               // a date, AND WFC-SchedEmail's trigger field
    'Closed_Time',            // read-only in this org
    'Blocks_Sequence',        // RETIRE field, zero readers
    'Task_Stage',             // incompatible stage vocabularies
    'Task_Sequence_Stage',
    'Task_Opportunity',
    'Task_Pipeline',
    'Priority', 'Remind_At', 'Send_Notification_Email', 'Tag', 'Recurring_Activity',
  ]) {
    assert.ok(!(key in p), `must not be written: ${key}`);
  }
});

test('Task_Sequence_Managed is written false EXPLICITLY, not merely omitted', () => {
  // If the field ever acquires a Zoho default of `true`, omission would silently
  // arm routeContactSequence's blocking predicate.
  assert.equal('Task_Sequence_Managed' in payload(), true);
  assert.equal(payload().Task_Sequence_Managed, false);
});

test('Due_Date is never written, because it triggers a rule that emails prospects', () => {
  // WFC-SchedEmail (991103000001499121) is date_or_datetime on Tasks.Due_Date and
  // its action chain reaches sendSequencedEmail.
  const p = payload();
  assert.ok(!('Due_Date' in p));
  assert.ok(!Z.TASK_PAYLOAD_FIELDS.includes('Due_Date'));
});

// ---------------------------------------------------------------------------
// What_Id / $se_module pairing
// ---------------------------------------------------------------------------

test('What_Id and $se_module travel together', () => {
  const withAccount = payload({ zohoAccountId: '991103000002872067' });
  assert.deepEqual(withAccount.What_Id, { id: '991103000002872067' });
  assert.equal(withAccount.$se_module, 'Accounts');
});

test('with no Account, BOTH What_Id and $se_module are omitted', () => {
  const noAccount = payload({ zohoAccountId: null });
  assert.ok(!('What_Id' in noAccount));
  assert.ok(!('$se_module' in noAccount),
    '$se_module is the discriminator FOR What_Id; alone it is meaningless');
  // Who_Id still carries the Contact association.
  assert.deepEqual(noAccount.Who_Id, { id: '991103000002883343' });
});

test('a Task without a Contact is not constructible', () => {
  assert.throws(() => payload({ zohoContactId: null }), /lemlist_task_requires_contact/);
});

test('Owner is omitted rather than guessed when no sender maps', () => {
  const p = payload({ zohoOwnerId: null });
  assert.ok(!('Owner' in p), 'Zoho then defaults to the API user; an arbitrary user is never chosen');
});

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

test('machine tokens lead, because truncation cuts from the end', () => {
  const d = description();
  assert.ok(d.startsWith('[lemlist_activity] act_x6esGLhoPa2SMHCZ7\n'), d.slice(0, 80));
  const lines = d.split('\n');
  assert.equal(lines[1], 'sent_at: 2026-08-30T14:03:11+00:00');
  // Every token precedes the body separator.
  const sep = lines.indexOf('--- message ---');
  assert.ok(sep > 0);
  assert.ok(lines.slice(0, sep).some((l) => l.startsWith('campaign: ')));
  assert.ok(lines.slice(0, sep).some((l) => l.startsWith('sender: ')));
  assert.ok(lines.slice(0, sep).some((l) => l.startsWith('lemlist_contact: ')));
});

test('sent_at is the only home for the exact send instant', () => {
  // Closed_Time is read-only and Due_Date is a date, so this line is it.
  const d = description({ sentAtIso: '2026-08-30T23:30:00+00:00' });
  assert.ok(d.includes('sent_at: 2026-08-30T23:30:00+00:00'));
});

test('an unavailable body is one fixed sentence, never an empty section', () => {
  const d = description({ body: null, bodyAvailable: false });
  const after = d.split('--- message ---\n')[1];
  assert.equal(after, Z.BODY_UNAVAILABLE);
  assert.ok(after.length > 0, '"we looked and it is not there" must be distinguishable from silence');
});

test('a long body is truncated with an explicit marker, not silently', () => {
  const long = 'x'.repeat(9000);
  const d = description({ body: long, bodyAvailable: true });
  assert.ok(d.includes('[truncated:'), 'truncation must announce itself');
  assert.ok(d.length < SNAPSHOT.lengths.Tasks.Description);
});

test('the Description fits the live field length even at maximum body', () => {
  const d = description({ body: 'y'.repeat(100000), bodyAvailable: true });
  assert.ok(d.length <= SNAPSHOT.lengths.Tasks.Description,
    `built ${d.length} chars, limit ${SNAPSHOT.lengths.Tasks.Description}`);
});

// ---------------------------------------------------------------------------
// Deluge marker safety
// ---------------------------------------------------------------------------

test('a body carrying a Deluge control marker is REFUSED, not written', () => {
  for (const marker of Z.DELUGE_DESCRIPTION_MARKERS) {
    assert.throws(
      () => description({ body: `hello ${marker} world`, bodyAvailable: true }),
      /lemlist_description_marker_conflict/,
      `must refuse a body containing ${JSON.stringify(marker)}`);
  }
});

test('the forbidden marker list matches the markers the Deluge sources actually use', () => {
  // Parsed from the real Deluge tree, so a NEW marker added there shows up here
  // as a failure rather than as a silent gap.
  const root = path.join(__dirname, '..', '..', '..', 'zoho-functions', 'v6');
  if (!fs.existsSync(root)) return;   // the Deluge tree is not always checked out

  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.deluge')) files.push(p);
    }
  }(root));

  const source = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  // The marker shapes Deluge tests Description against.
  const found = new Set();
  for (const m of source.match(/contains\("([A-Za-z ]+[|:] ?)"\)/g) || []) {
    const inner = /contains\("(.+)"\)/.exec(m);
    if (inner) found.add(inner[1]);
  }

  for (const marker of found) {
    assert.ok(Z.DELUGE_DESCRIPTION_MARKERS.includes(marker),
      `Deluge tests Description for ${JSON.stringify(marker)} but it is not in DELUGE_DESCRIPTION_MARKERS`);
  }
});

test('a body that merely contains square brackets is fine', () => {
  // A prospect writing "[great work]" is harmless; the guard is narrow on purpose.
  const d = description({ body: 'Loved the [new] design', bodyAvailable: true });
  assert.ok(d.includes('Loved the [new] design'));
});

// ---------------------------------------------------------------------------
// HTML body transform
// ---------------------------------------------------------------------------

test('the transform strips tracking pixels and lemlst.org URLs', () => {
  // Verbatim shape from Lemlist's own documented example body.
  const html = '<html><div dir="ltr"><div>Hello!<br><br>Book '
    + '<a href="https://app.lemcal.com/@alex-doe/quick-meeting?leadId=lea_x">my lemcal</a>'
    + '</div></div>'
    + '<span summary="/api/reply/data-ll-tsk_x"></span>'
    + '<img alt="logo" src="https://zr0.lemlst.org/api/track/open/usr_x/tsk_y" height="1" width="1">'
    + '</html>';

  const text = Z.htmlToPlainText(html);

  assert.ok(!text.includes('<img'), 'no image tag may survive');
  assert.ok(!/lemlst\.org/i.test(text),
    'a surviving tracking URL would fire false "open" events back into Lemlist');
  assert.ok(text.includes('Hello!'));
  assert.ok(text.includes('my lemcal'), 'anchor text is kept');
  assert.ok(text.includes('app.lemcal.com'), 'a non-tracking href is kept');
});

test('the transform drops quoted reply chains and script/style', () => {
  const html = '<style>p{color:red}</style><script>alert(1)</script>'
    + '<div>My message</div>'
    + '<blockquote class="gmail_quote"><div>Everything they said before</div></blockquote>';
  const text = Z.htmlToPlainText(html);
  assert.ok(text.includes('My message'));
  assert.ok(!text.includes('Everything they said before'));
  assert.ok(!text.includes('alert(1)'));
  assert.ok(!text.includes('color:red'));
});

test('entities decode once, so &amp;lt; cannot become a tag', () => {
  assert.equal(Z.htmlToPlainText('<p>a &amp;lt; b</p>'), 'a &lt; b');
  assert.equal(Z.htmlToPlainText('<p>5 &gt; 3 &amp; 2 &lt; 4</p>'), '5 > 3 & 2 < 4');
});

test('the transform is total: never throws, always returns a string', () => {
  for (const input of [null, undefined, '', 42, {}, '<div', '<<<>>>']) {
    assert.equal(typeof Z.htmlToPlainText(input), 'string', String(input));
  }
});

// ---------------------------------------------------------------------------
// The absence guards that keep this subsystem inside its remit
// ---------------------------------------------------------------------------

test('no Deal, Quote or update path exists', () => {
  for (const name of [
    'createDeal', 'createQuote', 'updateDeal', 'updateQuote',
    'updateContact', 'updateAccount', 'updateContactSuppressed', 'updateAccountSuppressed',
    'createField', 'createPicklistValue', 'createWorkflow', 'updateFieldMetadata',
  ]) {
    assert.equal(Z[name], undefined, `must not exist: ${name}`);
  }
});

test('the only Zoho write paths are Accounts, Contacts and Tasks — all suppressed', () => {
  const code = fs.readFileSync(require.resolve('../zoho.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

  const writes = code.match(/requestZoho\('(POST|PUT|PATCH|DELETE)', '([^']+)'/g) || [];
  const paths = writes.map((w) => /'([^']+)'\s*$/.exec(w)[1]);
  assert.deepEqual(paths.sort(), ['/crm/v6/Accounts', '/crm/v6/Contacts', '/crm/v6/coql'].sort(),
    'unexpected write path');

  // Every record write passes an explicit empty trigger array.
  const recordWrites = code.match(/writePayload\([^)]*\)/g) || [];
  assert.ok(recordWrites.length >= 2);
  for (const w of recordWrites) {
    assert.ok(/writePayload\(\s*\w+\s*,\s*\[\]\s*\)/.test(w),
      `write is not suppressed: ${w}`);
  }
  // And no PUT/PATCH to a record module exists at all.
  assert.ok(!/requestZoho\('(PUT|PATCH)'/.test(code), 'v1 has no update path');
});
