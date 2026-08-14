'use strict';

const test = require('node:test');
const assert = require('node:assert');

const HC = require('../config/host-calendars');
const { resolveJourneyHost } = require('../lib/booking-host');
const { isCanonicalCalendarId, HOST_CALENDAR_KEY_FORMAT } = require('../lib/calendar-id');
const G = require('../integrations/google');

/**
 * The host-calendar resolver — the ONE place a host identifier becomes a real calendar.
 *
 * Every test injects an explicit `env` object rather than mutating `process.env`. That is
 * not merely tidier: `register({env})` exists precisely so registration can be driven from
 * a supplied configuration, and a resolver that captured `process.env` would quietly make
 * that parameter decorative. Injecting here is what proves it still threads through.
 */

/** A fully configured two-host environment. Marlon is deliberately absent throughout. */
function env(overrides) {
  return Object.assign({
    BOOKING_PUBLIC_HOST: 'fraser',
    BOOKING_HOST_FRASER_CALENDAR_ID: 'fraser@jurnii.io',
    BOOKING_HOST_FRASER_CALENDAR_KEY: 'fraser_test',
    BOOKING_HOST_TIMOTHY_CALENDAR_ID: 'timothy@jurnii.io',
    BOOKING_HOST_TIMOTHY_CALENDAR_KEY: 'timothy_test',
  }, overrides || {});
}

/* --------------------------------------------------------------------------
   Resolution
   -------------------------------------------------------------------------- */

test('a configured host resolves to its calendar and its reservation namespace', () => {
  const h = HC.resolveHost('fraser', env());
  assert.deepStrictEqual(h, {
    hostKey: 'fraser',
    label: 'Fraser',
    hostCalendarKey: 'fraser_test',
    googleCalendarId: 'fraser@jurnii.io',
  });
});

test('host keys are matched case- and whitespace-insensitively', () => {
  assert.strictEqual(HC.resolveHost('  TIMOTHY ', env()).hostKey, 'timothy');
});

test('an unknown host resolves to null rather than to the default', () => {
  // Substituting the public host for one that was explicitly asked for would book the
  // wrong person's calendar. Null forces the caller to refuse.
  assert.strictEqual(HC.resolveHost('nobody', env()), null);
  assert.strictEqual(HC.resolveHost('', env()), null);
  assert.strictEqual(HC.resolveHost(null, env()), null);
  assert.strictEqual(HC.resolveHost(undefined, env()), null);
});

test('a known but unconfigured host resolves to null — Marlon fails closed', () => {
  assert.strictEqual(HC.resolveHost('marlon', env()), null);
  const d = HC.describeHost('marlon', env());
  assert.strictEqual(d.configured, false);
  assert.strictEqual(d.problem, 'not_configured',
    'entirely absent config is reported as pending, not as an error');
});

test('an address without a key is an ERROR, not mistaken for absence', () => {
  // "Someone set the id but not the key" must not read the same as "not set up yet",
  // or a misconfiguration would be silently skipped by registration.
  const idOnly = HC.describeHost('marlon', env({ BOOKING_HOST_MARLON_CALENDAR_ID: 'marlon@jurnii.io' }));
  assert.strictEqual(idOnly.configured, false);
  assert.match(idOnly.problem, /BOOKING_HOST_MARLON_CALENDAR_KEY is not set/);
});

test('a RESERVED key with no Calendar ID yet is pending, not an error', () => {
  // The documented Marlon state: the key is pinned ahead of time so nobody later picks a
  // colliding one, while the address is still outstanding. This must not fail the
  // registration run for Fraser and Timothy — which it did until it was fixed.
  const pending = HC.describeHost('marlon', env({ BOOKING_HOST_MARLON_CALENDAR_KEY: 'marlon_test' }));
  assert.strictEqual(pending.configured, false);
  assert.strictEqual(pending.problem, 'not_configured');
  assert.strictEqual(HC.resolveHost('marlon', env({ BOOKING_HOST_MARLON_CALENDAR_KEY: 'marlon_test' })), null,
    'and he still does not resolve, so he cannot be booked');
});

test('register-calendar skips a key-reserved host instead of failing the run', () => {
  const RC = require('../db/register-calendar');
  const cfg = env({ BOOKING_CALENDAR_HMAC_KEY: 'k', BOOKING_HOST_MARLON_CALENDAR_KEY: 'marlon_test' });
  const r = RC.assertConfig(cfg);
  assert.deepStrictEqual(r.skipped, ['marlon']);
  assert.deepStrictEqual(r.targets.map((t) => t.hostKey), ['fraser', 'timothy']);
});

