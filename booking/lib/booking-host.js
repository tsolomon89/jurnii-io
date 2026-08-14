'use strict';

const HC = require('../config/host-calendars');

/**
 * journey -> the calendar this request must address.
 *
 * The ONE place the "which calendar" question is answered on the request path, shared by
 * availability and booking creation so the two cannot diverge: a browser must never be
 * shown Fraser's availability and then have its event created on Timothy's calendar.
 *
 * THE STATE TRANSITION THIS ENCODES
 *
 *   before a booking exists   the SELECTED host decides (operator choice, or the
 *                             server-assigned public default)
 *   once a booking exists     the PERSISTED calendar decides, permanently
 *
 * `booking_status` is what separates the two, and it is more precise than "is
 * host_calendar_key set". `draft` and `booking_failed` are the never-confirmed states:
 * `draft` covers a journey that armed and was released by G2a (create_attempts still 0,
 * nothing was issued), and `booking_failed` covers one whose attempt was definitively
 * REJECTED by Google. In both, the calendar columns may be left over from that attempt
 * while no event exists anywhere, so an operator who goes back and picks a different host
 * must be honoured. Every other status means an attempt is live or a booking exists.
 *
 * That is safe rather than merely convenient: `R2_armCreate` independently refuses to
 * re-arm while `google_outcome_state` is `creating`/`unknown`/`unresolved`, so a host can
 * only change when the previous attempt is PROVEN not to have created anything — and
 * `bj_guard()` raises if `host_calendar_key` ever moves after `google_event_id` is set.
 */

/** Statuses in which no booking exists and no attempt is outstanding. */
const PRE_BOOKING_STATUSES = new Set(['draft', 'booking_failed']);

/**
 * Returns `{hostCalendarKey, googleCalendarId, hostKey, source}` or null.
 *
 * `source` is `'persisted'` or `'selected'` — logged, never returned to a browser.
 * A null result is a fail-closed signal: the caller answers `503 calendar_misconfigured`.
 * It NEVER silently substitutes the public default for a host that was explicitly chosen.
 */
function resolveJourneyHost(journey, env = process.env) {
  if (!journey) return null;

  if (
    journey.google_calendar_id
    && journey.host_calendar_key
    && !PRE_BOOKING_STATUSES.has(journey.booking_status)
  ) {
    return {
      hostKey: journey.selected_host_key || null,
      hostCalendarKey: journey.host_calendar_key,
      googleCalendarId: journey.google_calendar_id,
      source: 'persisted',
    };
  }

  // `selected_host_key` is NULL only on journeys created before 0006; they predate any
  // host choice, so the configured public default is the correct reading.
  const key = journey.selected_host_key || HC.publicHostKey(env);
  const host = key ? HC.resolveHost(key, env) : null;
  if (!host) return null;

  return {
    hostKey: host.hostKey,
    hostCalendarKey: host.hostCalendarKey,
    googleCalendarId: host.googleCalendarId,
    source: 'selected',
  };
}

module.exports = { resolveJourneyHost, PRE_BOOKING_STATUSES };
