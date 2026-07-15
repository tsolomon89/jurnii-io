const { google } = require('googleapis');

function getGoogleAuth() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://jurnii.io/api/v1/google/callback'
  );

  oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return oAuth2Client;
}

/**
 * Queries Google Calendar FreeBusy.
 * Returns an array of busy intervals: { start: string, end: string }
 */
async function checkFreeBusy(timeMin, timeMax) {
  const auth = getGoogleAuth();
  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: calendarId }]
    }
  });

  const calendarData = response.data.calendars[calendarId];
  if (!calendarData || calendarData.errors) {
    throw new Error(`Google FreeBusy error: ${JSON.stringify(calendarData ? calendarData.errors : 'No calendar data')}`);
  }

  return calendarData.busy || [];
}

/**
 * Creates a Calendar Event with Google Meet conference enabled.
 */
async function createGoogleEvent(eventDetails) {
  const auth = getGoogleAuth();
  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  const requestBody = {
    summary: eventDetails.summary,
    description: eventDetails.description,
    start: {
      dateTime: eventDetails.start, // ISO DateTime string
      timeZone: eventDetails.timeZone || 'UTC'
    },
    end: {
      dateTime: eventDetails.end, // ISO DateTime string
      timeZone: eventDetails.timeZone || 'UTC'
    },
    attendees: eventDetails.attendees, // Array of { email }
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    },
    extendedProperties: {
      private: {
        submissionId: eventDetails.submissionId
      }
    }
  };

  const response = await calendar.events.insert({
    calendarId,
    requestBody,
    conferenceDataVersion: 1
  });

  return response.data;
}

/**
 * Updates an existing Google Calendar event (used for rescheduling).
 */
async function updateGoogleEvent(eventId, eventDetails) {
  const auth = getGoogleAuth();
  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  const response = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: {
      start: {
        dateTime: eventDetails.start,
        timeZone: eventDetails.timeZone || 'UTC'
      },
      end: {
        dateTime: eventDetails.end,
        timeZone: eventDetails.timeZone || 'UTC'
      }
    }
  });

  return response.data;
}

/**
 * Deletes/Cancels an existing Google Calendar event.
 */
async function deleteGoogleEvent(eventId) {
  const auth = getGoogleAuth();
  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  await calendar.events.delete({
    calendarId,
    eventId
  });
}

module.exports = {
  checkFreeBusy,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent
};
