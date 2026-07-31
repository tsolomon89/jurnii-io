'use strict';

const crypto = require('crypto');
const { google } = require('googleapis');

/**
 * Google Calendar integration.
 *
 * Moved from `api/_utils/google.js` (spec §15 layout) and materially rewritten.
 * Three controls are enforced structurally rather than by convention:
 *
 *  1. EVERY operation takes an explicit `calendarId` argument. There is no
 *     environment fallback and no `'primary'` default — the old `calendarId()`
 *     helper returned `process.env.GOOGLE_CALENDAR_ID || 'primary'`, which meant a
 *     mid-flight configuration change could point recovery at a different calendar,
 *     and `'primary'` would silently split one calendar into two reservation
 *     namespaces. Callers pass the journey's persisted `google_calendar_id`.
 *
 *  2. `listEventByJourneyId` is DELETED. It used `showDeleted:false`, so a cancelled
 *     event was invisible to it — a recovery read that cannot see a cancelled event
 *     cannot distinguish "never created" from "created then cancelled". Correlation
 *     is now a direct `events.get` on the deterministic id we computed ourselves.
 *
 *  3. `events.list` survives for EXACTLY ONE purpose: reading `accessRole` in
 *     `probeEventAccess`. It is forbidden for locating or correlating the booking
 *     event, and it requests `fields: 'accessRole'` so it cannot serve as a lookup
 *     even accidentally.
 */

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.freebusy',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function hostTimeZone() {
  return process.env.HOST_TIMEZONE || 'Europe/London';
}

function getGoogleAuth() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://jurnii.io/api/v1/google/callback'
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oAuth2Client;
}

function getCalendar() {
  return google.calendar({ version: 'v3', auth: getGoogleAuth() });
}

/** Assert a caller passed a real, non-alias calendar id. */
function requireCalendarId(calendarId) {
  if (!calendarId || typeof calendarId !== 'string') {
    throw new ConfigError('calendar_id_required');
  }
  if (calendarId.toLowerCase() === 'primary' || !calendarId.includes('@')) {
    // An alias would address a different namespace than the one the reservation was
    // taken against, so the exclusion constraint could not protect the slot.
    throw new ConfigError('calendar_id_must_be_canonical');
  }
  return calendarId;
}

