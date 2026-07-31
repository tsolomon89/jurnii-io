'use strict';

/**
 * The single source of truth for slot geometry.
 *
 * Consumed by `availability.js`, `bookings/index.js`, the reschedule handler and
 * the `0001_init.sql` grid CHECK, replacing three independent copies of the same
 * arithmetic. Finding #9: `POST /bookings` validated `slotStart` for truthiness
 * only, so a valid token could book 03:07 on a Sunday, and a malformed string
 * threw `RangeError` and surfaced as a 502 where 400 is correct.
 */

const SLOT_MINUTES = 30;
const BUFFER_MINUTES = 15;

/** Grid modulus in seconds. The DB CHECK is generated from this value. */
const GRID_SECONDS = SLOT_MINUTES * 60;

const SLOT_MS = SLOT_MINUTES * 60 * 1000;
const BUFFER_MS = BUFFER_MINUTES * 60 * 1000;

/** Overridable so test 52 can lower the notice and make the hold_end gap observable. */
function minNoticeMs() {
  return numberFromEnv('MIN_NOTICE_MS', 24 * 60 * 60 * 1000);
}
function horizonMs() {
  return numberFromEnv('BOOKING_HORIZON_MS', 60 * 24 * 60 * 60 * 1000);
}
function hostTimeZone() {
  return process.env.HOST_TIMEZONE || 'Europe/London';
}

const WORK_START_MINUTES = 9 * 60;   // 09:00 in the host timezone
const WORK_END_MINUTES = 18 * 60;    // 18:00 in the host timezone

function numberFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Wall-clock minutes-since-midnight and weekday of an instant, in a named zone.
 *
 * Reads `formatToParts` by part *type* rather than by positional destructuring.
 * The existing `availability.js` used `[{value:h},,{value:m}]`, which silently
 * depends on the formatter emitting exactly `hour, literal, minute` in that
 * order — and on `hour12:false` never producing the "24" that some locales use
 * for midnight. Both assumptions are avoidable.
 */
function zonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  return {
    weekday: parts.weekday,
    minutes: parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10),
  };
}

/** True when [start, end) lies entirely inside working hours on a weekday. */
function isWorkingHours(start, end, timeZone) {
  const tz = timeZone || hostTimeZone();
  const s = zonedParts(start, tz);
  if (s.weekday === 'Sat' || s.weekday === 'Sun') return false;
  const e = zonedParts(end, tz);
  // A slot ending exactly at midnight would report 0; it cannot pass WORK_END
  // anyway, and an end-before-start reading means the slot crossed the day.
  if (e.minutes < s.minutes) return false;
  return s.minutes >= WORK_START_MINUTES && e.minutes <= WORK_END_MINUTES;
}

/** True when an instant sits on a UTC 30-minute epoch boundary. */
function isAligned(date) {
  return Math.floor(date.getTime() / 1000) % GRID_SECONDS === 0;
}

/** The next grid boundary at or after `date`. */
function ceilToGrid(date) {
  const ms = date.getTime();
  const step = GRID_SECONDS * 1000;
  return new Date(Math.ceil(ms / step) * step);
}

/**
 * Validate a visitor-supplied `slotStart`.
 *
 * Returns `{ ok: true, start, end }` or `{ ok: false, reason }` where reason is
 * one of `slot_malformed | slot_unaligned | slot_outside_hours | slot_too_soon |
 * slot_beyond_horizon`. Handlers map any of these to `400` — never a 502.
 *
 * `now` is injectable so tests do not depend on the wall clock.
 */
function validateSlotStart(slotStart, now) {
  if (slotStart === undefined || slotStart === null || slotStart === '') {
    return { ok: false, reason: 'slot_malformed' };
  }
  if (typeof slotStart !== 'string' && !(slotStart instanceof Date)) {
    return { ok: false, reason: 'slot_malformed' };
  }
  const start = slotStart instanceof Date ? new Date(slotStart.getTime()) : new Date(slotStart);
  if (Number.isNaN(start.getTime())) return { ok: false, reason: 'slot_malformed' };

  if (!isAligned(start)) return { ok: false, reason: 'slot_unaligned' };

  const end = new Date(start.getTime() + SLOT_MS);
  const ref = now ? new Date(now) : new Date();

  if (start.getTime() < ref.getTime() + minNoticeMs()) return { ok: false, reason: 'slot_too_soon' };
  if (start.getTime() > ref.getTime() + horizonMs()) return { ok: false, reason: 'slot_beyond_horizon' };
  if (!isWorkingHours(start, end, hostTimeZone())) return { ok: false, reason: 'slot_outside_hours' };

  return { ok: true, start, end };
}

/**
 * The buffered hold window of a slot: `[start - BUFFER, start + SLOT + BUFFER)`.
 *
 * Exactly equivalent to the availability conflict predicate — two slots conflict
 * iff their buffered windows overlap, iff their starts are <60 minutes apart —
 * and identical to the generated `slot_hold` column, so Postgres and Node cannot
 * disagree about what "taken" means (finding #8).
 */
function bufferedWindow(start) {
  const s = start instanceof Date ? start : new Date(start);
  return {
    from: new Date(s.getTime() - BUFFER_MS),
    to: new Date(s.getTime() + SLOT_MS + BUFFER_MS),
  };
}

/** `hold_end_utc` — the instant a hold stops withholding anything. */
function holdEnd(start) {
  return bufferedWindow(start).to;
}

module.exports = {
  SLOT_MINUTES,
  BUFFER_MINUTES,
  GRID_SECONDS,
  SLOT_MS,
  BUFFER_MS,
  WORK_START_MINUTES,
  WORK_END_MINUTES,
  minNoticeMs,
  horizonMs,
  hostTimeZone,
  isWorkingHours,
  isAligned,
  ceilToGrid,
  validateSlotStart,
  bufferedWindow,
  holdEnd,
  zonedParts,
};
