'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const L = require('../lemlist');

const SOURCE = fs.readFileSync(require.resolve('../lemlist.js'), 'utf8');

/**
 * Strip documentation so the absence guards below test EXECUTABLE code.
 *
 * The header comment has to name `/inbox/linkedin` in order to explain why the
 * client must never reach it, so a naive whole-file grep would fail on its own
 * rationale. Only block comments and whole-line `//` comments are removed —
 * deliberately not trailing comments, and never anything inside a string
 * literal, because over-stripping could hide a real violation.
 */
function strippedSource() {
  return SOURCE
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');
}

// ---------------------------------------------------------------------------
// The client cannot mutate anything. This is the safety property.
// ---------------------------------------------------------------------------

test('no mutating method is exported', () => {
  for (const name of ['post', 'put', 'patch', 'delete', 'del', 'send', 'request', 'rawRequest']) {
    assert.equal(L[name], undefined, `must not export ${name}`);
  }
});

test('every export is a read, a pure builder, or an error type', () => {
  const allowed = new Set([
    'LemlistError', 'RETRYABLE_CODES', 'TERMINAL_CODES',
    'activitiesPath', 'inboxPath', 'teamPath', 'routeToken',
    'get', 'getActivitiesPage', 'fetchActivities', 'getInboxMessages', 'getTeamUsers',
  ]);
  for (const name of Object.keys(L)) {
    assert.ok(allowed.has(name), `unexpected export, review it for mutation: ${name}`);
  }
});

test('the send endpoints do not appear in executable source', () => {
  const code = strippedSource();
  for (const forbidden of ['/inbox/linkedin', '/inbox/email', '/inbox/whatsapp']) {
    assert.ok(!code.includes(forbidden),
      `executable source must not reference the send endpoint ${forbidden}`);
  }
});

