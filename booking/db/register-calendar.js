'use strict';

/**
 * Idempotent per-environment calendar registration (§4.3), for every configured host.
 *
 *   node booking/db/register-calendar.js                  register / verify all hosts
 *   node booking/db/register-calendar.js --verify         verify only, write nothing
 *   node booking/db/register-calendar.js --host=timothy   one host only
 *
 * Reads BOOKING_PUBLIC_HOST, BOOKING_HOST_<HOST>_CALENDAR_ID /
 * BOOKING_HOST_<HOST>_CALENDAR_KEY and BOOKING_CALENDAR_HMAC_KEY. Run once per
 * environment BEFORE that environment accepts bookings — R2 fails closed with
 * `503 calendar_misconfigured` until it has — and safe to re-run.
 *
 * Preview and Production are registered independently and hold different rows, and now so
 * is each host: `booking_calendars` was always keyed per host_calendar_key, so this is N
 * rows in the same table rather than any new structure.
 *
 * A host with no Calendar ID yet (Marlon, pending) is SKIPPED with a visible line rather
 * than failing the run — Fraser and Timothy must be registrable without him. The one
 * exception is the public host: if BOOKING_PUBLIC_HOST does not resolve, the public form
 * cannot book at all, so that is a hard failure.
 */

const { withTransaction, close } = require('./index');
const { calendarFingerprint } = require('../lib/fingerprint');
const { HOST_CALENDAR_KEY_FORMAT } = require('../lib/calendar-id');
const HC = require('../config/host-calendars');

/** Kept as a named export: it was the module's published contract. */
const KEY_FORMAT = HOST_CALENDAR_KEY_FORMAT;

/**
 * Configuration-time rejection of alias forms and of a missing HMAC key.
 *
 * `primary` and `demos@jurnii.io` denote the same calendar, so accepting both would split
 * one calendar into two independent reservation namespaces and let two journeys hold
 * overlapping slots without `bsr_no_cross_journey_overlap` ever noticing. Resolving
 * `primary` to its address needs `calendars.get`, outside this integration's scopes, which
 * is why the fix is rejection rather than resolution. The predicate itself now lives in
 * lib/calendar-id.js, shared with `G.requireCalendarId`.
 *
 * Returns the hosts that must be registered. `describeHost` reports WHY a host is
 * unusable, so a typo in a Calendar ID reads as an error rather than as absence.
 */
function assertConfig(env = process.env, { only = null } = {}) {
  const errors = [];

  if (!env.BOOKING_CALENDAR_HMAC_KEY) {
    errors.push('BOOKING_CALENDAR_HMAC_KEY is not set (the fingerprint must be keyed, never a plain digest)');
  }

  const publicKey = HC.publicHostKey(env);
  if (!publicKey) {
    errors.push('BOOKING_PUBLIC_HOST is not set (the public booking host must be explicit, never inferred)');
  } else if (!HC.resolveHost(publicKey, env)) {
    const d = HC.describeHost(publicKey, env);
    errors.push(`BOOKING_PUBLIC_HOST=${publicKey} does not resolve: ${d.problem}`);
  }

  if (only && !HC.HOSTS.some((h) => h.key === only)) {
    errors.push(`--host=${only} is not a known host (${HC.HOSTS.map((h) => h.key).join(', ')})`);
  }

  // A configured-but-BROKEN host is an error; a host with nothing set at all is simply
  // not ready yet and is reported as `skipped` by the caller.
  const skipped = [];
  const targets = [];
  for (const h of HC.HOSTS) {
    if (only && h.key !== only) continue;
    const d = HC.describeHost(h.key, env);
    if (d.configured) { targets.push(HC.resolveHost(h.key, env)); continue; }
    if (d.problem === 'not_configured') { skipped.push(h.key); continue; }
    errors.push(`host ${h.key}: ${d.problem}`);
  }

  // Collisions must be caught HERE. `booking_calendars` would reject the second row, but
  // only after the first was written, and the operator needs the two host names.
  if (!errors.length) {
    try { HC.configuredHosts(env); } catch (err) { errors.push(err.message); }
  }

  if (errors.length) {
    const e = new Error('calendar_config_invalid');
    e.code = 'calendar_config_invalid';
    e.errors = errors;
    throw e;
  }
  return { targets, skipped, publicHostKey: publicKey };
}

