const jwt = require('jsonwebtoken');
const { listEventByJourneyId, readEventPrivate, cancelGoogleEvent } = require('../../../_utils/google');
const {
  searchEventByExternalId,
  updateZohoEvent
} = require('../../../_utils/zoho');
const { normalizeEmail } = require('../../../_utils/email');

const JWT_SECRET = process.env.JWT_SECRET;

function fail(res, status, code, message) {
  return res.status(status).json({ error: message || code, code });
}

// Ownership is bound to the signed journeyId (+ normalized email for Google).
// Contact/Deal ids are mutable relationships, never ownership keys.
function googleEventOwned(event, decoded) {
  const p = readEventPrivate(event);
  if (p.journeyId && p.journeyId !== decoded.journeyId) return false;
  if (p.email) return normalizeEmail(p.email) === normalizeEmail(decoded.email || '');
  return true;
}
function zohoEventOwned(event, decoded) {
  const ext = event && event.Ext_Calendar_Booking_ID;
  return !ext || ext === decoded.journeyId;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') return fail(res, 405, 'method_not_allowed', 'Method not allowed');

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return fail(res, 401, 'auth_required', 'Unauthorized');

  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch (err) {
    return fail(res, 401, 'auth_invalid', 'Unauthorized');
  }

  if (decoded.purpose !== 'manage') return fail(res, 403, 'forbidden', 'This token cannot manage a booking.');

  const { id } = req.query;
  if (!id) return fail(res, 400, 'validation', 'Missing required field: id');
  if (decoded.journeyId !== id) return fail(res, 403, 'forbidden', 'Token does not match this booking.');

  try {
    // Soft-cancel the Google event (notifies attendees) — ownership-verified.
    const googleEvent = await listEventByJourneyId(id);
    if (googleEvent) {
      if (!googleEventOwned(googleEvent, decoded)) {
        return fail(res, 409, 'correlation_conflict', 'This booking reference is associated with different details.');
      }
      await cancelGoogleEvent(googleEvent.id);
      console.log(`[cancel] cancelled Google event ${googleEvent.id}`);
    } else {
      console.warn(`[cancel] no Google event for journey ${id}`);
    }

    // Mark the Zoho event cancelled (title/description marker only — avoids
    // writing an unverified picklist value) — ownership-verified.
    const zohoEvent = await searchEventByExternalId(id);
    if (zohoEvent) {
      if (!zohoEventOwned(zohoEvent, decoded)) {
        return fail(res, 409, 'correlation_conflict', 'This booking reference is associated with different details.');
      }
      await updateZohoEvent(zohoEvent.id, {
        Event_Title: `[CANCELLED] ${zohoEvent.Event_Title || 'Jurnii Product Demo Meeting'}`,
        Description: `[CANCELLED]\n${zohoEvent.Description || ''}`
      });
      console.log(`[cancel] marked Zoho event ${zohoEvent.id} cancelled`);
    } else {
      console.warn(`[cancel] no Zoho event for journey ${id}`);
    }

    console.log(`[cancel] cancelled booking for journey ${id}`);
    return res.status(200).json({ success: true, bookingId: id, message: 'Booking cancelled.' });
  } catch (error) {
    console.error('[cancel] error:', error.code || error.message);
    return fail(res, 502, error.code || 'cancel_failed', 'We could not cancel the booking. Please try again.');
  }
};
