const jwt = require('jsonwebtoken');
const {
  checkFreeBusy,
  listEventBySubmissionId,
  createGoogleEvent,
  awaitMeetLink
} = require('../../_utils/google');
const {
  createZohoEvent,
  searchEventByExternalId,
  updateSubmissionRecord
} = require('../../_utils/zoho');

const JWT_SECRET = process.env.JWT_SECRET;
const SLOT_MINUTES = 30;
const BUFFER_MS = 15 * 60 * 1000;

function fail(res, status, code, message) {
  return res.status(status).json({ error: message || code, code });
}

/** Best-effort submission write for fields that may not exist live (event ids, Meet URL). */
async function bestEffortSubmissionUpdate(submissionId, data) {
  try {
    await updateSubmissionRecord(submissionId, data);
  } catch (e) {
    console.warn(`[bookings] best-effort submission update skipped (${e.code || e.message})`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed', 'Method not allowed');

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, 401, 'auth_required', 'Unauthorized');
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch (err) {
    return fail(res, 401, 'auth_invalid', 'Unauthorized');
  }

  // Page 3 requires a converted Contact AND exactly one resolved Product Deal
  // (both are stamped into the token by the page-2 endpoint). No Lead fallback,
  // no Contact-only meeting.
  if (!decoded.step || decoded.step < 2) return fail(res, 409, 'not_ready', 'Complete the previous step first.');
  if (!decoded.contactId) return fail(res, 409, 'contact_unresolved', 'Your details are still being processed.');
  if (!decoded.dealId) return fail(res, 409, 'NO_SINGLE_DEAL', 'No single product could be resolved for this booking; our team will follow up.');

  const { slotStart } = req.body || {};
  if (!slotStart) return fail(res, 400, 'validation', 'Missing required field: slotStart');

  const submissionId = decoded.submissionId;
  const start = new Date(slotStart);
  const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000);
  const visitorEmail = decoded.email;

  try {
    // 1. Reuse an existing Google event for THIS submission first (retry recovery).
    //    A submission-owned event must not be treated as a scheduling conflict —
    //    so the availability re-check runs only when we are about to create anew.
    let googleEvent = await listEventBySubmissionId(submissionId);
    if (googleEvent) {
      console.log(`[bookings] reusing Google event ${googleEvent.id} for submission ${submissionId}`);
    } else {
      // 2. No existing event → re-verify availability over the buffered window, then create.
      const busyPeriods = await checkFreeBusy(
        new Date(start.getTime() - BUFFER_MS).toISOString(),
        new Date(end.getTime() + BUFFER_MS).toISOString()
      );
      const conflict = busyPeriods.some(b => {
        const bs = new Date(b.start).getTime();
        const be = new Date(b.end).getTime();
        return Math.max(start.getTime() - BUFFER_MS, bs) < Math.min(end.getTime() + BUFFER_MS, be);
      });
      if (conflict) return fail(res, 409, 'SLOT_TAKEN', 'The selected slot is no longer available. Please select another.');

      googleEvent = await createGoogleEvent({
        summary: 'Jurnii Product Demo Meeting',
        description: 'Product demonstration and technical overview of Jurnii.',
        start: start.toISOString(),
        end: end.toISOString(),
        attendees: [{ email: visitorEmail }],
        submissionId
      });
      console.log(`[bookings] created Google event ${googleEvent.id} for submission ${submissionId}`);
    }

    // 3. Resolve the Meet link, awaiting a pending conference. Persist the Google
    //    event id first (best-effort) so a lost response is reconcilable.
    const meetLink = await awaitMeetLink(googleEvent);
    await bestEffortSubmissionUpdate(submissionId, {
      Integration_Status: 'Pending',
      Google_Event_ID: googleEvent.id,
      Meet_URL: meetLink
    });
    if (!meetLink) {
      // Recoverable: the event exists and is reused on retry, by which time the
      // conference is typically ready. Never confirm a booking without a Meet URL.
      const e = new Error('meet_link_unavailable');
      e.code = 'MEET_PENDING';
      throw e;
    }

    // 3. Zoho Event — reuse by Ext_Calendar_Booking_ID, else create (idempotent).
    // Link to the converted Contact (Who_Id) and the exact Product Deal
    // (What_Id + $se_module='Deals') so WF007 handleMeetingEvent can advance the pipeline.
    let zohoEventId;
    const existingZohoEvent = await searchEventByExternalId(submissionId);
    if (existingZohoEvent) {
      zohoEventId = existingZohoEvent.id;
      console.log(`[bookings] reusing Zoho event ${zohoEventId} for submission ${submissionId}`);
    } else {
      const eventData = {
        Event_Title: 'Jurnii Product Demo Meeting',
        Start_DateTime: start.toISOString(),
        End_DateTime: end.toISOString(),
        Ext_Calendar_Booking_ID: submissionId,
        Meeting_Task_Stage: 'Demo Booking',
        Description: `Google Meet Link: ${meetLink}\nSubmission Reference: ${submissionId}`,
        Who_Id: { id: decoded.contactId },
        What_Id: { id: decoded.dealId },
        $se_module: 'Deals'
      };
      const meetField = process.env.ZOHO_EVENT_MEET_FIELD;
      if (meetField && meetLink) eventData[meetField] = meetLink;

      zohoEventId = await createZohoEvent(eventData);
      console.log(`[bookings] created Zoho event ${zohoEventId} for submission ${submissionId}`);
    }

    // 4. Mark the submission Confirmed (required, safe fields only) + best-effort ids.
    await updateSubmissionRecord(submissionId, {
      Integration_Status: 'Confirmed',
      Submission_Step: 'Booking Completed'
    });
    await bestEffortSubmissionUpdate(submissionId, { Zoho_Event_ID: zohoEventId });

    return res.status(200).json({
      success: true,
      status: 'confirmed',
      bookingId: submissionId,
      meetLink,
      googleEventId: googleEvent.id,
      zohoEventId
    });
  } catch (error) {
    console.error('[bookings] error:', error.code || error.message);
    // Recoverable: the Google event (if created) carries submissionId and is
    // reused on retry; we only record a failed status, never orphan silently.
    await bestEffortSubmissionUpdate(submissionId, {
      Integration_Status: 'Failed',
      Error_Message: error.code || 'booking_failed'
    });
    return fail(res, 502, error.code || 'booking_failed', 'We could not complete the booking. Please try again.');
  }
};
