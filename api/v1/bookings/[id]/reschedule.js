const jwt = require('jsonwebtoken');
const { checkFreeBusy, listEventBySubmissionId, updateGoogleEvent } = require('../../../_utils/google');
const {
  searchEventByExternalId,
  updateZohoEvent,
  updateSubmissionRecord
} = require('../../../_utils/zoho');

const JWT_SECRET = process.env.JWT_SECRET;
const SLOT_MINUTES = 30;
const BUFFER_MS = 15 * 60 * 1000;

function fail(res, status, code, message) {
  return res.status(status).json({ error: message || code, code });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') return fail(res, 405, 'method_not_allowed', 'Method not allowed');

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return fail(res, 401, 'auth_required', 'Unauthorized');

  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch (err) {
    return fail(res, 401, 'auth_invalid', 'Unauthorized');
  }

  const { id } = req.query;
  const { slotStart } = req.body || {};
  if (!id || !slotStart) return fail(res, 400, 'validation', 'Missing required fields: id, slotStart');
  if (decoded.submissionId !== id) return fail(res, 403, 'forbidden', 'Token does not match this booking.');

  const start = new Date(slotStart);
  const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000);

  try {
    // Re-verify availability over the buffered window.
    const busyPeriods = await checkFreeBusy(
      new Date(start.getTime() - BUFFER_MS).toISOString(),
      new Date(end.getTime() + BUFFER_MS).toISOString()
    );
    const conflict = busyPeriods.some(b => {
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      return Math.max(start.getTime() - BUFFER_MS, bs) < Math.min(end.getTime() + BUFFER_MS, be);
    });
    if (conflict) return fail(res, 409, 'SLOT_TAKEN', 'The selected slot is no longer available.');

    const googleEvent = await listEventBySubmissionId(id);
    if (!googleEvent) return fail(res, 404, 'not_found', 'Calendar event not found for this booking.');
    await updateGoogleEvent(googleEvent.id, { start: start.toISOString(), end: end.toISOString() });

    const zohoEvent = await searchEventByExternalId(id);
    if (!zohoEvent) return fail(res, 404, 'not_found', 'Meeting record not found for this booking.');
    await updateZohoEvent(zohoEvent.id, {
      Start_DateTime: start.toISOString(),
      End_DateTime: end.toISOString()
    });

    await updateSubmissionRecord(id, { Submission_Step: 'Booking Rescheduled' });

    return res.status(200).json({ success: true, bookingId: id, newStart: start.toISOString() });
  } catch (error) {
    console.error('[reschedule] error:', error.code || error.message);
    return fail(res, 502, error.code || 'reschedule_failed', 'We could not reschedule the booking. Please try again.');
  }
};
