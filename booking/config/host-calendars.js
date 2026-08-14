'use strict';

const { isCanonicalCalendarId, HOST_CALENDAR_KEY_FORMAT } = require('../lib/calendar-id');

/**
 * The configured booking hosts — the ONE place a host identifier becomes a real Google
 * calendar.
 *
 * SERVER ONLY. This file is deliberately absent from `BOOKING_RUNTIME` in vite.config.js,
 * unlike countries.js / job-titles.js / lead-sources.js, because it resolves calendar
 * addresses. The browser deals only in the opaque host keys below; a Google Calendar id
 * must never reach HTML, a browser global, an API response, a query string or
 * localStorage.
 *
 * CONFIGURATION
 *
 *   BOOKING_PUBLIC_HOST=fraser                     which host the public site books
 *   BOOKING_HOST_<HOST>_CALENDAR_ID=…              the canonical Google address
 *   BOOKING_HOST_<HOST>_CALENDAR_KEY=…             the internal reservation namespace
 *
 * `<HOST>` is the upper-cased `key` from HOSTS. Adding a fourth host later is one entry
 * in HOSTS plus two environment variables — no change to any handler.
 *
 * TWO IDENTIFIERS, DELIBERATELY DISTINCT
 *
 *   hostKey          'fraser'       stable, environment-independent, safe for the browser
 *   hostCalendarKey  'fraser_prod'  the reservation namespace, DIFFERENT per environment
 *
 * `host_calendar_key` must differ per environment (local/preview/prod) or two deployments
 * would share one reservation namespace; it must also differ per host or two hosts would.
 * The convention is `<host>_<env>`. A journey stores the stable `hostKey` as intake
 * context (`selected_host_key`) and the environment-specific `hostCalendarKey` as booking
 * truth, so a key rotation cannot change what a visitor chose.
 *
 * ENV IS INJECTED, NOT CAPTURED
 *
 * Every function takes an optional `env`, defaulting to `process.env`, and reads it on
 * each call rather than at module load. Request-path callers omit it; register-calendar
 * and the tests pass an explicit object, which is what keeps `register({env})`'s
 * configuration-injection boundary effective rather than decorative.
 */

/**
 * Order is PRESENTATIONAL ONLY. The public default is `BOOKING_PUBLIC_HOST` and is never
 * inferred from this list's ordering, from whichever variable happens to be set first, or
 * from the OAuth account.
 */
const HOSTS = [
  { key: 'fraser', label: 'Fraser' },
  { key: 'marlon', label: 'Marlon' },
  { key: 'timothy', label: 'Timothy' },
];

const BY_KEY = new Map(HOSTS.map((h) => [h.key, h]));

class HostConfigError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
    this.name = 'HostConfigError';
  }
}

function envVarName(hostKey, suffix) {
  return `BOOKING_HOST_${hostKey.toUpperCase()}_CALENDAR_${suffix}`;
}

