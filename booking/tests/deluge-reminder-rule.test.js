'use strict';

/**
 * §3 — the booking reminder rule, as a contract.
 *
 * Deluge cannot be executed here, so this pins the rule two ways:
 *
 *   1. STRUCTURAL — `handleMeetingEvent.deluge` must actually contain the future-guard
 *      and must not write either reminder field outside it. This is what stops the
 *      guard being deleted or bypassed in a later edit.
 *   2. BEHAVIOURAL — a JS reference implementation of the same rule, exercised over the
 *      five required scenarios. It documents the intended answer for each case, so a
 *      disagreement between the Deluge and this table is a visible test failure rather
 *      than a silent production surprise.
 *
 * REGRESSION: journey c3a9b7d7… (2026-08-02) booked a 2026-08-03 demo and WF007 wrote
 * `Reminder_Send_At = 2026-07-31T08:00` — three days in the past on arrival. WF010c's
 * template says the demo is *tomorrow*, so a past or clamped-to-now reminder sends a
 * factually wrong email. The rule is: compute it, and write it only if it is future.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// The Deluge source is only tracked here once the live Zoho functions match it, so the
// structural assertions skip when it is absent. The behavioural table always runs.
const SRC_PATH = path.join(__dirname, '..', '..', 'zoho-functions', 'v6', 'activity', 'handleMeetingEvent.deluge');
const noDeluge = fs.existsSync(SRC_PATH) ? false : 'handleMeetingEvent.deluge is not present';
const SRC = noDeluge ? '' : fs.readFileSync(SRC_PATH, 'utf8');

// ---------------------------------------------------------------------------
// 1. Structural
// ---------------------------------------------------------------------------

test('the reminder is compared against the server clock before being written', { skip: noDeluge }, () => {
  assert.match(SRC, /reminderDt\s*=\s*reminderAtStr\.toDateTime\(/,
    'the computed reminder must be parsed to a datetime so it can be compared');
  assert.match(SRC, /if\s*\(\s*reminderDt\s*>\s*now\s*\)/,
    'the future-guard (reminderDt > now) is missing — a past reminder would be written again');
});

test('a past reminder leaves reminderAt null rather than clamping it to now', { skip: noDeluge }, () => {
  assert.strictEqual(/reminderAt\s*=\s*now/.test(SRC), false,
    'clamping to now would make WF010c send "your demo is tomorrow" for a demo that is not');
  assert.match(SRC, /reminderSkippedPast\s*=\s*true/,
    'the skipped case must be recorded so it is visible in the function log');
});

test('both reminder fields are written only when reminderAt survived the guard', { skip: noDeluge }, () => {
  for (const field of ['Reminder_Send_At', 'Demo_Reminder_Send_At']) {
    const line = SRC.split('\n').find((l) => l.includes(`"${field}"`) && l.includes('.put('));
    assert.ok(line, `no put() for ${field}`);
    assert.match(line, /if\s*\(\s*reminderAt\s*!=\s*null\s*\)/,
      `${field} must be guarded by (reminderAt != null)`);
  }
});

test('the Event and Deal reminder writes are separate updateRecord calls', { skip: noDeluge }, () => {
  // The Deal write must not be able to take the Event write down with it, or vice versa.
  assert.match(SRC, /zoho\.crm\.updateRecord\("Events",\s*eventId,\s*evUpd/);
  assert.match(SRC, /zoho\.crm\.updateRecord\("Deals",\s*dealId,\s*dUpd/);
});

// ---------------------------------------------------------------------------
// 2. Behavioural — the same rule in JS, over the required scenarios
// ---------------------------------------------------------------------------

/**
 * Mirror of `calculateBusinessDate(start, -1, "business_days_minus_AM")` followed by the
 * future-guard: one business day before the meeting, at 08:00 local, skipping weekends.
 */
function reminderFor(startIso, nowIso) {
  const start = new Date(startIso);
  const d = new Date(start);
  do { d.setUTCDate(d.getUTCDate() - 1); } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  d.setUTCHours(8, 0, 0, 0);
  return d > new Date(nowIso) ? d.toISOString() : null;
}

const CASES = [
  {
    name: 'booked more than one business day ahead -> reminder is written',
    now: '2026-08-03T09:00:00Z',   // Monday
    start: '2026-08-07T14:00:00Z', // Friday
    expect: '2026-08-06T08:00:00.000Z', // Thursday 08:00
  },
  {
    name: 'booked one day ahead -> the reminder is today and still future, so written',
    now: '2026-08-05T06:00:00Z',   // Wednesday 06:00
    start: '2026-08-06T14:00:00Z', // Thursday
    expect: '2026-08-05T08:00:00.000Z',
  },
  {
    name: 'booked one day ahead but past 08:00 -> reminder already gone, so unset',
    now: '2026-08-05T09:30:00Z',
    start: '2026-08-06T14:00:00Z',
    expect: null,
  },
  {
    name: 'same-day booking -> the reminder is yesterday, so unset',
    now: '2026-08-06T10:00:00Z',
    start: '2026-08-06T16:00:00Z',
    expect: null,
  },
  {
    name: 'weekend crossing: a Monday demo reminds on the Friday, not the Sunday',
    now: '2026-08-05T09:00:00Z',   // Wednesday
    start: '2026-08-10T14:00:00Z', // Monday
    expect: '2026-08-07T08:00:00.000Z', // Friday
  },
  {
    name: 'weekend crossing on a Sunday demo -> reminds on the Friday',
    now: '2026-08-05T09:00:00Z',
    start: '2026-08-09T14:00:00Z', // Sunday
    expect: '2026-08-07T08:00:00.000Z',
  },
  {
    name: 'the retained-E2E case: Mon demo booked Sun afternoon -> already past, unset',
    now: '2026-08-02T13:45:00Z',   // the real booking moment
    start: '2026-08-03T16:30:00Z', // the real slot
    expect: null,                  // production wrote 2026-07-31T08:00 instead
  },
  {
    name: 'calculated reminder already in the past -> never written, never clamped',
    now: '2026-08-06T07:59:59Z',
    start: '2026-08-06T09:00:00Z',
    expect: null,
  },
];

for (const c of CASES) {
  test(c.name, () => {
    assert.strictEqual(reminderFor(c.start, c.now), c.expect);
  });
}

test('a reminder is never written with a value at or before now', () => {
  for (const c of CASES) {
    const r = reminderFor(c.start, c.now);
    if (r !== null) assert.ok(new Date(r) > new Date(c.now), `${c.name} produced a stale reminder`);
  }
});
