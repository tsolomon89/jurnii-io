import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const worker = require('./booking/workflows/worker.js');
const db = require('./booking/db/index.js');
const RT = require('./booking/db/queries/retention.js');
const { log } = require('./booking/lib/http.js');
const { retentionDryRunDecision } = require('./booking/lib/retention-gate.js');
const lemlistSync = require('./integrations/lemlist-zoho/sync.js');

let isShuttingDown = false;
const PASS_INTERVAL_MS = 60 * 1000; // 60 seconds
let lastRetentionRunDate = null;
let lastLemlistRunDate = null;

async function runRecoveryPass() {
  try {
    const swept = await worker.sweepReservations();
    const pass = await worker.runPass({});
    log({ evt: 'worker_runner.pass_complete', claimed: pass.claimed, ran: pass.ran, swept });
    return pass;
  } catch (err) {
    log({ evt: 'worker_runner.pass_error', code: err.code || 'unknown', message: err.message });
    return { claimed: 0, ran: 0, error: true };
  }
}

async function checkDailyJobs() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();

  // Daily retention sweep around 03:00 UTC (matches vercel.json cron: 15 3 * * *)
  if (hour >= 3 && lastRetentionRunDate !== todayStr) {
    lastRetentionRunDate = todayStr;
    try {
      log({ evt: 'worker_runner.daily_retention.start' });
      const decision = retentionDryRunDecision({}, process.env);
      if (decision.dryRun) {
        log({ evt: 'worker_runner.daily_retention.dry_run', reason: decision.reason });
      } else {
        const scrubCandidates = await db.withTransaction((tx) => RT.findScrubCandidates(tx, 50));
        const purgeCandidates = await db.withTransaction((tx) => RT.findPurgeCandidates(tx, 50));
        let scrubbed = 0;
        for (const id of scrubCandidates) {
          if (await db.withTransaction((tx) => RT.scrubJourney(tx, id))) scrubbed += 1;
        }
        let purged = 0;
        for (const id of purgeCandidates) {
          if (await db.withTransaction((tx) => RT.purgeJourney(tx, id))) purged += 1;
        }
        log({ evt: 'worker_runner.daily_retention.complete', scrubbed, purged });
      }
    } catch (err) {
      log({ evt: 'worker_runner.daily_retention.error', code: err.code || 'unknown', message: err.message });
    }
  }

  // Daily lemlist sync around 04:00 UTC (matches vercel.json cron: 30 4 * * *)
  if (hour >= 4 && lastLemlistRunDate !== todayStr) {
    lastLemlistRunDate = todayStr;
    try {
      log({ evt: 'worker_runner.daily_lemlist.start' });
      if (typeof lemlistSync.runSync === 'function') {
        const result = await lemlistSync.runSync();
        log({ evt: 'worker_runner.daily_lemlist.complete', ...result });
      }
    } catch (err) {
      log({ evt: 'worker_runner.daily_lemlist.error', message: err.message });
    }
  }
}

async function loop() {
  log({ evt: 'worker_runner.started', intervalMs: PASS_INTERVAL_MS });

  while (!isShuttingDown) {
    const result = await runRecoveryPass();
    await checkDailyJobs();

    if (isShuttingDown) break;

    // If work was claimed, immediately run another pass without waiting
    if (result && result.claimed > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }

    // Otherwise sleep until next scheduled interval
    const sleepInterval = result.error ? 5000 : PASS_INTERVAL_MS;
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, sleepInterval);
      const onSignal = () => {
        clearTimeout(timer);
        resolve();
      };
      process.once('SIGTERM', onSignal);
      process.once('SIGINT', onSignal);
    });
  }

  log({ evt: 'worker_runner.stopped' });
  process.exit(0);
}

function handleShutdown(signal) {
  log({ evt: 'worker_runner.shutting_down', signal });
  isShuttingDown = true;
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

loop().catch((err) => {
  console.error('[worker_runner.fatal]', err);
  process.exit(1);
});
