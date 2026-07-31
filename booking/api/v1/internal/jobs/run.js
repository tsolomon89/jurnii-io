'use strict';

const { fail, methodNotAllowed, log } = require('../../../../lib/http');
const { requireCronSecret, requireAdminSecret } = require('../../../../lib/auth');
const worker = require('../../../../workflows/worker');

/**
 * GET|POST /api/v1/internal/jobs/run — the per-minute worker entry point.
 *
 * `CRON_SECRET` only. `BOOKING_ADMIN_SECRET` is explicitly rejected: it can change a
 * booking's truth, and a credential that powerful must not be usable on a scheduler
 * route just because both happen to be shared secrets.
 *
 * `POST` is accepted so Preview — which gets no cron — can be driven for E2E.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  const auth = requireCronSecret(req);
  if (!auth.ok) {
    // Make the rejection explicit in the log when the admin credential was offered, so a
    // misconfigured cron is diagnosable without leaking which secret was sent.
    if (requireAdminSecret(req).ok) log({ evt: 'jobs.run.admin_secret_rejected' });
    return fail(res, auth.status, auth.code, 'Unauthorized');
  }

  try {
    const swept = await worker.sweepReservations();
    const pass = await worker.runPass({});
    log({ evt: 'jobs.run.complete', claimed: pass.claimed, ran: pass.ran, swept });
    return res.status(200).json({ ok: true, ...pass, reservationsExpired: swept });
  } catch (err) {
    log({ evt: 'jobs.run.error', code: err.code || 'unknown' });
    return fail(res, 500, 'worker_failed', 'Worker pass failed.');
  }
};
