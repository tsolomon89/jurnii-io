'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const handler = require('../handler');

/** The Vercel `res` double, same shape the booking suite uses. */
function mockRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
}

function req(overrides = {}) {
  return Object.assign({ method: 'POST', query: {}, headers: {} }, overrides);
}

function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return Promise.resolve().then(fn).finally(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

const SECRET = 'test-cron-secret-value';

test('a wrong verb is a 405, never a 500', async () => {
  const res = mockRes();
  await handler(req({ method: 'DELETE' }), res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'GET, POST');
  assert.equal(res.body.code, 'method_not_allowed');
});

test('both GET and POST are accepted, so Preview can be driven by hand', async () => {
  await withEnv({ CRON_SECRET: SECRET, LEMLIST_SYNC_ENABLED: undefined }, async () => {
    for (const method of ['GET', 'POST']) {
      const res = mockRes();
      await handler(req({ method, headers: { authorization: `Bearer ${SECRET}` } }), res);
      assert.equal(res.statusCode, 200, `${method} should be accepted`);
    }
  });
});

test('no credential is a 401 and does no work', async () => {
  await withEnv({ CRON_SECRET: SECRET }, async () => {
    const res = mockRes();
    await handler(req(), res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'auth_invalid');
  });
});

test('a wrong credential is a 401', async () => {
  await withEnv({ CRON_SECRET: SECRET }, async () => {
    const res = mockRes();
    await handler(req({ headers: { authorization: 'Bearer wrong-value-entirely' } }), res);
    assert.equal(res.statusCode, 401);
  });
});

test('an unconfigured CRON_SECRET refuses rather than running open', async () => {
  await withEnv({ CRON_SECRET: undefined }, async () => {
    const res = mockRes();
    await handler(req({ headers: { authorization: 'Bearer anything' } }), res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'cron_secret_not_configured');
  });
});

test('the ADMIN secret is rejected, not accepted as a stronger credential', async () => {
  const admin = 'test-admin-secret-value';
  await withEnv({ CRON_SECRET: SECRET, BOOKING_ADMIN_SECRET: admin }, async () => {
    const res = mockRes();
    await handler(req({ headers: { authorization: `Bearer ${admin}` } }), res);
    assert.equal(res.statusCode, 401,
      'the job endpoint accepts CRON_SECRET only, so a leaked admin secret cannot drive CRM writes');
  });
});

test('with the gates off the run is an authenticated no-op', async () => {
  await withEnv({
    CRON_SECRET: SECRET,
    LEMLIST_SYNC_ENABLED: undefined,
    LEMLIST_ZOHO_WRITE_ENABLED: undefined,
  }, async () => {
    const res = mockRes();
    await handler(req({ headers: { authorization: `Bearer ${SECRET}` } }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.outcome, 'disabled');
    assert.equal(res.body.dryRun, true);
    assert.equal(res.body.tasksCreated, 0);
    assert.equal(res.body.activitiesFetched, 0);
  });
});

test('the response body is the run summary, so the log and the reply agree', async () => {
  await withEnv({ CRON_SECRET: SECRET, LEMLIST_SYNC_ENABLED: undefined }, async () => {
    const res = mockRes();
    await handler(req({ headers: { authorization: `Bearer ${SECRET}` } }), res);
    for (const key of ['ok', 'outcome', 'dryRun', 'window', 'durationMs', 'skipped', 'apiFailures']) {
      assert.ok(key in res.body, `summary must carry ${key}`);
    }
  });
});

test('timing-safe comparison: a correct-length wrong secret still fails', async () => {
  await withEnv({ CRON_SECRET: SECRET }, async () => {
    const sameLength = crypto.randomBytes(SECRET.length).toString('hex').slice(0, SECRET.length);
    const res = mockRes();
    await handler(req({ headers: { authorization: `Bearer ${sameLength}` } }), res);
    assert.equal(res.statusCode, 401);
  });
});

// ---------------------------------------------------------------------------
// Deployment wiring
// ---------------------------------------------------------------------------

test('the root /api shim points at this handler', () => {
  const shim = path.join(__dirname, '..', '..', '..', 'api', 'v1', 'internal', 'lemlist-sync.js');
  assert.ok(fs.existsSync(shim), 'Vercel serves functions only from the repo-root /api directory');
  const src = fs.readFileSync(shim, 'utf8');
  assert.ok(src.includes('integrations/lemlist-zoho/handler.js'), src);
  // Requiring it must resolve to the same function.
  assert.equal(require(shim), handler);
});

test('vercel.json registers the cron and a maxDuration, and leaves the others alone', () => {
  const cfg = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'vercel.json'), 'utf8'));

  const cron = cfg.crons.find((c) => c.path === '/api/v1/internal/lemlist-sync');
  assert.ok(cron, 'the daily cron must be registered');
  assert.equal(cron.schedule, '30 4 * * *', 'after the 03:15 retention slot');

  assert.deepEqual(cfg.functions['api/v1/internal/lemlist-sync.js'], { maxDuration: 60 });

  // The pre-existing booking crons must still be there, untouched.
  assert.ok(cfg.crons.some((c) => c.path === '/api/v1/internal/jobs/run' && c.schedule === '* * * * *'));
  assert.ok(cfg.crons.some((c) => c.path === '/api/v1/internal/jobs/retention' && c.schedule === '15 3 * * *'));
});

test('this subsystem declares CommonJS, because it requires across into booking/', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert.equal(pkg.type, 'commonjs',
    'the repo root is "type":"module"; Vercel bundles the nearest package.json');
});

test('booking/** is not modified by this subsystem', () => {
  // A structural assertion, not a git check: nothing here may require a booking
  // file that would need editing, and nothing here writes into booking/.
  const root = path.join(__dirname, '..');
  const files = fs.readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.js'))
    .map((e) => path.join(root, e.name));
  files.push(...fs.readdirSync(path.join(root, 'scripts'))
    .filter((f) => f.endsWith('.js')).map((f) => path.join(root, 'scripts', f)));

  const allowed = [
    'booking/integrations/zoho/index.js',
    'booking/api/_utils/email',
    'booking/lib/http',
    'booking/lib/auth',
  ];

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.match(/require\('([^']*booking[^']*)'\)/g) || []) {
      const target = /require\('([^']+)'\)/.exec(m)[1];
      const normalised = target.replace(/^(\.\.\/)+/, '').replace(/\.js$/, '');
      assert.ok(
        allowed.some((a) => a.replace(/\.js$/, '') === normalised),
        `${path.basename(file)} requires an unexpected booking module: ${target}`);
    }
  }
});
