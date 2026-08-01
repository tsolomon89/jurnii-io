'use strict';

const { fail, methodNotAllowed, log } = require('../../../../lib/http');
const { requireCronSecret } = require('../../../../lib/auth');
const { retentionDryRunDecision } = require('../../../../lib/retention-gate');
const db = require('../../../../db');
const RT = require('../../../../db/queries/retention');

/**
 * GET|POST /api/v1/internal/jobs/retention — the PII scrub and purge sweep.
 *
 * `CRON_SECRET` only. Destructive execution is gated behind
 * `RETENTION_EXECUTION_ENABLED=true`; without it — and in Production by default —
 * every invocation is a dry run regardless of query params, and `?dryRun=1`
 * forces dry-run even when execution is armed. See `lib/retention-gate.js`. Logs
 * counts and journey IDs only — never a scrubbed value.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  const auth = requireCronSecret(req);
  if (!auth.ok) return fail(res, auth.status, auth.code, 'Unauthorized');

  const decision = retentionDryRunDecision(req.query, process.env);
  const dryRun = decision.dryRun;
  const limit = Number((req.query && req.query.limit) || 50);

  try {
    const scrubCandidates = await db.withTransaction((tx) => RT.findScrubCandidates(tx, limit));
    const purgeCandidates = await db.withTransaction((tx) => RT.findPurgeCandidates(tx, limit));

    if (dryRun) {
      log({ evt: 'jobs.retention.dry_run', reason: decision.reason,
        scrub: scrubCandidates.length, purge: purgeCandidates.length });
      return res.status(200).json({
        ok: true, dryRun: true, reason: decision.reason,
        scrub: scrubCandidates.length, purge: purgeCandidates.length,
        journeyIds: { scrub: scrubCandidates, purge: purgeCandidates },
      });
    }

    let scrubbed = 0;
    for (const id of scrubCandidates) {
      // One transaction per journey, so a failure part-way leaves earlier work done.
      if (await db.withTransaction((tx) => RT.scrubJourney(tx, id))) scrubbed += 1;
    }
    let purged = 0;
    for (const id of purgeCandidates) {
      if (await db.withTransaction((tx) => RT.purgeJourney(tx, id))) purged += 1;
    }

    log({ evt: 'jobs.retention.complete', scrubbed, purged });
    return res.status(200).json({ ok: true, scrubbed, purged });
  } catch (err) {
    log({ evt: 'jobs.retention.error', code: err.code || 'unknown' });
    return fail(res, 500, 'retention_failed', 'Retention pass failed.');
  }
};
