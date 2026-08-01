'use strict';

const db = require('../db');
const R = require('../db/queries/reservations');
const { log } = require('../lib/http');

/**
 * The purpose-aware TTL sweep. Defence in depth: with the universal outbox rule an
 * orphaned hold should be unreachable, but an armed hold must never be released by a
 * timer — only by a proven outcome.
 */
async function releaseExpired() {
  const released = await db.withTransaction((tx) => R.releaseExpiredHolds(tx, 100));
  if (released.length) log({ evt: 'reservations.expired', count: released.length });
  return { kind: 'no_progress' };
}

module.exports = { releaseExpired };
