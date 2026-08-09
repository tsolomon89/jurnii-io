'use strict';

/**
 * The converted-Lead `Who_Id` guard, and the error detail that made it findable.
 *
 * REGRESSION (production journey ef6397f4, confirmed 2026-08-03, reproduced 2026-08-09):
 * a real prospect's demo reached the calendar with NO Meeting in the CRM. The Meeting
 * create sent `Who_Id` = the Lead id while `lead_terminal_update_state` was `sending` —
 * a ~700ms window — but Deluge `processLead` had already converted that Lead. A converted
 * Lead id in `Who_Id` is HTTP 400 / INVALID_DATA, which `classify()` treats as TERMINAL,
 * so the journey escalated instead of retrying and no Meeting was ever created.
 *
 * Verified against the live org on 2026-08-09 with an otherwise identical payload:
 *   no Who_Id            -> created
 *   Who_Id = Contact id  -> created
 *   Who_Id = converted Lead id -> zoho_http_400, terminal
 *
 * The guard had been keyed on `accepted` alone. The question it must ask is not "do we
 * believe the Lead is converted" but "can we PROVE it is not".
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ops = require('../workflows/zoho-ops');
const Z = require('../integrations/zoho');

// Every value `bj_lead_terminal_update_state` permits (0001_init.sql).
const ALL_STATES = ['not_sent', 'sending', 'accepted', 'rejected', 'outcome_unknown', 'unresolved'];

// ---------------------------------------------------------------------------
// The predicate
// ---------------------------------------------------------------------------

test('a Lead is addressable ONLY when the conversion trigger provably never landed', () => {
  const addressable = ALL_STATES.filter((s) => ops.leadStillAddressable({ lead_terminal_update_state: s }));
  assert.deepStrictEqual(addressable, ['not_sent', 'rejected'],
    'not_sent = never issued; rejected = refused terminally, so processLead never ran');
});

test('`sending` is NOT addressable — that is the window that stranded a real booking', () => {
  // markLeadUpdateSending commits `sending` BEFORE the request leaves, precisely so a
  // lost response cannot be replayed. Zoho may therefore already hold it, and
  // processLead converts within seconds.
  assert.strictEqual(ops.leadStillAddressable({ lead_terminal_update_state: 'sending' }), false);
});

test('every not-provably-unconverted state falls through to the Contact wait', () => {
  for (const s of ['sending', 'accepted', 'outcome_unknown', 'unresolved']) {
    assert.strictEqual(ops.leadStillAddressable({ lead_terminal_update_state: s }), false, s);
  }
});

test('an unknown or missing state is treated as unsafe', () => {
  // Fail closed: a Meeting with no person is recoverable — dealReconcile applies Who_Id
  // and What_Id together later — whereas a terminal reject is not.
  for (const s of [undefined, null, '', 'something_new']) {
    assert.strictEqual(ops.leadStillAddressable({ lead_terminal_update_state: s }), false, String(s));
  }
  assert.strictEqual(ops.leadStillAddressable({}), false);
});

test('the guard is not bypassed anywhere else in the worker', () => {
  // The bug was three separate comparisons against `accepted`, two of which disagreed
  // with the third. One predicate, used everywhere, is what stops that recurring.
  const src = fs.readFileSync(path.join(__dirname, '..', 'workflows', 'zoho-ops.js'), 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n');
  assert.equal(/lead_terminal_update_state\s*[=!]==\s*'accepted'/.test(src), false,
    'compare through leadStillAddressable, never against a single state');

  const uses = (src.match(/leadStillAddressable\(/g) || []).length;
  assert.ok(uses >= 4,
    `expected the predicate at its definition plus all three decision sites, saw ${uses}`);
});

// ---------------------------------------------------------------------------
// The error detail that made the cause visible
// ---------------------------------------------------------------------------

test('describeZohoError names the refused FIELD, not just the transport code', () => {
  // This is the shape Zoho returns for a bad lookup, and it is exactly what was missing:
  // the log said `zoho_http_400` and nothing else, so the cause had to be bisected by
  // hand against the live org.
  const err = new Z.ZohoError('zoho_http_400', {
    data: [{
      code: 'INVALID_DATA',
      details: { api_name: 'Who_Id', expected_data_type: 'jsonobject' },
      message: 'invalid data',
      status: 'error',
    }],
  });
  assert.deepStrictEqual(Z.describeZohoError(err), [
    { code: 'INVALID_DATA', api_name: 'Who_Id', expected_data_type: 'jsonobject' },
  ]);
});

test('a request-level error with no `data` array is still described', () => {
  const err = new Z.ZohoError('zoho_http_400', {
    code: 'REQUIRED_PARAM_MISSING', details: { api_name: 'fields' }, message: 'required parameter missing',
  });
  assert.deepStrictEqual(Z.describeZohoError(err),
    [{ code: 'REQUIRED_PARAM_MISSING', api_name: 'fields' }]);
});

test('the description carries no free text and no field VALUES', () => {
  // A rejected payload holds the visitor's email, phone and company. An application log
  // is not the place for them, which is why only Zoho's code and field NAMES are kept.
  const err = new Z.ZohoError('zoho_http_400', {
    data: [{
      code: 'INVALID_DATA',
      details: { api_name: 'Email', expected_data_type: 'email', value: 'sarah@betco.example' },
      message: 'the email sarah@betco.example is not valid',
    }],
  });
  const out = Z.describeZohoError(err);
  const serialized = JSON.stringify(out);
  assert.equal(serialized.includes('sarah@betco.example'), false, 'a field value leaked');
  assert.equal(serialized.includes('is not valid'), false, 'free-text message leaked');
  assert.deepStrictEqual(out, [{ code: 'INVALID_DATA', api_name: 'Email', expected_data_type: 'email' }]);
});

test('describeZohoError is null-safe and bounded', () => {
  assert.strictEqual(Z.describeZohoError(null), null);
  assert.strictEqual(Z.describeZohoError(new Z.ZohoError('zoho_network_error', 'socket hang up')), null);
  assert.strictEqual(Z.describeZohoError(new Z.ZohoError('zoho_http_400', {})), null);

  // Many per-record errors must not turn one log line into a flood.
  const many = { data: Array.from({ length: 40 }, (_, i) => ({ code: 'INVALID_DATA', details: { index: i } })) };
  assert.ok(Z.describeZohoError(new Z.ZohoError('zoho_http_400', many)).length <= 5);

  // A hostile or runaway value is truncated rather than logged whole.
  const long = { code: 'INVALID_DATA', details: { api_name: 'x'.repeat(5000) } };
  assert.ok(Z.describeZohoError(new Z.ZohoError('zoho_http_400', long))[0].api_name.length <= 64);
});

test('classify carries the detail through to the worker', () => {
  const err = new Z.ZohoError('zoho_http_400', {
    data: [{ code: 'INVALID_DATA', details: { api_name: 'Who_Id' } }],
  });
  const c = ops.classify(err);
  assert.strictEqual(c.kind, 'terminal');
  assert.strictEqual(c.code, 'zoho_http_400');
  assert.deepStrictEqual(c.detail, [{ code: 'INVALID_DATA', api_name: 'Who_Id' }]);

  // A non-Zoho error still classifies, with no detail rather than a crash.
  assert.deepStrictEqual(ops.classify(new Error('boom')),
    { kind: 'retryable', code: 'zoho_unknown_error', retryAfter: null, detail: null });
});

test('the terminal escalations log the detail', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'workflows', 'zoho-ops.js'), 'utf8');
  for (const evt of ['zoho.meeting.create_rejected', 'zoho.deal.link_rejected']) {
    const line = src.split('\n').find((l) => l.includes(evt));
    assert.ok(line, `${evt} log line is missing`);
    assert.ok(line.includes('detail: c.detail'),
      `${evt} must log the field-level detail, not just the transport code`);
  }
});
