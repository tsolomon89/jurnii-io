'use strict';

/**
 * The ONE ownership check, replacing three copies.
 *
 * Ownership is bound to the signed `journeyId` — a lookup match alone is
 * insufficient because the journeyId travels in the URL. Contact and Deal ids are
 * mutable relationships and are NEVER ownership keys: a Lead-linked event legally
 * moves to its Contact later.
 */

/** Read `extendedProperties.private` defensively. */
function readEventPrivate(event) {
  return (event && event.extendedProperties && event.extendedProperties.private) || {};
}

/**
 * Verify a Google event belongs to this journey and this attempt.
 *
 * Private metadata holds exactly `journeyId` and `attempt`. Email was removed
 * (Revision-10 change #4): it was never needed for correlation, and a normalised
 * work email in third-party event metadata is data we should not be copying
 * there. The old helper compared a stored email; that comparison is deleted.
 *
 * Returns `{ ok: true }` or `{ ok: false, code }` where code is
 * `correlation_conflict` (a different journey — never adopt) or
 * `stale_attempt_event` (this journey, an older attempt — never adopt).
 *
 * Two deliberate allowances:
 *   - A legacy event written before this change carries an email and no
 *     `attempt`; it is treated as attempt 0 and its email property is ignored,
 *     so existing Preview data keeps working.
 *   - An operator-adopted event (`adoptedEventId` matching, §4.10) is proved by
 *     the stored id itself, because the binding was made under an authenticated,
 *     audited, slot-verified action and a host-created replacement never had our
 *     private properties. This is what lets a second replacement be adopted
 *     without a Google write to relabel it.
 */
function verifyEventOwnership(event, { journeyId, attemptVersion, adoptedEventId }) {
  if (!event) return { ok: false, code: 'event_missing' };

  if (adoptedEventId && event.id && event.id === adoptedEventId) return { ok: true, via: 'adoption' };

  const p = readEventPrivate(event);

  if (p.journeyId && p.journeyId !== journeyId) return { ok: false, code: 'correlation_conflict' };
  if (!p.journeyId && !adoptedEventId) {
    // No label and no recorded adoption: nothing ties this event to the journey.
    return { ok: false, code: 'correlation_conflict' };
  }

  if (attemptVersion !== undefined && attemptVersion !== null) {
    const eventAttempt = p.attempt === undefined || p.attempt === null ? '0' : String(p.attempt);
    if (eventAttempt !== String(attemptVersion)) return { ok: false, code: 'stale_attempt_event' };
  }

  return { ok: true, via: 'private_properties' };
}

/** True when the event is cancelled or otherwise not live. */
function isCancelledEvent(event) {
  return Boolean(event && event.status === 'cancelled');
}

/**
 * A Zoho Event belongs to this journey when `Ext_Calendar_Booking_ID` matches.
 * A missing value is tolerated for records predating the field's use.
 */
function zohoEventOwned(event, journeyId) {
  const ext = event && event.Ext_Calendar_Booking_ID;
  return !ext || ext === journeyId;
}

module.exports = { readEventPrivate, verifyEventOwnership, isCancelledEvent, zohoEventOwned };
