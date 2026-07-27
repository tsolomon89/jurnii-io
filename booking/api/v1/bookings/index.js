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
  searchEventByExternalId,
  getContact,
  getLead,
  readConversion,
  searchContactsByEmail,
  resolveProductDeal
} = require('../../_utils/zoho');
const { normalizeEmail } = require('../../_utils/email');

const JWT_SECRET = process.env.JWT_SECRET;
const SLOT_MINUTES = 30;
const BUFFER_MS = 15 * 60 * 1000;

function fail(res, status, code, message) {
  return res.status(status).json({ error: message || code, code });
}

// Ownership is bound to the SIGNED journeyId (a lookup match alone is insufficient
// because the journeyId travels in the URL). Google carries a normalized-email
// second factor in its private props; Zoho carries the journeyId as
// Ext_Calendar_Booking_ID. Contact/Deal ids are mutable relationships and are
// NEVER used as ownership keys (a Lead-linked event may later move to its Contact).
function googleEventOwned(event, decoded) {
  const p = readEventPrivate(event);
  if (p.journeyId && p.journeyId !== decoded.journeyId) return false;
  if (p.email) return normalizeEmail(p.email) === normalizeEmail(decoded.email || '');
  return true; // legacy event without a stored email — trust the journeyId lookup
}
function zohoEventOwned(event, decoded) {
  const ext = event && event.Ext_Calendar_Booking_ID;
  return !ext || ext === decoded.journeyId;
}

/**
 * ONE bounded snapshot of the current CRM graph (no polling). Resolves the person
 * to link (Who_Id) and, only if it already exists, the exact Product Deal.
 *   - Contact token: read the Contact once; use its Account.
 *   - Lead token: read the Lead once; if readConversion supplies a Contact+Account
 *     use them; if the Lead is CONFIRMED unconverted, the Lead itself is the person;
 *     if the Lead is ABSENT, one Contact-by-email recovery lookup.
 * A thrown Zoho error (network/auth) propagates to the caller as a retryable 502 —
 * it does NOT prove the Lead still exists, so we never blindly fall back to it.
 * Returns { whoId, dealId } or { fail, status, code, message }.
 */
async function resolveCrmSnapshot(decoded, product) {
  const email = decoded.email;
  let whoId = null;
  let accountId = null;

  if (decoded.recordType === 'Contact') {
    const contact = await getContact(decoded.recordId);
    if (contact) {
      whoId = contact.id || decoded.recordId;
      accountId = (contact.Account_Name && contact.Account_Name.id) || null;
    } else {
      const found = await recoverContactByEmail(email);
      if (!found) return { fail: true, status: 502, code: 'contact_unresolved', message: 'Your details are still being set up. Please try again.' };
      whoId = found.id; accountId = found.accountId;
    }
  } else {
    const lead = await getLead(decoded.recordId);
    if (lead) {
      const conv = readConversion(lead);
      if (conv.converted && conv.contactId) {
        whoId = conv.contactId;
        accountId = conv.accountId || null;
      } else {
        whoId = lead.id || decoded.recordId; // confirmed present + unconverted
        accountId = null;
      }
    } else {
      const found = await recoverContactByEmail(email);
      if (!found) return { fail: true, status: 502, code: 'person_unresolved', message: 'Your details are still being set up. Please try again.' };
      whoId = found.id; accountId = found.accountId;
    }
  }

  // Attach the Product Deal ONLY when a product was chosen and its Deal already
  // exists (one match). No product, no Account, or a not-yet-visible Deal ->
  // person-linked meeting (see the Known Limitation in the module docs).
  let dealId = null;
  if (product && accountId) {
    const result = await resolveProductDeal(accountId, product);
    if (result && result.status === 'one' && result.deal) dealId = result.deal.id;
  }

  return { whoId, dealId };
}

