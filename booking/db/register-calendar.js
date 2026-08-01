'use strict';

/**
 * Idempotent per-environment calendar registration (§4.3).
 *
 *   node booking/db/register-calendar.js            register / verify
 *   node booking/db/register-calendar.js --verify    verify only, write nothing
 *
 * Reads GOOGLE_CALENDAR_ID, BOOKING_CALENDAR_KEY and BOOKING_CALENDAR_HMAC_KEY.
 * Run once per environment BEFORE that environment accepts bookings — R2 fails
 * closed with `503 calendar_misconfigured` until it has run — and safe to re-run.
 * Preview and Production are registered independently and hold different rows.
 */

const { withTransaction, close } = require('./index');
const { calendarFingerprint } = require('../lib/fingerprint');

const KEY_FORMAT = /^[a-z0-9_]{4,32}$/;

/**
 * Configuration-time rejection of alias forms.
 *
 * `primary` and `demos@jurnii.io` denote the same calendar, so accepting both
 * would split one calendar into two independent reservation namespaces and let
 * two journeys hold overlapping slots without `bsr_no_cross_journey_overlap` ever
 * noticing. Resolving `primary` to its address needs `calendars.get`, outside this
 * integration's scopes, which is why the fix is rejection rather than resolution.
 */
function assertConfig(env) {
  const calendarId = (env.GOOGLE_CALENDAR_ID || '').trim();
  const calendarKey = (env.BOOKING_CALENDAR_KEY || '').trim();
  const errors = [];

  if (!calendarId) errors.push('GOOGLE_CALENDAR_ID is not set');
  else if (calendarId.toLowerCase() === 'primary') {
    errors.push('GOOGLE_CALENDAR_ID must be an explicit address, not the alias "primary"');
  } else if (!calendarId.includes('@')) {
    errors.push(`GOOGLE_CALENDAR_ID must be an explicit calendar address containing "@" (got ${JSON.stringify(calendarId)})`);
  }

  if (!calendarKey) errors.push('BOOKING_CALENDAR_KEY is not set');
  else if (!KEY_FORMAT.test(calendarKey)) {
    errors.push(`BOOKING_CALENDAR_KEY must match ${KEY_FORMAT} (got ${JSON.stringify(calendarKey)})`);
  }

  if (!env.BOOKING_CALENDAR_HMAC_KEY) {
    errors.push('BOOKING_CALENDAR_HMAC_KEY is not set (the fingerprint must be keyed, never a plain digest)');
  }

  if (errors.length) {
    const e = new Error('calendar_config_invalid');
    e.code = 'calendar_config_invalid';
    e.errors = errors;
    throw e;
  }
  return { calendarId, calendarKey };
}

/**
 * Register the pair, then RE-READ and verify. `ON CONFLICT DO NOTHING` alone would
 * silently accept a conflicting pre-existing mapping, which is the failure that
 * splits a namespace, so the verify step is what makes this safe to re-run.
 */
async function register({ verifyOnly = false, env = process.env } = {}) {
  const { calendarId, calendarKey } = assertConfig(env);
  const fingerprint = calendarFingerprint(calendarId);

  return withTransaction(async (tx) => {
    if (!verifyOnly) {
      await tx.query(
        `INSERT INTO booking_calendars (host_calendar_key, canonical_fingerprint, note)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [calendarKey, fingerprint, `registered by register-calendar.js`]
      );
    }

    // Verify in BOTH directions: the key must map to this calendar, and this
    // calendar must not already be registered under a different key.
    const byKey = await tx.query(
      'SELECT host_calendar_key, canonical_fingerprint FROM booking_calendars WHERE host_calendar_key = $1',
      [calendarKey]
    );
    const byFingerprint = await tx.query(
      'SELECT host_calendar_key, canonical_fingerprint FROM booking_calendars WHERE canonical_fingerprint = $1',
      [fingerprint]
    );

    if (!byKey.rowCount) {
      throw conflict('calendar_key_not_registered',
        `BOOKING_CALENDAR_KEY=${calendarKey} is not registered${verifyOnly ? ' (run without --verify to register it)' : ''}`);
    }
    if (byKey.rows[0].canonical_fingerprint !== fingerprint) {
      throw conflict('calendar_key_bound_elsewhere',
        `BOOKING_CALENDAR_KEY=${calendarKey} is already registered against a DIFFERENT calendar. ` +
        'Refusing to continue: re-pointing a key would orphan every reservation held under it.');
    }
    if (byFingerprint.rowCount && byFingerprint.rows[0].host_calendar_key !== calendarKey) {
      throw conflict('calendar_bound_to_other_key',
        `This calendar is already registered under host_calendar_key=${byFingerprint.rows[0].host_calendar_key}. ` +
        'Two keys for one calendar would split the reservation namespace.');
    }

    return { hostCalendarKey: calendarKey, fingerprint, alreadyRegistered: byKey.rowCount === 1 };
  });
}

function conflict(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

if (require.main === module) {
  const verifyOnly = process.argv.includes('--verify');
  register({ verifyOnly })
    .then((r) => {
      process.stdout.write(
        `[register-calendar] ok  host_calendar_key=${r.hostCalendarKey} ` +
        `fingerprint=${r.fingerprint.slice(0, 12)}…\n`
      );
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

module.exports = { register, assertConfig, KEY_FORMAT };