/* --------------------------------------------------------------------------
   Validation — the rules that keep one calendar in one namespace
   -------------------------------------------------------------------------- */

test('an alias calendar id is refused, in the resolver and in the Google integration alike', () => {
  for (const bad of ['primary', 'PRIMARY', 'demos', 'not-an-address']) {
    assert.strictEqual(HC.resolveHost('fraser', env({ BOOKING_HOST_FRASER_CALENDAR_ID: bad })), null,
      `${bad} must not resolve`);
    assert.strictEqual(isCanonicalCalendarId(bad), false);
    assert.throws(() => G.requireCalendarId(bad), /calendar_id_must_be_canonical/,
      'the shared predicate and requireCalendarId must agree');
  }
  assert.strictEqual(isCanonicalCalendarId('fraser@jurnii.io'), true);
  assert.strictEqual(isCanonicalCalendarId('c_abc@group.calendar.google.com'), true);
});

test('a host_calendar_key that the SQL CHECK would reject never reaches the database', () => {
  // bc_key_format on booking_calendars is `^[a-z0-9_]{4,32}$`; the regex here mirrors it.
  for (const bad of ['ab', 'Fraser_Prod', 'fraser-prod', 'fraser prod', 'x'.repeat(33)]) {
    assert.strictEqual(HOST_CALENDAR_KEY_FORMAT.test(bad), false, `${bad} is not a legal key`);
    assert.strictEqual(HC.resolveHost('fraser', env({ BOOKING_HOST_FRASER_CALENDAR_KEY: bad })), null);
  }
  assert.strictEqual(HOST_CALENDAR_KEY_FORMAT.test('fraser_prod'), true);
});

/* --------------------------------------------------------------------------
   Collisions — the two failures the registry cannot catch until it writes
   -------------------------------------------------------------------------- */

test('two hosts on one calendar is refused: it would split the reservation namespace', () => {
  const bad = env({ BOOKING_HOST_TIMOTHY_CALENDAR_ID: 'FRASER@jurnii.io' });
  assert.throws(() => HC.configuredHosts(bad), (err) => {
    assert.strictEqual(err.code, 'host_calendar_id_collision');
    assert.match(err.message, /fraser/);
    assert.match(err.message, /timothy/, 'the operator needs BOTH host names to fix it');
    return true;
  });
});

test('two hosts sharing a host_calendar_key is refused: one hold would block the other', () => {
  const bad = env({ BOOKING_HOST_TIMOTHY_CALENDAR_KEY: 'fraser_test' });
  assert.throws(() => HC.configuredHosts(bad), (err) => {
    assert.strictEqual(err.code, 'host_calendar_key_collision');
    return true;
  });
});

test('listHostsForUi refuses to publish a colliding configuration', () => {
  assert.throws(() => HC.listHostsForUi(env({ BOOKING_HOST_TIMOTHY_CALENDAR_ID: 'fraser@jurnii.io' })));
});

/* --------------------------------------------------------------------------
   The public default
   -------------------------------------------------------------------------- */

test('the public host is explicit configuration, with no fallback of any kind', () => {
  assert.strictEqual(HC.publicHostKey(env()), 'fraser');
  // Not derived from HOSTS ordering, not from whichever variable happens to be set,
  // not from the OAuth account. Unset means unset.
  assert.strictEqual(HC.publicHostKey(env({ BOOKING_PUBLIC_HOST: '' })), null);
  assert.strictEqual(HC.publicHost(env({ BOOKING_PUBLIC_HOST: '' })), null);
  // Naming an unconfigured host does not silently fall through to a configured one.
  assert.strictEqual(HC.publicHost(env({ BOOKING_PUBLIC_HOST: 'marlon' })), null);
});

test('changing one configuration value moves the public default, with no code change', () => {
  assert.strictEqual(HC.publicHost(env({ BOOKING_PUBLIC_HOST: 'timothy' })).googleCalendarId,
    'timothy@jurnii.io');
});

/* --------------------------------------------------------------------------
   The browser-facing list
   -------------------------------------------------------------------------- */

