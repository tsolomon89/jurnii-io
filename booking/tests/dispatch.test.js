'use strict';

/**
 * `lib/dispatch.js` semantics, offline.
 *
 * The property under test is that publication is a HINT with no authority: it is
 * synchronous registration, it never throws, it never awaits the drain, and it is inert
 * unless explicitly enabled. Anything that fails here would show up as a visitor-facing
 * error or a form that waits on Zoho — the two things the whole design exists to prevent.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const DPATH = require.resolve('../lib/dispatch.js');
const WPATH = require.resolve('../workflows/worker.js');

function freshDispatch() {
  delete require.cache[DPATH];
  return require(DPATH);
}

/** Replace the worker so no database or Zoho transport is touched. */
function stubWorker(impl) {
  const calls = [];
  require.cache[WPATH] = {
    id: WPATH, filename: WPATH, loaded: true, exports: {
      runJourneyUntilBlocked: (journeyId, opts) => {
        calls.push({ journeyId, opts });
        return impl ? impl(journeyId, opts) : Promise.resolve({
          ran: 0, outcomes: {}, stoppedBecause: 'no_due_work',
          journeyComplete: true, hasDueNow: false, continuationRequired: false, nextDueAt: null,
        });
      },
    },
  };
  return calls;
}
function restoreWorker() { delete require.cache[WPATH]; }

function collector() {
  const promises = [];
  const fn = (p) => { promises.push(p); };
  return { fn, promises };
}

test.afterEach(() => {
  restoreWorker();
  delete process.env.BOOKING_DISPATCH_ENABLED;
});

test('disabled by default, and by anything other than exactly "true"', () => {
  const d = freshDispatch();
  for (const v of [undefined, '', 'false', 'FALSE', '0', 'yes', 'TRUE ']) {
    if (v === undefined) delete process.env.BOOKING_DISPATCH_ENABLED;
    else process.env.BOOKING_DISPATCH_ENABLED = v;
    assert.equal(d.isEnabled(), false, `must be disabled for ${JSON.stringify(v)}`);
  }
  process.env.BOOKING_DISPATCH_ENABLED = 'true';
  assert.equal(d.isEnabled(), true);
  process.env.BOOKING_DISPATCH_ENABLED = 'True';
  assert.equal(d.isEnabled(), true, 'case-insensitive, matching meetingAutomationEnabled');
});

test('while disabled, publish registers nothing at all', () => {
  const d = freshDispatch();
  const calls = stubWorker();
  const { fn, promises } = collector();
  assert.equal(d.publish(new Set(['j1', 'j2']), { reason: 'r', waitUntil: fn }), 0);
  assert.equal(promises.length, 0, 'nothing handed to waitUntil');
  assert.equal(calls.length, 0, 'the worker was never invoked');
});

test('publish is SYNCHRONOUS and returns before the drain settles', () => {
  process.env.BOOKING_DISPATCH_ENABLED = 'true';
  const d = freshDispatch();
  let drainFinished = false;
  stubWorker(() => new Promise((resolve) => setTimeout(() => {
    drainFinished = true;
    resolve({ ran: 1, outcomes: {}, stoppedBecause: 'no_due_work', journeyComplete: true,
      hasDueNow: false, continuationRequired: false, nextDueAt: null });
  }, 30)));
  const { fn, promises } = collector();

  const returned = d.publish(new Set(['j1']), { reason: 'page2_commit', waitUntil: fn });

  assert.equal(returned, 1);
  assert.equal(drainFinished, false, 'publish did NOT await the drain');
  assert.equal(promises.length, 1, 'the drain promise was handed to waitUntil');
});

test('publish never throws when the drain rejects, and the rejection is swallowed', async () => {
  process.env.BOOKING_DISPATCH_ENABLED = 'true';
  const d = freshDispatch();
  stubWorker(() => Promise.reject(Object.assign(new Error('boom'), { code: 'drain_exploded' })));
  const { fn, promises } = collector();

  assert.doesNotThrow(() => d.publish(new Set(['j1']), { reason: 'r', waitUntil: fn }));
  // The promise handed to waitUntil must already be handled, or the runtime sees an
  // unhandled rejection after the response has gone out.
  await assert.doesNotReject(promises[0]);
});

