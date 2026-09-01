'use strict';

const { fail, methodNotAllowed, log } = require('../../booking/lib/http');
const { requireCronSecret, requireAdminSecret } = require('../../booking/lib/auth');
const { runSync } = require('./sync');

/**
 * GET|POST /api/v1/internal/lemlist-sync — the daily Lemlist import.
 *
 * `CRON_SECRET` only. `BOOKING_ADMIN_SECRET` is explicitly REJECTED even though
 * it is the more powerful credential: the two endpoints classes are kept
 * separate so a leaked admin secret cannot drive CRM writes through a job
 * endpoint, and so the rejection is observable. Same contract as
 * `booking/api/v1/internal/jobs/run.js`.
 *
 * Both GET and POST are accepted so Preview — which gets no cron — can be
 * driven by hand.
 *
 * Every gate is fail-safe OFF: without `LEMLIST_SYNC_ENABLED=true` the run is a
 * no-op, without `LEMLIST_ZOHO_WRITE_ENABLED=true` it is a full dry run, and
 * `?dryRun=1` forces a dry run regardless. The response body is the run summary,
 * byte-identical to the single logged line.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  const auth = requireCronSecret(req);
  if (!auth.ok) {
    // Observable: an admin secret presented here is a misuse worth seeing, not a
    // convenience to accept.
    if (typeof requireAdminSecret === 'function' && requireAdminSecret(req).ok) {
      log({ evt: 'lemlist.sync.admin_secret_rejected' });
    }
    return fail(res, auth.status, auth.code, 'Unauthorized');
  }

  try {
    const summary = await runSync({ now: new Date(), query: req.query || {}, env: process.env });
    log(Object.assign({ evt: 'lemlist.sync.complete' }, summary));
    return res.status(200).json(summary);
  } catch (err) {
    // runSync converts every expected failure into a counted skip, so reaching
    // here means a programming error rather than an API failure.
    log({ evt: 'lemlist.sync.error', code: err.code || err.message || 'unknown' });
    return fail(res, 500, 'lemlist_sync_failed', 'Lemlist sync failed.');
  }
};