test('the transport cannot issue a non-GET request', () => {
  const code = strippedSource();
  // Exactly one method literal, and it is GET.
  const methods = code.match(/method:\s*'[A-Z]+'/g) || [];
  assert.deepEqual(methods, ["method: 'GET'"],
    'the only HTTP method in executable source must be GET');
  for (const verb of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.ok(!code.includes(`'${verb}'`), `executable source must not contain the verb ${verb}`);
  }
  // No request body can be written, so no mutation payload can be constructed.
  assert.ok(!/req\.write\(/.test(code), 'the transport must never write a request body');
});

test('markAsRead is unrepresentable, not merely defaulted to false', () => {
  const code = strippedSource();
  assert.ok(!code.includes('markAsRead'),
    'markAsRead must not appear in executable source at all');

  // And no caller can smuggle it in through the options bag.
  const path = L.inboxPath('ctc_FkeUdQHEfhqG2HMbK', { limit: 50, skip: 0, markAsRead: true });
  assert.ok(!path.includes('markAsRead'), `built path leaked markAsRead: ${path}`);
});

// ---------------------------------------------------------------------------
// Path builders
// ---------------------------------------------------------------------------

test('activitiesPath always sends version=v2 and omits empty params', () => {
  const p = L.activitiesPath({
    type: 'linkedinSent',
    minDate: '2026-08-24T00:00:00Z',
    maxDate: '2026-08-31T00:00:00Z',
    offset: 100,
    limit: 100,
  });
  assert.ok(p.startsWith('/activities?'), p);
  assert.ok(p.includes('version=v2'), p);
  assert.ok(p.includes('type=linkedinSent'), p);
  assert.ok(p.includes('offset=100'), p);
  assert.ok(p.includes('limit=100'), p);

  // Absent optionals must not appear as empty keys, which Lemlist may reject.
  const bare = L.activitiesPath({ type: 'linkedinSent' });
  assert.ok(!bare.includes('campaignId'), bare);
  assert.ok(!bare.includes('minDate'), bare);
});

test('inboxPath encodes the contact id', () => {
  assert.equal(L.inboxPath('ctc_abc'), '/inbox/ctc_abc?limit=100&skip=0');
  assert.ok(L.inboxPath('a/b').includes('a%2Fb'), 'path separator must be encoded');
});

test('routeToken never leaks an id', () => {
  assert.equal(L.routeToken('/activities?version=v2&type=x'), 'activities');
  assert.equal(L.routeToken('/inbox/ctc_FkeUdQHEfhqG2HMbK?limit=100'), 'inbox');
  assert.equal(L.routeToken('/team'), 'team');
  assert.equal(L.routeToken('/something-else'), 'other');
  // The token is what reaches the log, so it must carry no contact id.
  assert.ok(!L.routeToken('/inbox/ctc_FkeUdQHEfhqG2HMbK').includes('ctc_'));
});

// ---------------------------------------------------------------------------
// Ordinary offset pagination
// ---------------------------------------------------------------------------

function fakePages(total) {
  const all = Array.from({ length: total }, (_, i) => ({ _id: `act_${String(i).padStart(6, '0')}` }));
  const calls = [];
  const fetchPage = async ({ offset, limit }) => {
    calls.push({ offset, limit });
    return all.slice(offset, offset + limit);
  };
  return { all, calls, fetchPage };
}

test('fetchActivities pages until a short page and returns every activity', async () => {
  const { all, calls, fetchPage } = fakePages(250);

  const out = await L.fetchActivities({ type: 'linkedinSent', fetchPage });

  assert.equal(out.activities.length, 250, 'all 250 activities must be returned');
  assert.equal(out.truncated, false);
  assert.equal(out.pages, 3, 'three pages: 100, 100, 50');
  assert.deepEqual(calls.map((c) => c.offset), [0, 100, 200]);
  assert.deepEqual(out.activities.map((a) => a._id), all.map((a) => a._id));
});

test('fetchActivities stops after a single short page', async () => {
  const { calls, fetchPage } = fakePages(12);
  const out = await L.fetchActivities({ type: 'linkedinSent', fetchPage });
  assert.equal(out.activities.length, 12);
  assert.equal(out.pages, 1);
  assert.deepEqual(calls.map((c) => c.offset), [0]);
});

test('fetchActivities on an exact multiple of the page size still terminates', async () => {
  // 200 activities means page 2 is full, so a third (empty) request is required
  // to learn the window is exhausted. Getting this wrong loses the last page or
  // loops forever.
  const { calls, fetchPage } = fakePages(200);
  const out = await L.fetchActivities({ type: 'linkedinSent', fetchPage });
  assert.equal(out.activities.length, 200);
  assert.equal(out.truncated, false);
  assert.deepEqual(calls.map((c) => c.offset), [0, 100, 200]);
});

test('fetchActivities reports truncation instead of silently returning a partial window', async () => {
  const { fetchPage } = fakePages(1000);
  const out = await L.fetchActivities({ type: 'linkedinSent', fetchPage, maxPages: 2 });
  assert.equal(out.activities.length, 200);
  assert.equal(out.truncated, true, 'a capped run must announce itself');
});

// ---------------------------------------------------------------------------
// Error taxonomy
// ---------------------------------------------------------------------------

test('LemlistError classifies retryable and terminal codes', () => {
  assert.equal(new L.LemlistError('lemlist_http_429').retryable, true);
  assert.equal(new L.LemlistError('lemlist_http_503').retryable, true);
  assert.equal(new L.LemlistError('lemlist_socket_timeout').retryable, true);
  assert.equal(new L.LemlistError('lemlist_http_401').terminal, true);
  assert.equal(new L.LemlistError('lemlist_api_key_missing').terminal, true);
  // An unrecognised code is neither, which is the conservative direction.
  const unknown = new L.LemlistError('lemlist_weird');
  assert.equal(unknown.retryable, false);
  assert.equal(unknown.terminal, false);
});

test('a Lemlist error carries no response body, because bodies are not always JSON', () => {
  // /activities answers a bad team with text/plain "Bad team"; a 401 has no
  // body. Classification is on status only and the body is never retained.
  const code = strippedSource();
  assert.ok(!/detail:\s*res\.(text|json)/.test(code),
    'the response body must never be attached to a LemlistError');
});