function read(env, name) {
  const v = env && env[name];
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Diagnose one host without throwing: `{hostKey, label, configured, problem}`.
 *
 * `problem` separates "not configured yet" (Marlon, expected) from "configured wrongly"
 * (a typo, which must not look like absence). The request path uses `resolveHost` and
 * fails closed either way; register-calendar and verify-prerequisites use this so the
 * operator sees WHY.
 */
function describeHost(hostKey, env = process.env) {
  const host = typeof hostKey === 'string' ? BY_KEY.get(hostKey.trim().toLowerCase()) : null;
  if (!host) {
    return { hostKey: String(hostKey), label: null, configured: false, problem: 'unknown_host' };
  }
  const idVar = envVarName(host.key, 'ID');
  const keyVar = envVarName(host.key, 'KEY');
  const googleCalendarId = read(env, idVar);
  const hostCalendarKey = read(env, keyVar);

  const base = { hostKey: host.key, label: host.label, configured: false, problem: null };

  /**
   * THE CALENDAR ID IS WHAT MAKES A HOST REAL.
   *
   * With no address there is nothing to book, nothing to register and nothing to probe,
   * so the host is simply not set up yet — whether or not its key has been reserved.
   * Reserving `BOOKING_HOST_MARLON_CALENDAR_KEY=marlon_prod` ahead of his Calendar ID is
   * the documented pending state (see .env.example), it pins the naming so nobody later
   * picks a colliding key, and it must NOT fail the whole registration run.
   *
   * The reverse is still an error: an address that is present but malformed, or present
   * without a key, is a misconfiguration and must not be mistaken for absence.
   */
  if (!googleCalendarId) return { ...base, problem: 'not_configured' };
  if (!hostCalendarKey) return { ...base, problem: `${keyVar} is not set` };
  if (!isCanonicalCalendarId(googleCalendarId)) {
    return { ...base, problem: `${idVar} must be an explicit calendar address containing "@", never "primary"` };
  }
  if (!HOST_CALENDAR_KEY_FORMAT.test(hostCalendarKey)) {
    return { ...base, problem: `${keyVar} must match ${HOST_CALENDAR_KEY_FORMAT}` };
  }
  return { hostKey: host.key, label: host.label, configured: true, problem: null, googleCalendarId, hostCalendarKey };
}

/**
 * host identifier -> {hostKey, label, hostCalendarKey, googleCalendarId}, or null.
 *
 * THE single resolver. Availability, booking creation, registration, preflight and the
 * host list all go through it; nothing else may map a host to a calendar.
 *
 * Returns null for an unknown key, an unconfigured host AND a misconfigured one. Callers
 * fail closed — `400` on an operator's explicit choice, `503` on the request path — and
 * never substitute the public default for a host that was actually asked for.
 */
function resolveHost(hostKey, env = process.env) {
  const d = describeHost(hostKey, env);
  if (!d.configured) return null;
  return {
    hostKey: d.hostKey,
    label: d.label,
    hostCalendarKey: d.hostCalendarKey,
    googleCalendarId: d.googleCalendarId,
  };
}

/** The configured public booking host key, or null. No fallback, ever. */
function publicHostKey(env = process.env) {
  return read(env, 'BOOKING_PUBLIC_HOST').toLowerCase() || null;
}

/** The resolved public booking host, or null when unset/unconfigured/misconfigured. */
function publicHost(env = process.env) {
  const key = publicHostKey(env);
  return key ? resolveHost(key, env) : null;
}

/**
 * Every fully-configured host. THROWS on a collision that would split a reservation
 * namespace, because neither `booking_calendars` nor the exclusion constraint can catch
 * it before registration: two host keys pointing at one real calendar means one calendar
 * with two namespaces, and two hosts sharing a `host_calendar_key` means two calendars
 * sharing one.
 */
function configuredHosts(env = process.env) {
  const hosts = HOSTS.map((h) => resolveHost(h.key, env)).filter(Boolean);

  const byCalendar = new Map();
  const byCalendarKey = new Map();
  for (const h of hosts) {
    const addr = h.googleCalendarId.toLowerCase();
    const prevAddr = byCalendar.get(addr);
    if (prevAddr) {
      throw new HostConfigError('host_calendar_id_collision',
        `hosts "${prevAddr}" and "${h.hostKey}" are configured with the same calendar address. ` +
        'Two keys for one calendar would split the reservation namespace.');
    }
    byCalendar.set(addr, h.hostKey);

    const prevKey = byCalendarKey.get(h.hostCalendarKey);
    if (prevKey) {
      throw new HostConfigError('host_calendar_key_collision',
        `hosts "${prevKey}" and "${h.hostKey}" share host_calendar_key "${h.hostCalendarKey}". ` +
        'Two calendars for one key would let a hold on one block the other.');
    }
    byCalendarKey.set(h.hostCalendarKey, h.hostKey);
  }
  return hosts;
}

/**
 * The browser-facing host list: keys and labels only, never an address.
 *
 * An unconfigured host is REPORTED rather than hidden, so the internal form can render it
 * disabled and an operator can see that Marlon exists but is not yet available — instead
 * of silently offering two options and leaving them wondering.
 */
function listHostsForUi(env = process.env) {
  configuredHosts(env); // fail closed on a collision before publishing anything
  return HOSTS.map((h) => ({
    key: h.key,
    label: h.label,
    configured: resolveHost(h.key, env) !== null,
  }));
}

module.exports = {
  HOSTS,
  HostConfigError,
  envVarName,
  describeHost,
  resolveHost,
  publicHostKey,
  publicHost,
  configuredHosts,
  listHostsForUi,
};