test('a throwing waitUntil leaves NO detached drain running', async () => {
  // Regression: `waitUntil(runDrain(...))` evaluated `runDrain` first, so the drain
  // started even when registration failed — an unowned promise issuing real external
  // calls with nothing tracking it.
  process.env.BOOKING_DISPATCH_ENABLED = 'true';
  const d = freshDispatch();
  const calls = stubWorker();
  const throwing = () => { throw new Error('no request context'); };

  let result;
  assert.doesNotThrow(() => { result = d.publish(new Set(['j1']), { reason: 'r', waitUntil: throwing }); });
  assert.equal(result, 0, 'nothing counted as registered');

  // Let every microtask and timer turn pass; the drain must never have been entered.
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(calls.length, 0, 'the worker was never invoked for an unregistered drain');
});

test('without a waitUntil implementation it registers nothing rather than detaching a promise', () => {
  process.env.BOOKING_DISPATCH_ENABLED = 'true';
  const d = freshDispatch();
  const calls = stubWorker();
  assert.equal(d.publish(new Set(['j1']), { reason: 'r' }), 0);
  assert.equal(calls.length, 0,
    'no detached promise: an unowned promise after the response is unreliable, and the sweep covers it');
});

test('an empty or absent set is a no-op', () => {
  process.env.BOOKING_DISPATCH_ENABLED = 'true';
  const d = freshDispatch();
  const calls = stubWorker();
  const { fn } = collector();
  assert.equal(d.publish(new Set(), { reason: 'r', waitUntil: fn }), 0);
  assert.equal(d.publish(undefined, { reason: 'r', waitUntil: fn }), 0);
  assert.equal(d.publish(null, { reason: 'r', waitUntil: fn }), 0);
  assert.equal(calls.length, 0);
});

test('one drain is registered per journey, and the drain is attributed to dispatch', async () => {
  process.env.BOOKING_DISPATCH_ENABLED = 'true';
  const d = freshDispatch();
  const calls = stubWorker();
  const { fn, promises } = collector();

  // Registration is synchronous; the drain body is deliberately deferred one microtask so
  // a throwing `waitUntil` can cancel it before it starts.
  assert.equal(d.publish(new Set(['j1', 'j2', 'j3']), { reason: 'r', waitUntil: fn }), 3);
  assert.equal(promises.length, 3, 'one promise per journey, handed over synchronously');
  assert.equal(calls.length, 0, 'and no drain has started yet');

  await Promise.all(promises);

  assert.deepEqual(calls.map((c) => c.journeyId), ['j1', 'j2', 'j3']);
  for (const c of calls) assert.equal(c.opts.source, 'dispatch', 'so `via` distinguishes it from cron');
});

test('the module CODE carries no PII field, so nothing it logs can leak one', () => {
  // §10: logs carry journeyId, outcome kinds and safe codes only. Comments are stripped
  // first — the docstring legitimately explains why a third-party message could quote an
  // email, and prose about the rule must not trip the rule.
  const code = require('fs').readFileSync(DPATH, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
    .replace(/^\s*\/\/.*$/gm, '');      // line comments
  for (const forbidden of ['email', 'first_name', 'last_name', 'phone', 'company']) {
    assert.equal(new RegExp(`\\b${forbidden}\\b`).test(code), false,
      `dispatch.js code must not reference ${forbidden}`);
  }
  // And the only journey identifier it handles is the id.
  assert.match(code, /journeyId/);
});

test('requiring dispatch does not pull in the worker or the integration clients', () => {
  delete require.cache[DPATH];
  const ZPATH = require.resolve('../integrations/zoho/index.js');
  const GPATH = require.resolve('../integrations/google/index.js');
  for (const p of [WPATH, ZPATH, GPATH]) delete require.cache[p];
  require(DPATH);
  // The request path must not load the Zoho transport merely to be able to publish.
  assert.equal(Boolean(require.cache[WPATH]), false, 'worker not loaded at require time');
  assert.equal(Boolean(require.cache[ZPATH]), false, 'zoho transport not loaded at require time');
});