test('the UI host list carries keys and labels only, never a calendar address', () => {
  const list = HC.listHostsForUi(env());
  assert.deepStrictEqual(list, [
    { key: 'fraser', label: 'Fraser', configured: true },
    { key: 'marlon', label: 'Marlon', configured: false },
    { key: 'timothy', label: 'Timothy', configured: true },
  ]);
  assert.doesNotMatch(JSON.stringify(list), /@/, 'no address may cross the boundary');
});

/* --------------------------------------------------------------------------
   journey -> calendar: the state transition availability and booking share
   -------------------------------------------------------------------------- */

const CONFIRMED = {
  booking_status: 'confirmed',
  google_event_id: 'bkdeadbeef',
  host_calendar_key: 'legacy_prod',
  google_calendar_id: 'c_legacy@group.calendar.google.com',
  selected_host_key: 'timothy',
};

test('a journey with no selection reads as the configured public host', () => {
  // Journeys created before 0006 have a NULL selected_host_key.
  const h = resolveJourneyHost({ booking_status: 'draft', selected_host_key: null }, env());
  assert.strictEqual(h.googleCalendarId, 'fraser@jurnii.io');
  assert.strictEqual(h.source, 'selected');
});

test('a selected host decides the calendar before a booking exists', () => {
  const h = resolveJourneyHost({ booking_status: 'draft', selected_host_key: 'timothy' }, env());
  assert.strictEqual(h.hostCalendarKey, 'timothy_test');
  assert.strictEqual(h.googleCalendarId, 'timothy@jurnii.io');
});

test('a booked journey keeps its PERSISTED calendar, whatever the default becomes', () => {
  // The reschedule/cancel/recovery invariant. `legacy_prod` is not configured as any
  // host any more, and the journey still resolves to it.
  const h = resolveJourneyHost(CONFIRMED, env({ BOOKING_PUBLIC_HOST: 'timothy' }));
  assert.strictEqual(h.source, 'persisted');
  assert.strictEqual(h.hostCalendarKey, 'legacy_prod');
  assert.strictEqual(h.googleCalendarId, 'c_legacy@group.calendar.google.com');
});

test('every post-attempt status pins the persisted calendar', () => {
  for (const status of ['reserved', 'confirmed', 'cancel_pending', 'reschedule_pending',
    'needs_attention', 'cancelled']) {
    const h = resolveJourneyHost(Object.assign({}, CONFIRMED, { booking_status: status }), env());
    assert.strictEqual(h.source, 'persisted', `${status} must not re-resolve`);
  }
});

test('a proven-failed attempt may be retried on a newly chosen host', () => {
  // `draft` (released by G2a, nothing issued) and `booking_failed` (definitively
  // rejected by Google) are the never-confirmed states. R2 independently refuses to
  // re-arm while an attempt is still `creating`/`unknown`, so a host can only change
  // when the previous attempt is proven to have created nothing.
  for (const status of ['draft', 'booking_failed']) {
    const j = Object.assign({}, CONFIRMED, { booking_status: status, google_event_id: null });
    const h = resolveJourneyHost(j, env());
    assert.strictEqual(h.source, 'selected', `${status} must honour a new selection`);
    assert.strictEqual(h.googleCalendarId, 'timothy@jurnii.io');
  }
});

test('an unresolvable selection is null, never a silent substitution', () => {
  assert.strictEqual(resolveJourneyHost({ booking_status: 'draft', selected_host_key: 'marlon' }, env()), null);
  assert.strictEqual(resolveJourneyHost({ booking_status: 'draft', selected_host_key: 'nobody' }, env()), null);
  assert.strictEqual(resolveJourneyHost(null, env()), null);
  // No public host configured at all: refuse rather than guess.
  assert.strictEqual(
    resolveJourneyHost({ booking_status: 'draft', selected_host_key: null }, env({ BOOKING_PUBLIC_HOST: '' })),
    null);
});

/* --------------------------------------------------------------------------
   Event ids stay disjoint per host
   -------------------------------------------------------------------------- */

test('the deterministic event id differs per host, so three hosts cannot collide', () => {
  const journeyId = '11111111-2222-4333-8444-555555555555';
  const ids = ['fraser_test', 'timothy_test', 'marlon_test'].map(
    (calendarKey) => G.deterministicEventId({ calendarKey, journeyId, attempt: 1 }));
  assert.strictEqual(new Set(ids).size, 3, 'the calendar key is part of the id');
  for (const id of ids) assert.match(id, /^[0-9a-v]{5,1024}$/);
});
