'use strict';

const { fail, methodNotAllowed, log } = require('../../../../lib/http');
const { requireCronSecret } = require('../../../../lib/auth');
const db = require('../../../../db');
const RT = require('../../../../db/queries/retention');

/**
 * GET|POST /api/v1/internal/jobs/retention — the PII scrub and purge sweep.
 *
 * `CRON_SECRET` only. Dry-run supported (`?dryRun=1`) and enabled by default in
 * Production. Logs counts and journey IDs only — never a scrubbed value.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  const auth = requireCronSecret(req);
  if (!auth.ok) return fail(res, auth.status, auth.code, 'Unauthorized');

  const dryRun = Boolean(req.query && (req.query.dryRun === '1' || req.query.dryRun === 'true'));
  const limit = Number((req.query && req.query.limit) || 50);

  try {
    const scrubCandidates = await db.withTransaction((tx) => RT.findScrubCandidates(tx, limit));
    const purgeCandidates = await db.withTransaction((tx) => RT.findPurgeCandidates(tx, limit));

    if (dryRun) {
      log({ evt: 'jobs.retention.dry_run', scrub: scrubCandidates.length, purge: purgeCandidates.length });
      return res.status(200).json({
        ok: true, dryRun: true,
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
