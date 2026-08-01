'use strict';

/**
 * Whether a retention invocation must be a DRY RUN (report candidates, mutate
 * nothing).
 *
 * The scrub/purge sweep is destructive and irreversible, so execution is gated
 * behind an explicit environment switch rather than "on unless a query param
 * says otherwise". Two independent forces can demand a dry run; either suffices:
 *
 *   · `?dryRun=1` (or `dryRun=true`) on the request — an operator asking to see
 *     the candidates without touching them. This ALWAYS forces dry-run and can
 *     never be overridden by configuration.
 *   · `RETENTION_EXECUTION_ENABLED` is not exactly `true` — the fail-safe
 *     default. Absent, empty, `false`, or anything else means dry-run, so a
 *     freshly deployed environment (Production included) scrubs nothing until an
 *     operator deliberately arms it. The cron path supplies no query param, so
 *     without this gate it would scrub on its very first run.
 *
 * Real execution therefore requires BOTH `RETENTION_EXECUTION_ENABLED=true` AND
 * the absence of a `dryRun` query flag.
 *
 * Returns `{ dryRun, reason }`; `reason` is a machine code for the structured
 * log so it is observable which force selected dry-run.
 */
function retentionDryRunDecision(query, env) {
  const forcedByQuery = Boolean(query && (query.dryRun === '1' || query.dryRun === 'true'));
  const executionEnabled = String((env && env.RETENTION_EXECUTION_ENABLED) || '').toLowerCase() === 'true';
  if (forcedByQuery) return { dryRun: true, reason: 'query' };
  if (!executionEnabled) return { dryRun: true, reason: 'execution_disabled' };
  return { dryRun: false, reason: 'execution_enabled' };
}

module.exports = { retentionDryRunDecision };