async function recoverContactByEmail(email) {
  if (!email) return null;
  const contacts = await searchContactsByEmail(email);
  if (contacts.length === 1 && contacts[0].id) {
    return { id: contacts[0].id, accountId: (contacts[0].Account_Name && contacts[0].Account_Name.id) || null };
  }
  return null;
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

  // Booking requires a FLOW token that has cleared page 2. A resolved Contact/Deal
  // is NOT required — the calendar must never be gated on CRM graph consistency.
  if (decoded.purpose !== 'flow') return fail(res, 403, 'forbidden', 'This token cannot be used to book.');
  if (!decoded.step || decoded.step < 2) return fail(res, 409, 'not_ready', 'Complete the previous step first.');

  const { slotStart } = req.body || {};
  if (!slotStart) return fail(res, 400, 'validation', 'Missing required field: slotStart');

  const journeyId = decoded.journeyId;
  const start = new Date(slotStart);
  const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000);
  const visitorEmail = decoded.email;
  const product = decoded.product || null;

  // Durable self-service management link (survives the short-lived booking token).
  // Bound to the stable identity only — management verifies journeyId + email.
  const baseUrl = process.env.PUBLIC_BASE_URL || (req.headers.host ? `https://${req.headers.host}` : 'https://jurnii.io');
  const manageToken = jwt.sign(
    { purpose: 'manage', journeyId, recordType: decoded.recordType, recordId: decoded.recordId, email: visitorEmail },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  const manageUrl = `${baseUrl}/manage.html?token=${encodeURIComponent(manageToken)}&id=${encodeURIComponent(journeyId)}`;

  try {
    // 1. Google event FIRST (the visitor's actual goal, independent of CRM state).
    //    Reuse a journey-owned event before creating; only re-check availability
    //    when about to create anew (a journey-owned event is not a self-conflict).
    let googleEvent = await listEventByJourneyId(journeyId);
    if (googleEvent) {
      if (!googleEventOwned(googleEvent, decoded)) {
        return fail(res, 409, 'correlation_conflict', 'This booking reference is already associated with different details.');
      }
      console.log(`[bookings] reusing Google event ${googleEvent.id} for journey ${journeyId}`);
    } else {
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
        email: visitorEmail
      });
      console.log(`[bookings] created Google event ${googleEvent.id} for journey ${journeyId}`);
    }

    // 2. Resolve the Meet link, awaiting a pending conference. Never confirm a
    //    booking without a Meet URL (recoverable: the event is reused on retry).
    const meetLink = await awaitMeetLink(googleEvent);
    if (!meetLink) {
      const e = new Error('meet_link_unavailable');
      e.code = 'MEET_PENDING';
      throw e;
    }

    // 3. ONE bounded CRM snapshot (no polling). A Zoho read error throws here and
    //    is caught below as a retryable 502 — the Google event persists and is
    //    reused on retry, so nothing is orphaned.
    const snap = await resolveCrmSnapshot(decoded, product);
    if (snap.fail) return fail(res, snap.status, snap.code, snap.message);
    const { whoId, dealId } = snap;

    // 4. Zoho Event — reuse by Ext_Calendar_Booking_ID (journey-owned) else create.
    //    Always linked to the verified person (Who_Id). The Product Deal is attached
    //    (What_Id + $se_module='Deals', so WF007 handleMeetingEvent can advance the
    //    pipeline) ONLY when it already exists; otherwise the meeting is person-linked.
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
        Description: `Google Meet Link: ${meetLink}\nBooking Reference: ${journeyId}\nVisitor: ${visitorEmail}\nProduct: ${product || 'Not specified'}\nManage link: ${manageUrl}`
      };
      if (whoId) eventData.Who_Id = { id: whoId };
      if (dealId) {
        eventData.What_Id = { id: dealId };
        eventData.$se_module = 'Deals';
      }
      const meetField = process.env.ZOHO_EVENT_MEET_FIELD;
      if (meetField && meetLink) eventData[meetField] = meetLink;

      zohoEventId = await createZohoEvent(eventData);
      console.log(`[bookings] created Zoho event ${zohoEventId} for journey ${journeyId} (who=${whoId || 'none'} deal=${dealId || 'none'})`);
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
    // Recoverable: the Google event (if created) carries the journeyId and is
    // reused on retry, so nothing is silently orphaned.
    return fail(res, 502, error.code || 'booking_failed', 'We could not complete the booking. Please try again.');
  }
};
