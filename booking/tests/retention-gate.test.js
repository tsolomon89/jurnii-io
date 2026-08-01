'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { retentionDryRunDecision } = require('../lib/retention-gate');

test('retention is dry-run when execution is DISABLED (the fail-safe default)', () => {
  // Absent, empty, false, and any non-"true" value all mean dry-run.
  for (const env of [{}, { RETENTION_EXECUTION_ENABLED: '' }, { RETENTION_EXECUTION_ENABLED: 'false' },
    { RETENTION_EXECUTION_ENABLED: '0' }, { RETENTION_EXECUTION_ENABLED: 'yes' }]) {
    const d = retentionDryRunDecision({}, env);
    assert.equal(d.dryRun, true, JSON.stringify(env));
    assert.equal(d.reason, 'execution_disabled');
  }
});

test('retention EXECUTES only when armed AND no dryRun query flag', () => {
  // The cron path supplies no query param, so this is the only branch that scrubs.
  const armed = { RETENTION_EXECUTION_ENABLED: 'true' };
  assert.deepEqual(retentionDryRunDecision({}, armed), { dryRun: false, reason: 'execution_enabled' });
  assert.deepEqual(retentionDryRunDecision(undefined, armed), { dryRun: false, reason: 'execution_enabled' });
  // Case-insensitive on the arming value.
  assert.equal(retentionDryRunDecision({}, { RETENTION_EXECUTION_ENABLED: 'TRUE' }).dryRun, false);
});

test('?dryRun=1|true ALWAYS forces dry-run, even when execution is armed', () => {
  const armed = { RETENTION_EXECUTION_ENABLED: 'true' };
  for (const q of [{ dryRun: '1' }, { dryRun: 'true' }]) {
    const d = retentionDryRunDecision(q, armed);
    assert.equal(d.dryRun, true, JSON.stringify(q));
    assert.equal(d.reason, 'query');
  }
});
