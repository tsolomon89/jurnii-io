const { checkFreeBusy, updateGoogleEvent } = require('../../_utils/google');
const {
  searchEventByExternalId,
  updateZohoEvent,
  updateSubmissionRecord
} = require('../../_utils/zoho');
const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query; // This is the submissionId / booking reference
  const { slotStart } = req.body;

  if (!id || !slotStart) {
    return res.status(400).json({ error: 'Missing required fields: id, slotStart' });
  }

  const start = new Date(slotStart);
  const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 minutes duration

  try {
    // 1. RE-VERIFY AVAILABILITY FOR NEW SLOT
    const busyPeriods = await checkFreeBusy(start.toISOString(), end.toISOString());
    const isBusy = busyPeriods.some(busy => {
      const busyStart = new Date(busy.start).getTime();
      const busyEnd = new Date(busy.end).getTime();
      const bufferMs = 15 * 60 * 1000;
      return Math.max(start.getTime() - bufferMs, busyStart) < Math.min(end.getTime() + bufferMs, busyEnd);
    });

    if (isBusy) {
      return res.status(409).json({ error: 'Conflict', message: 'The selected slot is no longer available.' });
    }

    // 2. FIND AND UPDATE GOOGLE EVENT
    const googleAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    googleAuth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const calendar = google.calendar({ version: 'v3', auth: googleAuth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const googleEventsRes = await calendar.events.list({
      calendarId,
      privateExtendedProperty: `submissionId=${id}`
    });

    const googleEvent = googleEventsRes.data.items?.[0];
    if (!googleEvent) {
      return res.status(404).json({ error: 'Not Found', message: 'Google Calendar event not found for this booking.' });
    }

    await updateGoogleEvent(googleEvent.id, {
      start: start.toISOString(),
      end: end.toISOString()
    });
    console.log(`Updated Google Event: ${googleEvent.id}`);

    // 3. FIND AND UPDATE ZOHO EVENT
    const zohoEvent = await searchEventByExternalId(id);
    if (!zohoEvent) {
      return res.status(404).json({ error: 'Not Found', message: 'Zoho CRM event not found for this booking.' });
    }

    await updateZohoEvent(zohoEvent.id, {
      Start_DateTime: start.toISOString(),
      End_DateTime: end.toISOString()
    });
    console.log(`Updated Zoho Event: ${zohoEvent.id}`);

    // 4. UPDATE WEBSITE SUBMISSION
    await updateSubmissionRecord(id, {
      Submission_Step: 'Booking Rescheduled'
    });

    return res.status(200).json({
      success: true,
      bookingId: id,
      newStart: start.toISOString()
    });
  } catch (error) {
    console.error('Reschedule Error:', error);
    return res.status(500).json({ error: 'Failed to reschedule booking', message: error.message });
  }
};