function sha256hex(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

/**
 * The deterministic per-attempt event id, supplied to `events.insert`.
 *
 * Google documents caller-supplied ids as the way to "prevent duplicate event
 * creation if the operation fails at some point after it is successfully executed in
 * the Calendar backend" — which is exactly the uncertain-create problem. One address
 * to look at when an outcome is unknown.
 *
 * Derives from the OPAQUE `host_calendar_key`, never the calendar address, so the id
 * discloses nothing even though it is visible in Google. This is the one remaining
 * unkeyed digest in the design and it protects nothing — it shortens a label that is
 * already non-identifying.
 *
 * 46 characters, entirely within Google's base32hex alphabet (`0-9`, `a-v`): hex is a
 * strict subset and the `bk` prefix is inside `a-v`.
 */
function deterministicEventId({ calendarKey, journeyId, attempt }) {
  if (!calendarKey) throw new ConfigError('calendar_key_required');
  const cal = sha256hex(calendarKey).slice(0, 8);
  const jid = String(journeyId).replace(/-/g, '').toLowerCase();
  const att = Number(attempt).toString(16).padStart(4, '0');
  const id = `bk${cal}${jid}${att}`;
  if (!/^[0-9a-v]{5,1024}$/.test(id)) throw new ConfigError('event_id_alphabet_violation');
  return id;
}

/** Classify a googleapis error into the shape the recovery rules switch on. */
function classify(err) {
  const status = err && (err.code || err.status
    || (err.response && err.response.status));
  const reason = err && err.errors && err.errors[0] && err.errors[0].reason;
  return {
    status: typeof status === 'number' ? status : null,
    reason: reason || null,
    /** A transport or availability failure: never evidence about the event. */
    transient: !status || status === 429 || status >= 500,
  };
}

/**
 * THE EVENT-ACCESS PROBE — one rule for every `404` (§5.1).
 *
 * A bare `404` is never proof of absence: a calendar we cannot see events on returns
 * `404` for an event that exists. FreeBusy cannot answer this — a `freeBusyReader`
 * gets a perfectly successful FreeBusy response while being unable to read a single
 * event detail, so a FreeBusy success is consistent with a permissions-artefact 404.
 *
 * Only `writer` and `owner` authorise a terminal absence verdict.
 * `writerWithoutPrivateAccess` is treated as UNCONFIRMED by default: it can write but
 * has restricted visibility of private event detail, and our verdict depends on
 * reading both the event and its `extendedProperties.private`.
 */
async function probeEventAccess(calendarId) {
  requireCalendarId(calendarId);
  try {
    const res = await getCalendar().events.list({
      calendarId,
      maxResults: 1,          // bounded; the items are ignored entirely
      timeMin: new Date().toISOString(),
      fields: 'accessRole',   // do not even fetch the items
    });
    const role = res.data && res.data.accessRole;
    return { confirmed: role === 'writer' || role === 'owner', role: role || null };
  } catch (err) {
    // A failed probe is not confirmation. Unconfirmed access retains every hold.
    return { confirmed: false, role: null, error: classify(err) };
  }
}

/**
 * Read an event by id. Returns a discriminated outcome rather than throwing, because
 * every caller must branch on exactly these cases and a thrown error invites a
 * catch-all that treats absence and unreadability alike.
 *
 *   { kind: 'present',   event }      200, live
 *   { kind: 'cancelled', event }      200 with status==='cancelled' — the id is spent
 *   { kind: 'gone' }                  410 — definitive
 *   { kind: 'not_found' }             404 — NOT proof; the caller must probe access
 *   { kind: 'unreadable', error }     anything else — never a verdict
 */
async function readEvent(calendarId, eventId) {
  requireCalendarId(calendarId);
  if (!eventId) throw new ConfigError('event_id_required');
  try {
    const res = await getCalendar().events.get({ calendarId, eventId });
    const event = res.data;
    if (event && event.status === 'cancelled') return { kind: 'cancelled', event };
    return { kind: 'present', event };
  } catch (err) {
    const c = classify(err);
    if (c.status === 410) return { kind: 'gone' };
    if (c.status === 404) return { kind: 'not_found' };
    return { kind: 'unreadable', error: c };
  }
}

/**
 * Resolve a `404` into a verdict using the approved rule: absence is proven only when
 * the probe confirms `writer`/`owner`. Returns `'absent'` or `'unknown'`.
 */
async function qualifyNotFound(calendarId) {
  const probe = await probeEventAccess(calendarId);
  return { verdict: probe.confirmed ? 'absent' : 'unknown', probe };
}

/** FreeBusy for the host calendar. Returns busy intervals, or throws. */
async function checkFreeBusy(calendarId, timeMin, timeMax) {
  requireCalendarId(calendarId);
  const res = await getCalendar().freebusy.query({
    requestBody: { timeMin, timeMax, timeZone: 'UTC', items: [{ id: calendarId }] },
  });
  const cal = res.data && res.data.calendars && res.data.calendars[calendarId];
  if (cal && cal.errors && cal.errors.length) {
    const e = new Error('freebusy_calendar_error');
    e.code = 'freebusy_calendar_error';
    e.details = cal.errors;
    throw e;
  }
  return (cal && cal.busy) || [];
}

/**
 * Insert the event with OUR id.
 *
 * `extendedProperties.private` carries exactly `journeyId` and `attempt`. Email is
 * deliberately absent: it was never needed for correlation, and a normalised work
 * email in third-party event metadata is data we should not be copying there.
 *
 * A `409` is treated by the CALLER as a positive existence signal, never as the
 * authoritative check — Google's own docs warn that duplicate-id collisions "cannot
 * be guaranteed to be detected at event creation time", so the authority is always a
 * direct `events.get`.
 */
async function insertEvent(calendarId, {
  eventId, summary, description, start, end, attendees, journeyId, attempt,
}) {
  requireCalendarId(calendarId);
  if (!eventId) throw new ConfigError('event_id_required');
  try {
    const res = await getCalendar().events.insert({
      calendarId,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      requestBody: {
        id: eventId,
        summary,
        description,
        start: { dateTime: start, timeZone: 'UTC' },
        end: { dateTime: end, timeZone: 'UTC' },
        attendees,
        extendedProperties: { private: { journeyId: String(journeyId), attempt: String(attempt) } },
        conferenceData: {
          createRequest: { requestId: eventId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
        },
      },
    });
    return { kind: 'created', event: res.data };
  } catch (err) {
    const c = classify(err);
    if (c.status === 409) return { kind: 'duplicate', error: c };      // the id already exists
    if (c.transient) return { kind: 'uncertain', error: c };            // never a verdict
    return { kind: 'rejected', error: c };                              // definite 4xx
  }
}

/**
 * The Meet URL, preferring `hangoutLink` and otherwise the VIDEO entry point —
 * never `entryPoints[0]`, which is frequently the dial-in number.
 * Returns '' when there is no conference, so callers can treat it as falsy uniformly.
 */
function extractMeetLink(event) {
  if (!event) return '';
  if (event.hangoutLink) return event.hangoutLink;
  const entry = event.conferenceData && event.conferenceData.entryPoints
    && event.conferenceData.entryPoints.find((e) => e.entryPointType === 'video');
  return (entry && entry.uri) || '';
}

/**
 * Await a pending conference. A missing Meet link is NOT a reason to fail a booking
 * that exists — the status endpoint returns `meetLink: null` and the event stands.
 */
async function awaitMeetLink(calendarId, event, backoff = [700, 1200, 2000]) {
  let link = extractMeetLink(event);
  if (link) return link;
  for (const wait of backoff) {
    await sleep(wait);
    const res = await readEvent(calendarId, event.id);
    if (res.kind !== 'present') return null;
    link = extractMeetLink(res.event);
    if (link) return link;
  }
  return null;
}

/** Patch the times of an existing event. Idempotent. */
async function updateEventTimes(calendarId, eventId, { start, end }) {
  requireCalendarId(calendarId);
  try {
    const res = await getCalendar().events.patch({
      calendarId, eventId, sendUpdates: 'all',
      requestBody: {
        start: { dateTime: start, timeZone: 'UTC' },
        end: { dateTime: end, timeZone: 'UTC' },
      },
    });
    return { kind: 'updated', event: res.data };
  } catch (err) {
    const c = classify(err);
    if (c.status === 410) return { kind: 'gone' };
    if (c.status === 404) return { kind: 'not_found' };
    if (c.transient) return { kind: 'uncertain', error: c };
    return { kind: 'rejected', error: c };
  }
}

/**
 * Cancel by patching `status: 'cancelled'` — idempotent, and re-issuable safely.
 * A `404`/`410` is reported as such; the CALLER applies the access-probe rule before
 * treating it as cancelled, because a permissions-artefact 404 would otherwise
 * release the slot and tell Zoho a live meeting was cancelled.
 */
async function cancelEvent(calendarId, eventId) {
  requireCalendarId(calendarId);
  try {
    await getCalendar().events.patch({
      calendarId, eventId, sendUpdates: 'all', requestBody: { status: 'cancelled' },
    });
    return { kind: 'cancelled' };
  } catch (err) {
    const c = classify(err);
    if (c.status === 410) return { kind: 'gone' };
    if (c.status === 404) return { kind: 'not_found' };
    if (c.transient) return { kind: 'uncertain', error: c };
    return { kind: 'rejected', error: c };
  }
}

class ConfigError extends Error {
  constructor(code) { super(code); this.code = code; this.name = 'ConfigError'; }
}

module.exports = {
  SCOPES,
  hostTimeZone,
  requireCalendarId,
  deterministicEventId,
  sha256hex,
  classify,
  probeEventAccess,
  qualifyNotFound,
  readEvent,
  checkFreeBusy,
  insertEvent,
  extractMeetLink,
  awaitMeetLink,
  updateEventTimes,
  cancelEvent,
  ConfigError,
  // Deliberately NOT exported, and deliberately absent from this module:
  //   listEventByJourneyId — showDeleted:false cannot see a cancelled event.
};
