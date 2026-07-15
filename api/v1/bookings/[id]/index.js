const { deleteGoogleEvent } = require('../../_utils/google');
const {
  searchEventByExternalId,
  updateZohoEvent,
  updateSubmissionRecord
} = require('../../_utils/zoho');
const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query; // This is the submissionId / booking reference

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id' });
  }

  try {
    // 1. FIND AND DELETE GOOGLE EVENT
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
    if (googleEvent) {
      await deleteGoogleEvent(googleEvent.id);
      console.log(`Deleted Google Event: ${googleEvent.id}`);
    } else {
      console.warn(`No Google Calendar event found for booking: ${id}`);
    }

    // 2. FIND AND CANCEL ZOHO EVENT
    const zohoEvent = await searchEventByExternalId(id);
    if (zohoEvent) {
      // In Zoho CRM, we mark it as Cancelled or closed
      await updateZohoEvent(zohoEvent.id, {
        Event_Title: `[CANCELLED] ${zohoEvent.Event_Title}`,
        Meeting_Task_Stage: 'Cancelled',
        Description: `[CANCELLED]\n${zohoEvent.Description || ''}`
      });
      console.log(`Cancelled Zoho CRM Event: ${zohoEvent.id}`);
    } else {
      console.warn(`No Zoho CRM event found for booking: ${id}`);
    }

    // 3. UPDATE WEBSITE SUBMISSION
    await updateSubmissionRecord(id, {
      Integration_Status: 'Cancelled',
      Submission_Step: 'Booking Cancelled'
    });

    return res.status(200).json({
      success: true,
      bookingId: id,
      message: 'Booking cancelled successfully.'
    });
  } catch (error) {
    console.error('Cancellation Error:', error);
    return res.status(500).json({ error: 'Failed to cancel booking', message: error.message });
  }
};
