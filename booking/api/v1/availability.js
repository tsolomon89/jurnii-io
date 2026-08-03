'use strict';

const { fail, methodNotAllowed, log } = require('../../lib/http');
const S = require('../../config/slots');
const G = require('../../integrations/google');
const db = require('../../db');
const R = require('../../db/queries/reservations');

/**
 * GET /api/v1/availability
 *
 * Slots are offered only when BOTH Google and Postgres agree they are free. Postgres
 * holds are subtracted using the buffered boundary `hold_end_utc`, which is exactly
 * the FreeBusy conflict predicate, so the two sources cannot disagree about what
 * "taken" means (finding #8).
 *
 * FAILS CLOSED. When Postgres cannot be read the response is `503`, never a
 * Google-only slot list: showing a slot that another journey already holds invites a
 * double booking that only surfaces at `events.insert`. The old handler returned
 * `500` with `error.message` attached, which both leaked internals and left the
 * calendar silently empty.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const calendarKey = process.env.BOOKING_CALENDAR_KEY;
  if (!calendarId || !calendarKey) {
    return fail(res, 503, 'calendar_misconfigured', 'Booking is temporarily unavailable.');
  }

  const now = new Date();
  const noticeFloor = new Date(now.getTime() + S.minNoticeMs());
  const horizonCeil = new Date(now.getTime() + S.horizonMs());

  let timeMin = req.query && req.query.timeMin ? new Date(req.query.timeMin) : noticeFloor;
  let timeMax = req.query && req.query.timeMax
    ? new Date(req.query.timeMax)
    : new Date(timeMin.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(timeMin.getTime()) || Number.isNaN(timeMax.getTime())) {
    return fail(res, 400, 'validation', 'Invalid date range.');
  }
  if (timeMin < noticeFloor) timeMin = noticeFloor;
  if (timeMax > horizonCeil) timeMax = horizonCeil;
  if (timeMin >= timeMax) return res.status(200).json({ slots: [] });

  /**
   * Postgres FIRST, so an unreadable store fails the request before any Google call.
   *
   * EXPIRED HOLDS ARE RELEASED ON READ. An abandoned hold stops blocking its slot the
   * moment somebody asks whether that slot is free, rather than whenever the sweep next
   * happens to run — so a slot can never be reported unavailable because of an expired
   * hold, regardless of whether the sweep has run recently.
   *
   * This does NOT replace the per-minute sweep, which still releases holds nobody is
   * currently asking about and remains the safety net. It removes the dependency on the
   * sweep's timing for the one case that matters to a visitor: the slot they are looking
   * at right now.
   *
   * `releaseExpiredHolds` is reused unchanged: its `FOR UPDATE SKIP LOCKED` means two
   * concurrent availability requests (or a request and the sweep) never block each
   * other — one releases, the other skips and reads the result. A row it skips is
   * simply released by the next caller.
   *
   * The transaction covers the release and the read ONLY, and commits before the Google
   * call below. Holding it across `checkFreeBusy` would pin one of the pool's three
   * connections to Google's latency — the same rule `operator-actions.js` enforces for
   * Zoho.
   */
  let holds;
  try {
    holds = await db.withTransaction(async (tx) => {
      await R.releaseExpiredHolds(tx, 50);
      const q = await tx.query(
        `SELECT slot_start_utc, hold_end_utc
           FROM booking_slot_reservations
          WHERE host_calendar_key = $1
            AND status IN ('pending','confirmed')
            AND hold_end_utc > $2
            AND slot_start_utc < $3`,
        [calendarKey, new Date(timeMin.getTime() - S.BUFFER_MS), timeMax]
      );
      return q.rows;
    });
  } catch (err) {
    log({ evt: 'availability.store_unavailable', code: err.code || 'unknown' });
    return fail(res, 503, 'availability_unavailable', 'We could not load availability. Please try again.');
  }
  // COMMITTED. Everything below runs with no transaction open.

  let busy;
  try {
    // Query slightly wide so an event overlapping the boundary is still seen.
    busy = await G.checkFreeBusy(
      calendarId,
      new Date(timeMin.getTime() - 60 * 60 * 1000).toISOString(),
      new Date(timeMax.getTime() + 60 * 60 * 1000).toISOString()
    );
  } catch (err) {
    log({ evt: 'availability.calendar_unavailable', code: err.code || 'unknown' });
    return fail(res, 503, 'availability_unavailable', 'We could not load availability. Please try again.');
  }

  const slots = [];
  let cursor = S.ceilToGrid(timeMin);
  while (cursor < timeMax) {
    const start = new Date(cursor);
    const end = new Date(start.getTime() + S.SLOT_MS);

    if (S.isWorkingHours(start, end)) {
      const w = S.bufferedWindow(start);
      const googleConflict = busy.some((b) => {
        const bs = new Date(b.start).getTime();
        const be = new Date(b.end).getTime();
        return Math.max(w.from.getTime(), bs) < Math.min(w.to.getTime(), be);
      });
      // A hold conflicts iff its buffered window overlaps this candidate's, i.e. iff
      // the two starts are <60 minutes apart. `hold_end_utc` is that boundary.
      const holdConflict = holds.some((h) => {
        const hs = new Date(h.slot_start_utc).getTime();
        return Math.abs(hs - start.getTime()) < 60 * 60 * 1000;
      });
      if (!googleConflict && !holdConflict) {
        slots.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
    cursor = new Date(cursor.getTime() + S.SLOT_MS);
  }

  return res.status(200).json({ slots });
};
