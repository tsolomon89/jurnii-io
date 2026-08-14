'use strict';

/**
 * The canonical-calendar-address rule, and the host-key format, in ONE place.
 *
 * These two predicates were previously expressed three times — `requireCalendarId` in
 * integrations/google, `assertConfig` in db/register-calendar.js, and `bc_key_format` in
 * SQL. The first two have now converged here for the same reason lib/fingerprint.js
 * exists: two implementations of one rule drift, and this particular rule is what stops
 * one real calendar acquiring two reservation namespaces.
 *
 * The SQL CHECK stays a separate expression by necessity; `HOST_CALENDAR_KEY_FORMAT`
 * mirrors it exactly and tests/db/schema.test.js pins that they agree.
 */

/**
 * An internal host-calendar key: `^[a-z0-9_]{4,32}$`, mirroring `bc_key_format` on
 * booking_calendars. Not a secret — it survives the PII scrub as the analytics
 * "which calendar" key.
 */
const HOST_CALENDAR_KEY_FORMAT = /^[a-z0-9_]{4,32}$/;

/**
 * True only for an EXPLICIT calendar address.
 *
 * `primary` and any value without an `@` are refused: an alias and its address denote
 * the same calendar, so accepting both would split one calendar into two reservation
 * namespaces and let two journeys hold the same slot.
 */
function isCanonicalCalendarId(value) {
  if (!value || typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  if (v.toLowerCase() === 'primary') return false;
  return v.includes('@');
}

module.exports = { HOST_CALENDAR_KEY_FORMAT, isCanonicalCalendarId };
