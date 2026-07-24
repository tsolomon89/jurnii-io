const { google } = require('googleapis');

// Least-privilege scope for this integration: freebusy.query + events
// insert/patch/list/delete only. The refresh token must have been consented
// with (at most) this scope — declaring it here documents the requirement and
// is used if an interactive auth/callback flow is ever added.
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const HOST_TIMEZONE = process.env.HOST_TIMEZONE || 'Europe/London';

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
 * `submissionId`. Centralizes the dedupe lookup so handlers don't each rebuild
 * an OAuth client. Returns the event resource or null.
 */
async function listEventBySubmissionId(submissionId) {
  const calendar = getCalendar();
  const res = await calendar.events.list({
    calendarId: calendarId(),
    privateExtendedProperty: `submissionId=${submissionId}`,
    showDeleted: false,
    maxResults: 1
  });
  const items = res.data.items || [];
  return items.length > 0 ? items[0] : null;
}

/**
 * Creates a Calendar event with a Google Meet conference and emails the invitee
 * (sendUpdates:'all'). The private extended property `submissionId` is the
 * cross-run dedupe key.
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
        // Stable-per-submission requestId so a retried insert (if the dedupe
        // list race is ever lost) does not mint a second distinct conference.
        requestId: `meet-${eventDetails.submissionId}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    },
    extendedProperties: {
      private: { submissionId: eventDetails.submissionId }
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

/** Extracts the Meet URL from an event resource. */
function extractMeetLink(event) {
  if (!event) return '';
  const uri = event.conferenceData &&
    event.conferenceData.entryPoints &&
    event.conferenceData.entryPoints[0] &&
    event.conferenceData.entryPoints[0].uri;
  return uri || event.hangoutLink || '';
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
  listEventBySubmissionId,
  createGoogleEvent,
  extractMeetLink,
  updateGoogleEvent,
  cancelGoogleEvent
};
