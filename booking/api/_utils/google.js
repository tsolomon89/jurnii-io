const { google } = require('googleapis');

// Least-privilege scopes for this integration. events.insert/patch/get/list and
// conference creation need `calendar.events`; `freebusy.query` additionally
// needs `calendar.events.freebusy`. These document the required grant; with a
// refresh token the effective scope is whatever was consented at token issuance
// (verify/re-authorize only if the existing token lacks a FreeBusy grant — a
// live FreeBusy call or token-scope inspection determines this).
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.freebusy'
];

const HOST_TIMEZONE = process.env.HOST_TIMEZONE || 'Europe/London';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function calendarId() {
  return process.env.GOOGLE_CALENDAR_ID || 'primary';
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

/**
 * Queries Google Calendar FreeBusy for the host calendar.
 * Returns an array of busy intervals: { start, end }.
 */
async function checkFreeBusy(timeMin, timeMax) {
  const calendar = getCalendar();
  const id = calendarId();

  const response = await calendar.freebusy.query({
    requestBody: { timeMin, timeMax, items: [{ id }] }
  });

  const calendarData = response.data.calendars[id];
  if (!calendarData || calendarData.errors) {
    throw new Error('google_freebusy_error');
  }
  return calendarData.busy || [];
}

/**
 * Finds the single Calendar event carrying our private extended property
 * `journeyId`. Centralizes the dedupe lookup so handlers don't each rebuild an
 * OAuth client. Returns the event resource or null. Callers MUST additionally
 * ownership-verify the result (see readEventPrivate) — a journeyId is
 * client-controlled, so a match is necessary but not sufficient.
 */
async function listEventByJourneyId(journeyId) {
  const calendar = getCalendar();
  const res = await calendar.events.list({
    calendarId: calendarId(),
    privateExtendedProperty: `journeyId=${journeyId}`,
    showDeleted: false,
    maxResults: 1
  });
  const items = res.data.items || [];
  return items.length > 0 ? items[0] : null;
}

/** Reads our private extended properties ({ journeyId, email }). */
function readEventPrivate(event) {
  const p = (event && event.extendedProperties && event.extendedProperties.private) || {};
  return { journeyId: p.journeyId || '', email: p.email || '' };
}

/**
 * Creates a Calendar event with a Google Meet conference and emails the invitee
 * (sendUpdates:'all'). The private extended properties `journeyId` + `email` are
 * the cross-run dedupe key and the stable ownership second factor — a reuse is
 * verified against the signed token's journeyId + normalized email (never mutable
 * Contact/Deal ids).
 */
async function createGoogleEvent(eventDetails) {
  const calendar = getCalendar();
  const tz = eventDetails.timeZone || HOST_TIMEZONE;

  const requestBody = {
    summary: eventDetails.summary,
    description: eventDetails.description,
    start: { dateTime: eventDetails.start, timeZone: tz },
    end: { dateTime: eventDetails.end, timeZone: tz },
    attendees: eventDetails.attendees,
    conferenceData: {
      createRequest: {
        // Stable-per-journey requestId so a retried insert (if the dedupe list
        // race is ever lost) does not mint a second distinct conference.
        requestId: `meet-${eventDetails.journeyId}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    },
    extendedProperties: {
      private: {
        journeyId: eventDetails.journeyId,
        email: eventDetails.email || ''
      }
    }
  };

  const response = await calendar.events.insert({
    calendarId: calendarId(),
    requestBody,
    conferenceDataVersion: 1,
    sendUpdates: 'all'
  });
  return response.data;
}

/**
 * Extracts the Meet URL from an event resource, preferring the `video` entry
 * point (never assuming entryPoints[0], which may be phone/SIP). Falls back to
 * hangoutLink, else ''.
 */
function extractMeetLink(event) {
  if (!event) return '';
  const eps = (event.conferenceData && event.conferenceData.entryPoints) || [];
  const video = eps.find(e => e && e.entryPointType === 'video' && e.uri);
  if (video) return video.uri;
  return event.hangoutLink || '';
}

/** GET a single event by id. */
async function getEvent(eventId) {
  const res = await getCalendar().events.get({ calendarId: calendarId(), eventId });
  return res.data;
}

/**
 * Resolves the Meet URL, re-reading the event with bounded backoff while the
 * conference is still being created (createRequest.status.statusCode === 'pending').
 * Returns '' only if the conference cannot be resolved (caller should treat that
 * as recoverable and NOT confirm the booking).
 */
async function awaitMeetLink(event, backoff = [700, 1200, 2000]) {
  let link = extractMeetLink(event);
  if (link) return link;
  let current = event;
  for (const delay of backoff) {
    const cr = current && current.conferenceData && current.conferenceData.createRequest;
    const code = cr && cr.status && cr.status.statusCode;
    if (code === 'failure') break; // conference will never be created
    await sleep(delay);
    try { current = await getEvent(event.id); } catch (_) { break; }
    link = extractMeetLink(current);
    if (link) return link;
  }
  return link || '';
}

/** Patches start/end of an event (reschedule); preserves Meet + attendees. */
async function updateGoogleEvent(eventId, eventDetails) {
  const calendar = getCalendar();
  const tz = eventDetails.timeZone || HOST_TIMEZONE;
  const response = await calendar.events.patch({
    calendarId: calendarId(),
    eventId,
    sendUpdates: 'all',
    requestBody: {
      start: { dateTime: eventDetails.start, timeZone: tz },
      end: { dateTime: eventDetails.end, timeZone: tz }
    }
  });
  return response.data;
}

/**
 * Soft-cancels an event (status:'cancelled') and notifies attendees, mirroring
 * the Zoho soft-cancel and preserving history (vs a hard delete).
 */
async function cancelGoogleEvent(eventId) {
  const calendar = getCalendar();
  await calendar.events.patch({
    calendarId: calendarId(),
    eventId,
    sendUpdates: 'all',
    requestBody: { status: 'cancelled' }
  });
}

module.exports = {
  SCOPES,
  HOST_TIMEZONE,
  checkFreeBusy,
  listEventByJourneyId,
  readEventPrivate,
  createGoogleEvent,
  extractMeetLink,
  getEvent,
  awaitMeetLink,
  updateGoogleEvent,
  cancelGoogleEvent
};
