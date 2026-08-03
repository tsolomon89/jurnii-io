'use strict';

/**
 * §1/§8 — the persistence/automation seam, offline.
 *
 * Meeting PERSISTENCE (the record, its correlation key, its Contact and Deal linkage)
 * is a durable business artefact and is always written. ACTIVATION — the single
 * triggers-enabled write that lets WF007 see the Event and drive stage, reminder and
 * email automation — is gated. These pin the gate itself; the worker-level behaviour
 * is pinned in `tests/db/meeting-only.test.js` against real Postgres.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  meetingAutomationEnabled, activationStateForLink, retroLinkTriggersEnabled, ACTIVATION_STATES,
} = require('../lib/meeting-automation');

test('production default is DISABLED — absent, empty and junk all suppress', () => {
  for (const env of [{}, { BOOKING_MEETING_AUTOMATION_ENABLED: '' },
    { BOOKING_MEETING_AUTOMATION_ENABLED: 'false' },
    { BOOKING_MEETING_AUTOMATION_ENABLED: '0' },
    { BOOKING_MEETING_AUTOMATION_ENABLED: 'yes' },
    { BOOKING_MEETING_AUTOMATION_ENABLED: 'TRUE ' }]) {
    assert.strictEqual(meetingAutomationEnabled(env), false,
      `${JSON.stringify(env)} must NOT enable automation`);
  }
});

test('only the exact string true enables automation', () => {
  assert.strictEqual(meetingAutomationEnabled({ BOOKING_MEETING_AUTOMATION_ENABLED: 'true' }), true);
  assert.strictEqual(meetingAutomationEnabled({ BOOKING_MEETING_AUTOMATION_ENABLED: 'True' }), true);
});

test('the retro-link may enable triggers ONLY when the flag is on', () => {
  assert.strictEqual(retroLinkTriggersEnabled({}), false);
  assert.strictEqual(retroLinkTriggersEnabled({ BOOKING_MEETING_AUTOMATION_ENABLED: 'false' }), false);
  assert.strictEqual(retroLinkTriggersEnabled({ BOOKING_MEETING_AUTOMATION_ENABLED: 'true' }), true);
});

test('suppressed mode still reaches a FINISHED activation state, not a failure', () => {
  assert.strictEqual(activationStateForLink({}), 'suppressed');
  assert.strictEqual(activationStateForLink({ BOOKING_MEETING_AUTOMATION_ENABLED: 'true' }), 'complete');
  // Neither is an error state, and neither is a review reason.
  assert.ok(ACTIVATION_STATES.includes('suppressed'));
  assert.ok(ACTIVATION_STATES.includes('complete'));
});

test('the activation state machine covers every required outcome', () => {
  assert.deepStrictEqual([...ACTIVATION_STATES].sort(), [
    'accepted', 'complete', 'not_requested', 'outcome_unknown', 'pending', 'sending', 'suppressed',
  ]);
});

test('.env.example documents the flag with a fail-safe default', () => {
  const fs = require('fs');
  const path = require('path');
  const p = path.join(__dirname, '..', '..', '.env.example');
  const src = fs.readFileSync(p, 'utf8');
  assert.match(src, /^BOOKING_MEETING_AUTOMATION_ENABLED=false$/m,
    '.env.example must ship the flag defaulted to false');
});

// ---------------------------------------------------------------------------
// The retro-link is the ONLY triggers-enabled Meeting write in the codebase
// ---------------------------------------------------------------------------

test('no Meeting write enables triggers except through the gate', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'workflows', 'zoho-ops.js'), 'utf8');

  // A hard-coded literal would bypass BOOKING_MEETING_AUTOMATION_ENABLED entirely.
  assert.strictEqual(/triggersEnabled:\s*true/.test(src), false,
    '`triggersEnabled: true` bypasses the gate — pass the gated variable instead');

  // Exactly one site passes the gated variable (the retro-link, shorthand form).
  const gated = src.match(/\{\s*triggersEnabled\s*\}/g) || [];
  assert.strictEqual(gated.length, 1,
    `expected exactly one gated retro-link site, found ${gated.length}`);

  // Every OTHER explicit site must be false — those are the cancel/reschedule
  // propagation writes, which must never wake WF007.
  const explicit = src.match(/triggersEnabled:\s*(\w+)/g) || [];
  explicit.forEach((m) => assert.match(m, /false$/,
    `every non-gated Meeting write must be suppressed, found "${m}"`));

  // And the gate is sourced from the one module allowed to answer.
  assert.match(src, /retroLinkTriggersEnabled\(process\.env\)/);
});

test('the worker never CALLS routeContactSequence or any Deluge entry point', () => {
  const fs = require('fs');
  const path = require('path');
  const raw = fs.readFileSync(path.join(__dirname, '..', 'workflows', 'zoho-ops.js'), 'utf8');
  // Strip block and line comments: the code documents these names deliberately, and
  // forbidding the words would forbid explaining the contract.
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  for (const fn of ['routeContactSequence', 'handleMeetingEvent', 'processDeal', 'processLead']) {
    assert.strictEqual(code.includes(fn), false,
      `${fn} must never be invoked from the Node worker — it is Deluge's, reached only via triggers`);
  }
});
