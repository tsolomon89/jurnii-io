'use strict';

const { waitUntil } = require('@vercel/functions');
const { fail, methodNotAllowed, log } = require('../../../lib/http');
const { requireFlow, manageUrlFor } = require('../../../lib/auth');
const dispatch = require('../../../lib/dispatch');
const { verifyEventOwnership } = require('../../../lib/ownership');
const S = require('../../../config/slots');
const G = require('../../../integrations/google');
const { calendarFingerprint } = require('../../../lib/fingerprint');
const db = require('../../../db');
const J = require('../../../db/queries/journeys');
const R = require('../../../db/queries/reservations');
const O = require('../../../db/queries/ops');
const I = require('../../../db/queries/intents');

/**
 * POST /api/v1/bookings
 *
 * ZERO Zoho calls. The old handler resolved the CRM graph inline — reading the Lead,
 * following conversion, searching Contacts, resolving the Product Deal and creating
 * the Zoho Event — so a Zoho outage failed a booking Google had already accepted.
 * All of that is now the worker's, activated by G1 in the same transaction that
 * confirms the booking.
 *
 * Outcomes: `200 confirmed` · `202 booking_pending` · `409 SLOT_TAKEN` ·
 * `409 already_booked` · `409 booking_needs_attention` · `503 calendar_misconfigured`.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const auth = requireFlow(req, { minStep: 2 });
  if (!auth.ok) return fail(res, auth.status, auth.code, 'Unauthorized');
  const journeyId = auth.claims.journeyId;

  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const calendarKey = process.env.BOOKING_CALENDAR_KEY;
  if (!calendarId || !calendarKey) {
    return fail(res, 503, 'calendar_misconfigured', 'Booking is temporarily unavailable.');
  }

  // ---- step 0: the re-entry guard. ORDER IS SIGNIFICANT (§5.2). -------------
  const journey = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!journey) return fail(res, 404, 'journey_not_found', 'Booking not found.');

  const slotStartRaw = (req.body || {}).slotStart;
  const guard = I.bookingReentry(journey, slotStartRaw || journey.slot_start_utc || new Date(0));

  // 0a — evaluated BEFORE any success or idempotency branch, even when the journey
  // holds a google_event_id. A journey we have flagged as untrustworthy must never be
  // told `200 confirmed` off the matching-booking branch.
  if (guard.kind === 'needs_attention') {
    return fail(res, 409, 'booking_needs_attention', 'We are checking on this booking. Please contact us.');
  }
  // 0c — recovery in flight, and the state RT1.resume restores. No Google call, no
  // version bump: a repeated submit is safe by construction.
  if (guard.kind === 'pending') {
    return res.status(202).json({ status: 'booking_pending', bookingId: journeyId, pollAfterMs: 3000 });
  }
  if (guard.kind === 'cancelled') return fail(res, 409, 'booking_cancelled', 'This booking was cancelled.');

  // ---- step 1: validate the slot. 400, never a 502 from a RangeError. -------
  const slot = S.validateSlotStart(slotStartRaw);
  if (!slot.ok) return fail(res, 400, 'validation', 'That time is not available.', { reason: slot.reason });

  // 0b — idempotent success for the same slot, checked after validation so the
  // comparison is against a parsed instant.
  if (journey.google_event_id && journey.slot_start_utc
      && new Date(journey.slot_start_utc).getTime() === slot.start.getTime()) {
    return res.status(200).json({
      status: 'confirmed',
      bookingId: journeyId,
      slotStart: journey.slot_start_utc,
      meetLink: journey.google_meet_url || null,
      manageUrl: manageUrlFor(req, { journeyId, email: journey.email_normalized }),
    });
  }
  if (guard.kind === 'already_booked') {
    return fail(res, 409, 'already_booked', 'You already have a booking.');
  }
  if (guard.kind !== 'may_attempt') return fail(res, 409, 'wrong_step', 'This booking cannot be changed.');

  // ---- calendar registry pre-check: fail closed BEFORE arming anything -----
  try {
    const fp = calendarFingerprint(calendarId);
    const reg = await db.query(
      'SELECT canonical_fingerprint FROM booking_calendars WHERE host_calendar_key = $1', [calendarKey]);
    if (!reg.rowCount || reg.rows[0].canonical_fingerprint !== fp) {
      // A misconfigured deployment refuses bookings rather than quietly opening a
      // second reservation namespace.
      log({ evt: 'bookings.calendar_misconfigured', journeyId });
      return fail(res, 503, 'calendar_misconfigured', 'Booking is temporarily unavailable.');
    }
  } catch (err) {
    return fail(res, 503, 'calendar_misconfigured', 'Booking is temporarily unavailable.');
  }

  // ---- step 2: mint the manage token BEFORE events.insert (finding #14) ----
  // The invite must always carry a working management URL, including on the 202 path
  // where the browser never sees a 200.
  const manageUrl = manageUrlFor(req, { journeyId, email: journey.email_normalized });

  // ---- step 3: TRANSACTION R2 ----------------------------------------------
  let armed;
  try {
    armed = await db.withTransaction((tx) => J.R2_armCreate(tx, journeyId, {
      hostCalendarKey: calendarKey,
      googleCalendarId: calendarId,
      slotStartUtc: slot.start.toISOString(),
      candidateIdFor: (attempt) => G.deterministicEventId({ calendarKey, journeyId, attempt }),
      uncertaintyMinutes: Number(process.env.GOOGLE_UNCERTAINTY_WINDOW_MINUTES || 30),
    }));
  } catch (err) {
    if (err.code === 'SLOT_TAKEN') return fail(res, 409, 'SLOT_TAKEN', 'That time was just taken. Please choose another.');
    if (err.code === 'attempt_not_permitted') {
      return res.status(202).json({ status: 'booking_pending', bookingId: journeyId, pollAfterMs: 3000 });
    }
    log({ evt: 'bookings.arm_failed', journeyId, code: err.code || 'unknown' });
    return fail(res, 503, 'store_unavailable', 'We could not hold that time. Please try again.');
  }

  const { attemptVersion, candidateId } = armed;

  // ---- step 4: FreeBusy re-check on the PERSISTED calendar -----------------
  try {
    const w = S.bufferedWindow(slot.start);
    const busy = await G.checkFreeBusy(calendarId, w.from.toISOString(), w.to.toISOString());
    const conflict = busy.some((b) => {
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      return Math.max(w.from.getTime(), bs) < Math.min(w.to.getTime(), be);
    });
    if (conflict) {
      // TRANSACTION G2a — release the hold with create_attempts still 0, because no
      // events.insert was issued. That distinction is what makes this safe.
      await db.withTransaction((tx) => J.G2a_conflictBeforeInsert(tx, journeyId));
      return fail(res, 409, 'SLOT_TAKEN', 'That time was just taken. Please choose another.');
    }
  } catch (err) {
    // An UNREADABLE FreeBusy is not a conflict. The hold is retained and recovery
    // continues; releasing here would hand the slot away on no evidence.
    log({ evt: 'bookings.freebusy_unreadable', journeyId, code: err.code || 'unknown' });
    return res.status(202).json({ status: 'booking_pending', bookingId: journeyId, pollAfterMs: 3000 });
  }

  // ---- durably record the insert attempt, THEN insert ----------------------
  try {
    await db.withTransaction((tx) => O.incrementCreateAttempts(tx, journeyId, 'google_create_recovery'));
  } catch (err) {
    return res.status(202).json({ status: 'booking_pending', bookingId: journeyId, pollAfterMs: 3000 });
  }

  const inserted = await G.insertEvent(calendarId, {
    eventId: candidateId,
    summary: 'Jurnii Product Demo Meeting',
    description: `Product demonstration and technical overview of Jurnii.\n\nManage or cancel this meeting: ${manageUrl}`,
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    attendees: [{ email: journey.email }],
    journeyId,
    attempt: attemptVersion,
  });

  // 5b — a 409 means the id already exists. Treated as a POSITIVE existence signal,
  // never the authority: Google's docs warn duplicate detection "cannot be guaranteed"
  // at creation time, so the authority is always a direct events.get.
  let event = inserted.kind === 'created' ? inserted.event : null;
  if (inserted.kind === 'duplicate') {
    const read = await G.readEvent(calendarId, candidateId);
    if (read.kind === 'present') event = read.event;
  }

  if (!event) {
    if (inserted.kind === 'rejected') {
      await db.withTransaction((tx) => J.G2_createRejected(tx, journeyId));
      return fail(res, 502, 'booking_failed', 'We could not complete the booking. Please try again.');
    }
    // 5d — uncertain. NEVER G3 from the request path: absence is only ever proven by
    // the worker, after the deadline, with a confirmed access probe.
    await db.withTransaction((tx) => J.patchGoogle(tx, journeyId, { google_outcome_state: 'unknown' }));
    log({ evt: 'bookings.uncertain', journeyId, attempt: attemptVersion });
    return res.status(202).json({ status: 'booking_pending', bookingId: journeyId, pollAfterMs: 3000 });
  }

  // Ownership on journeyId + attempt. Email is never consulted.
  const owned = verifyEventOwnership(event, { journeyId, attemptVersion });
  if (!owned.ok) {
    log({ evt: 'bookings.ownership_mismatch', journeyId, code: owned.code });
    return res.status(202).json({ status: 'booking_pending', bookingId: journeyId, pollAfterMs: 3000 });
  }

  // ---- step 5a: TRANSACTION G1 --------------------------------------------
  const meetLink = await G.awaitMeetLink(calendarId, event);
  const runnable = new Set();
  try {
    await db.withTransaction((tx) => J.G1_createConfirmed(tx, journeyId, {
      googleEventId: event.id,
      slotStartUtc: slot.start.toISOString(),
      slotEndUtc: slot.end.toISOString(),
      meetUrl: meetLink,
    }), { collectRunnable: runnable });
  } catch (err) {
    log({ evt: 'bookings.confirm_failed', journeyId, code: err.code || 'unknown' });
    return res.status(202).json({ status: 'booking_pending', bookingId: journeyId, pollAfterMs: 3000 });
  }

  log({ evt: 'bookings.confirmed', journeyId, attempt: attemptVersion });
  // G1 armed `zoho_meeting_create`. Register the drain now, before responding — the
  // visitor's confirmation does not wait for the Zoho Meeting, Contact or Deal.
  dispatch.publish(runnable, { reason: 'google_confirmed', waitUntil });
  // A missing Meet link never fails a booking that exists (§10).
  return res.status(200).json({
    status: 'confirmed',
    bookingId: journeyId,
    slotStart: slot.start.toISOString(),
    slotEnd: slot.end.toISOString(),
    meetLink: meetLink || null,
    manageUrl,
  });
};
