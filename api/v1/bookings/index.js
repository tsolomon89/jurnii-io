const jwt = require('jsonwebtoken');
const { checkFreeBusy, createGoogleEvent } = require('../_utils/google');
const {
  createZohoEvent,
  searchEventByExternalId,
  updateSubmissionRecord
} = require('../_utils/zoho');
const { google } = require('googleapis');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token', message: err.message });
  }

  const { slotStart } = req.body;
  if (!slotStart) {
    return res.status(400).json({ error: 'Missing required field: slotStart' });
  }

  const submissionId = decoded.submissionId;
  const start = new Date(slotStart);
  const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 minutes duration
  const visitorEmail = decoded.email;

  try {
    // 1. RE-VERIFY AVAILABILITY (Google FreeBusy query)
    const busyPeriods = await checkFreeBusy(start.toISOString(), end.toISOString());
    const isBusy = busyPeriods.some(busy => {
      const busyStart = new Date(busy.start).getTime();
      const busyEnd = new Date(busy.end).getTime();
      const bufferMs = 15 * 60 * 1000;
      return Math.max(start.getTime() - bufferMs, busyStart) < Math.min(end.getTime() + bufferMs, busyEnd);
    });

    if (isBusy) {
      return res.status(409).json({ error: 'Conflict', message: 'The selected slot is no longer available. Please select another slot.' });
    }

    // 2. GOOGLE CALENDAR EVENT (Idempotent check first)
    const googleAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    googleAuth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const calendar = google.calendar({ version: 'v3', auth: googleAuth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    let googleEvent = null;
    const existingEventsRes = await calendar.events.list({
      calendarId,
      privateExtendedProperty: `submissionId=${submissionId}`
    });

    if (existingEventsRes.data.items && existingEventsRes.data.items.length > 0) {
      googleEvent = existingEventsRes.data.items[0];
      console.log(`Reusing existing Google Calendar Event: ${googleEvent.id}`);
    } else {
      googleEvent = await createGoogleEvent({
        summary: 'Jurnii Product Demo Meeting',
        description: 'Product Demonstration and technical overview of Jurnii.',
        start: start.toISOString(),
        end: end.toISOString(),
        attendees: [{ email: visitorEmail }],
        submissionId
      });
      console.log(`Created new Google Calendar Event: ${googleEvent.id}`);
    }

    const meetLink = googleEvent.conferenceData?.entryPoints?.[0]?.uri || googleEvent.hangoutLink || '';

    // 3. ZOHO CRM EVENT (Idempotent check first)
    let zohoEventId = null;
    const existingZohoEvent = await searchEventByExternalId(submissionId);

    if (existingZohoEvent) {
      zohoEventId = existingZohoEvent.id;
      console.log(`Reusing existing Zoho CRM Event: ${zohoEventId}`);
    } else {
      // Map lookups: Who_Id is Contact (preferred) or Lead. What_Id is Deal.
      const whoId = decoded.contactId || decoded.leadId;
      const whoType = decoded.contactId ? 'Contacts' : 'Leads';

      const eventData = {
        Event_Title: 'Jurnii Product Demo Meeting',
        Start_DateTime: start.toISOString(),
        End_DateTime: end.toISOString(),
        Ext_Calendar_Booking_ID: submissionId,
        Meeting_Task_Stage: 'Demo Confirmation',
        Description: `Google Meet Link: ${meetLink}\nSubmission Reference: ${submissionId}`
      };

      if (whoId) {
        eventData.Who_Id = {
          id: whoId,
          name: whoType
        };
      }
      if (decoded.dealId) {
        eventData.What_Id = {
          id: decoded.dealId,
          name: 'Deals'
        };
      }

      zohoEventId = await createZohoEvent(eventData);
      console.log(`Created new Zoho CRM Event: ${zohoEventId}`);
    }

    // 4. UPDATE WEBSITE SUBMISSION status to Confirmed
    await updateSubmissionRecord(submissionId, {
      Integration_Status: 'Confirmed',
      Submission_Step: 'Booking Completed'
    });

    return res.status(200).json({
      success: true,
      bookingId: submissionId,
      meetLink,
      googleEventId: googleEvent.id,
      zohoEventId
    });
  } catch (error) {
    console.error('Bookings Error:', error);
    // Mark Website Submission as Failed if it failed
    try {
      await updateSubmissionRecord(submissionId, {
        Integration_Status: 'Failed',
        Error_Message: error.message
      });
    } catch (e) {
      console.error('Failed to update submission error state:', e);
    }
    return res.status(500).json({ error: 'Failed to complete booking', message: error.message });
  }
};
