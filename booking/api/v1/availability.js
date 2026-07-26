const { checkFreeBusy } = require('../_utils/google');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const hostTimeZone = process.env.HOST_TIMEZONE || 'Europe/London';
    const now = new Date();

    // 24 hours notice limit
    const minNoticeTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    // 60 days horizon limit
    const maxHorizonTime = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Parse query params or fallback
    let timeMin = req.query.timeMin ? new Date(req.query.timeMin) : minNoticeTime;
    let timeMax = req.query.timeMax ? new Date(req.query.timeMax) : new Date(timeMin.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days by default

    // Bound query range by notice and horizon
    if (timeMin < minNoticeTime) timeMin = minNoticeTime;
    if (timeMax > maxHorizonTime) timeMax = maxHorizonTime;
    if (timeMin >= timeMax) {
      return res.status(200).json({ slots: [] });
    }

    // Query Google FreeBusy
    // We query slightly before/after the range to catch overlapping events at bounds
    const queryMin = new Date(timeMin.getTime() - 60 * 60 * 1000).toISOString();
    const queryMax = new Date(timeMax.getTime() + 60 * 60 * 1000).toISOString();
    const busyPeriods = await checkFreeBusy(queryMin, queryMax);

    // Generate slots
    const slots = [];
    const durationMs = 30 * 60 * 1000;
    const bufferMs = 15 * 60 * 1000;

    // Align start search time to the next 30-minute boundary
    let current = new Date(timeMin);
    const ms = current.getTime();
    const alignTo = 30 * 60 * 1000;
    current = new Date(Math.ceil(ms / alignTo) * alignTo);

    while (current < timeMax) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + durationMs);

      // Verify the slot falls entirely within working hours and working days in host timezone
      if (isWorkingHours(slotStart, slotEnd, hostTimeZone)) {
        // Enforce 15-minute buffers pre and post
        const bufferedStart = slotStart.getTime() - bufferMs;
        const bufferedEnd = slotEnd.getTime() + bufferMs;

        // Check overlap with busy periods
        const isBusy = busyPeriods.some(busy => {
          const busyStart = new Date(busy.start).getTime();
          const busyEnd = new Date(busy.end).getTime();
          // Standard overlap check: Max(start1, start2) < Min(end1, end2)
          return Math.max(bufferedStart, busyStart) < Math.min(bufferedEnd, busyEnd);
        });

        if (!isBusy) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString()
          });
        }
      }
      current.setTime(current.getTime() + alignTo); // increment by 30 mins
    }

    return res.status(200).json({ slots });
  } catch (error) {
    console.error('Availability Error:', error);
    return res.status(500).json({ error: 'Failed to fetch availability', message: error.message });
  }
};

/**
 * Returns true if the slot falls entirely within 09:00 - 18:00 on a weekday in the host timezone.
 */
function isWorkingHours(start, end, timeZone) {
  // Check day of week in host timezone
  const dayStr = start.toLocaleDateString('en-US', { timeZone, weekday: 'short' });
  if (dayStr === 'Sat' || dayStr === 'Sun') {
    return false;
  }

  // Get hour and minute in host timezone
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });

  const [{ value: startHour },, { value: startMin }] = timeFormatter.formatToParts(start);
  const [{ value: endHour },, { value: endMin }] = timeFormatter.formatToParts(end);

  const startVal = parseInt(startHour, 10) * 60 + parseInt(startMin, 10);
  const endVal = parseInt(endHour, 10) * 60 + parseInt(endMin, 10);

  const workStart = 9 * 60; // 09:00
  const workEnd = 18 * 60;  // 18:00

  return startVal >= workStart && endVal <= workEnd;
}
