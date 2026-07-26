const jwt = require('jsonwebtoken');
const {
  checkFreeBusy,
  listEventByJourneyId,
  readEventPrivate,
  createGoogleEvent,
  awaitMeetLink
} = require('../../_utils/google');
const {
  createZohoEvent,
  searchEventByExternalId
} = require('../../_utils/zoho');

const JWT_SECRET = process.env.JWT_SECRET;
const SLOT_MINUTES = 30;
const BUFFER_MS = 15 * 60 * 1000;

function fail(res, status, code, message) {
  return res.status(status).json({ error: message || code, code });
}

// A journeyId is client-controlled, so a lookup match is necessary but not
// sufficient: a reused event must belong to the same Contact + Deal as the token.
function googleEventOwned(event, decoded) {
  const p = readEventPrivate(event);
  return p.contactId === decoded.contactId && p.dealId === decoded.dealId;
}
function zohoEventOwned(event, decoded) {
  const who = (event.Who_Id && event.Who_Id.id) || '';
  const what = (event.What_Id && event.What_Id.id) || '';
  return who === decoded.contactId && what === decoded.dealId;
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
  // (both stamped into the token by page 2). No Lead fallback, no Contact-only meeting.
  if (!decoded.step || decoded.step < 2) return fail(res, 409, 'not_ready', 'Complete the previous step first.');
  if (!decoded.contactId) return fail(res, 409, 'contact_unresolved', 'Your details are still being processed.');
  if (!decoded.dealId) return fail(res, 409, 'NO_SINGLE_DEAL', 'No single product could be resolved for this booking; our team will follow up.');

  const { slotStart } = req.body || {};
  if (!slotStart) return fail(res, 400, 'validation', 'Missing required field: slotStart');

  const journeyId = decoded.journeyId;
  const start = new Date(slotStart);
  const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000);
  const visitorEmail = decoded.email;

  // Durable self-service management link (survives the short-lived booking token).
  const baseUrl = process.env.PUBLIC_BASE_URL || (req.headers.host ? `https://${req.headers.host}` : 'https://jurnii.io');
  const manageToken = jwt.sign(
    { purpose: 'manage', journeyId, contactId: decoded.contactId, dealId: decoded.dealId },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  const manageUrl = `${baseUrl}/manage.html?token=${encodeURIComponent(manageToken)}&id=${encodeURIComponent(journeyId)}`;

  try {
    // 1. Reuse an existing Google event for THIS journey first (retry recovery).
    //    A journey-owned event must not be treated as a scheduling conflict — so
    //    the availability re-check runs only when we are about to create anew.
    let googleEvent = await listEventByJourneyId(journeyId);
    if (googleEvent) {
      if (!googleEventOwned(googleEvent, decoded)) {
        return fail(res, 409, 'correlation_conflict', 'This booking reference is already associated with different details.');
      }
      console.log(`[bookings] reusing Google event ${googleEvent.id} for journey ${journeyId}`);
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
        description: `Product demonstration and technical overview of Jurnii.\n\nManage or cancel this meeting: ${manageUrl}`,
        start: start.toISOString(),
        end: end.toISOString(),
        attendees: [{ email: visitorEmail }],
        journeyId,
        contactId: decoded.contactId,
        dealId: decoded.dealId
      });
      console.log(`[bookings] created Google event ${googleEvent.id} for journey ${journeyId}`);
    }

    // 3. Resolve the Meet link, awaiting a pending conference.
    const meetLink = await awaitMeetLink(googleEvent);
    if (!meetLink) {
      // Recoverable: the event exists and is reused on retry, by which time the
      // conference is typically ready. Never confirm a booking without a Meet URL.
      const e = new Error('meet_link_unavailable');
      e.code = 'MEET_PENDING';
      throw e;
    }

    // 4. Zoho Event — reuse by Ext_Calendar_Booking_ID (ownership-verified), else create.
    //    Links to the converted Contact (Who_Id) and the exact Product Deal
    //    (What_Id + $se_module='Deals') so WF007 handleMeetingEvent can advance the pipeline.
    let zohoEventId;
    const existingZohoEvent = await searchEventByExternalId(journeyId);
    if (existingZohoEvent) {
      if (!zohoEventOwned(existingZohoEvent, decoded)) {
        return fail(res, 409, 'correlation_conflict', 'This booking reference is already associated with different details.');
      }
      zohoEventId = existingZohoEvent.id;
      console.log(`[bookings] reusing Zoho event ${zohoEventId} for journey ${journeyId}`);
    } else {
      const eventData = {
        Event_Title: 'Jurnii Product Demo Meeting',
        Start_DateTime: start.toISOString(),
        End_DateTime: end.toISOString(),
        Ext_Calendar_Booking_ID: journeyId,
        Meeting_Task_Stage: 'Demo Booking',
        Description: `Google Meet Link: ${meetLink}\nBooking Reference: ${journeyId}\nManage link: ${manageUrl}`,
        Who_Id: { id: decoded.contactId },
        What_Id: { id: decoded.dealId },
        $se_module: 'Deals'
      };
      const meetField = process.env.ZOHO_EVENT_MEET_FIELD;
      if (meetField && meetLink) eventData[meetField] = meetLink;

      zohoEventId = await createZohoEvent(eventData);
      console.log(`[bookings] created Zoho event ${zohoEventId} for journey ${journeyId}`);
    }

    console.log(`[bookings] confirmed booking for journey ${journeyId} (google=${googleEvent.id} zoho=${zohoEventId})`);
    return res.status(200).json({
      success: true,
      status: 'confirmed',
      bookingId: journeyId,
      meetLink,
      manageUrl,
      googleEventId: googleEvent.id,
      zohoEventId
    });
  } catch (error) {
    console.error(`[bookings] error for journey ${journeyId}:`, error.code || error.message);
    // Recoverable: the Google event (if created) carries the correlation id and is
    // reused on retry, so nothing is silently orphaned.
    return fail(res, 502, error.code || 'booking_failed', 'We could not complete the booking. Please try again.');
  }
};