/**
 * Register one host's pair, then RE-READ and verify. `ON CONFLICT DO NOTHING` alone would
 * silently accept a conflicting pre-existing mapping, which is the failure that splits a
 * namespace, so the verify step is what makes this safe to re-run.
 */
async function registerHost(host, { verifyOnly = false } = {}) {
  const { hostKey, hostCalendarKey, googleCalendarId } = host;
  const fingerprint = calendarFingerprint(googleCalendarId);

  return withTransaction(async (tx) => {
    if (!verifyOnly) {
      await tx.query(
        `INSERT INTO booking_calendars (host_calendar_key, canonical_fingerprint, note)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [hostCalendarKey, fingerprint, `registered by register-calendar.js (host=${hostKey})`]
      );
    }

    // Verify in BOTH directions: the key must map to this calendar, and this
    // calendar must not already be registered under a different key.
    const byKey = await tx.query(
      'SELECT host_calendar_key, canonical_fingerprint FROM booking_calendars WHERE host_calendar_key = $1',
      [hostCalendarKey]
    );
    const byFingerprint = await tx.query(
      'SELECT host_calendar_key, canonical_fingerprint FROM booking_calendars WHERE canonical_fingerprint = $1',
      [fingerprint]
    );

    if (!byKey.rowCount) {
      throw conflict('calendar_key_not_registered',
        `host ${hostKey}: ${hostCalendarKey} is not registered${verifyOnly ? ' (run without --verify to register it)' : ''}`);
    }
    if (byKey.rows[0].canonical_fingerprint !== fingerprint) {
      throw conflict('calendar_key_bound_elsewhere',
        `host ${hostKey}: ${hostCalendarKey} is already registered against a DIFFERENT calendar. ` +
        'Refusing to continue: re-pointing a key would orphan every reservation held under it.');
    }
    if (byFingerprint.rowCount && byFingerprint.rows[0].host_calendar_key !== hostCalendarKey) {
      throw conflict('calendar_bound_to_other_key',
        `host ${hostKey}: this calendar is already registered under ` +
        `host_calendar_key=${byFingerprint.rows[0].host_calendar_key}. ` +
        'Two keys for one calendar would split the reservation namespace.');
    }

    return { hostKey, hostCalendarKey, fingerprint, alreadyRegistered: byKey.rowCount === 1 };
  });
}

/**
 * Register (or verify) every configured host.
 *
 * Returns `{results, skipped, publicHostKey}`. Throws on the first host that fails, after
 * the earlier ones have already committed — each host is its own transaction, so a re-run
 * resumes rather than restarting, exactly like db/migrate.js.
 */
async function register({ verifyOnly = false, env = process.env, only = null } = {}) {
  const { targets, skipped, publicHostKey } = assertConfig(env, { only });
  const results = [];
  for (const host of targets) {
    results.push(await registerHost(host, { verifyOnly }));
  }
  return { results, skipped, publicHostKey };
}

function conflict(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

if (require.main === module) {
  const verifyOnly = process.argv.includes('--verify');
  const hostArg = process.argv.find((a) => a.startsWith('--host='));
  const only = hostArg ? hostArg.slice('--host='.length).trim().toLowerCase() : null;

  register({ verifyOnly, only })
    .then((r) => {
      for (const row of r.results) {
        process.stdout.write(
          `[register-calendar] ok  host=${row.hostKey} host_calendar_key=${row.hostCalendarKey} ` +
          `fingerprint=${row.fingerprint.slice(0, 12)}…\n`
        );
      }
      for (const key of r.skipped) {
        process.stdout.write(`[register-calendar] skipped host=${key} (no calendar id configured yet)\n`);
      }
      process.stdout.write(`[register-calendar] public host=${r.publicHostKey}\n`);
      return close();
    })
    .then(() => process.exit(0))
    .catch(async (err) => {
      process.stderr.write(`[register-calendar] ${err.code || 'failed'}: ${err.message}\n`);
      for (const line of err.errors || []) process.stderr.write(`  - ${line}\n`);
      await close().catch(() => {});
      process.exit(1);
    });
}

module.exports = { register, registerHost, assertConfig, KEY_FORMAT };
