'use strict';

const { fail, methodNotAllowed, log } = require('../../lib/http');
const HC = require('../../config/host-calendars');

/**
 * GET /api/v1/booking-hosts
 *
 * The host options the internal form renders. Keys and labels ONLY — a Google Calendar id
 * must never reach the browser, so this response is the boundary that keeps the frontend
 * dealing in opaque identifiers (`fraser`) rather than addresses.
 *
 * Unconfigured hosts are RETURNED WITH `configured: false` rather than omitted, so the
 * form can render Marlon disabled and an operator can see that he exists but is not yet
 * available. Hiding him would look identical to a bug. The server refuses him regardless:
 * `POST /submissions/{id}` answers `400 booking_host_invalid` for any host that does not
 * resolve, so this flag is an affordance, never the control.
 *
 * Unauthenticated, like `GET /availability`. It discloses three first names that already
 * appear on the website and nothing else.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  let hosts;
  try {
    // Throws on a configuration collision — two hosts on one calendar, or two calendars
    // under one key. Publishing a host list built on a split reservation namespace would
    // be worse than serving nothing.
    hosts = HC.listHostsForUi();
  } catch (err) {
    log({ evt: 'booking_hosts.misconfigured', code: err.code || 'unknown' });
    return fail(res, 503, 'calendar_misconfigured', 'Booking is temporarily unavailable.');
  }

  return res.status(200).json({ hosts, defaultHost: HC.publicHostKey() });
};
