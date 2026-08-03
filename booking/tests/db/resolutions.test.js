'use strict';

/**
 * The operator-resolution idempotency protocol, against a real server.
 *
 * Plan coverage: #104 (replay), #113 (one verification), #114 (request mismatch),
 * #124 (stale owner cannot apply), #125 (read may repeat, effect once),
 * #128 (rotating BOOKING_ADMIN_SECRET does not change a fingerprint).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const db = require('../../db');
const RES = require('../../db/queries/resolutions');
const RV = require('../../db/queries/review');
const J = require('../../db/queries/journeys');

const { track, purgeTracked } = require('./_fixtures');
const skip = db.isConfigured() ? false : 'DATABASE_URL not set';

// The protocol needs a fingerprint key; local .env.local supplies one, but make the
// test self-sufficient so it does not silently depend on the developer's shell.
process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_ID ||= 'test-v1';
process.env.RESOLUTION_FINGERPRINT_HMAC_KEY ||= 'test-fingerprint-key-not-a-real-secret';

let seq = 0;
function nextJourney() {
  seq += 1;
  return `cafe0002-0000-4000-8000-${String(seq).padStart(12, '0')}`;
}

async function seedEscalated() {
  const id = track(nextJourney());
  await db.withTransaction(async (tx) => {
    await tx.query('DELETE FROM booking_journeys WHERE journey_id = $1', [id]);
    await tx.query(
      `INSERT INTO booking_journeys (journey_id, email_normalized, booking_status, google_outcome_state)
       VALUES ($1, $2, 'reserved', 'unknown')`,
      [id, `${id}@example.test`]
    );
    await RV.addReviewReason(tx, id, 'google_calendar_unreadable');
    await tx.query(
      "UPDATE booking_journeys SET google_outcome_state='unresolved', booking_status='needs_attention' WHERE journey_id=$1",
      [id]
    );
  });
  const row = await db.withTransaction((tx) => J.get(tx, id));
  return { id, row };
}

function requestFor(id, row, overrides = {}) {
  return {
    resolutionId: crypto.randomUUID(),
    journeyId: id,
    escalation: 't1',
    action: 'resume',
    expectedAttemptVersion: row.booking_attempt_version,
    expectedIntentVersion: row.intent_version,
    expectedReviewVersion: row.manual_review_version,
    operatorRef: 'runbook',
    ...overrides,
  };
}

test.after(async () => { if (!skip) { await purgeTracked(); await db.close(); } });

test('#104 a completed resolution replays verbatim and re-executes nothing', { skip }, async () => {
  const { id, row } = await seedEscalated();
  const req = requestFor(id, row);

  const first = await db.withTransaction((tx) => RES.reserve(tx, req));
  assert.equal(first.outcome, 'owner');

  await db.withTransaction((tx) => RES.finaliseFenced(tx, {
    resolutionId: req.resolutionId, leaseToken: first.leaseToken,
    status: 200, body: { resolved: true, escalation: 't1' },
    resolvedReasonKeys: ['google_calendar_unreadable#0'],
  }));

  const replay = await db.withTransaction((tx) => RES.reserve(tx, req));
  assert.equal(replay.outcome, 'replay');
  assert.equal(replay.status, 200);
  assert.deepEqual(replay.body, { resolved: true, escalation: 't1' });

  const rows = await db.withTransaction((tx) => RES.listForJourney(tx, id));
  assert.equal(rows.length, 1, 'no second audit row');
});

test('#113 only one caller becomes owner; the other performs no verification', { skip }, async () => {
  const { id, row } = await seedEscalated();
  const req = requestFor(id, row);

  // Two concurrent reservations on separate connections.
  const [a, b] = await Promise.all([
    db.withTransaction((tx) => RES.reserve(tx, req)),
    db.withTransaction((tx) => RES.reserve(tx, req)),
  ]);
  const outcomes = [a.outcome, b.outcome].sort();
  assert.equal(outcomes.filter((o) => o === 'owner').length, 1,
    'exactly one owner — the serialisation point is the unique insert, not timing');
  assert.ok(outcomes.includes('in_progress') || outcomes.includes('replay'),
    'the loser never becomes a second verifier');

  const rows = await db.withTransaction((tx) => RES.listForJourney(tx, id));
  assert.equal(rows.length, 1);
});

test('#114 the same id with different effect-determining input is a mismatch', { skip }, async () => {
  const { id, row } = await seedEscalated();
  const req = requestFor(id, row);
  const owner = await db.withTransaction((tx) => RES.reserve(tx, req));
  assert.equal(owner.outcome, 'owner');

  for (const change of [
    { action: 'absent' },
    { escalation: 't2' },
    { expectedReviewVersion: row.manual_review_version + 1 },
    { googleEventId: 'ev-other' },
    { acknowledgeUnlabelledEvent: true },
  ]) {
    const res = await db.withTransaction((tx) => RES.reserve(tx, { ...req, ...change }));
    assert.equal(res.outcome, 'mismatch', `changing ${Object.keys(change)[0]} must be a mismatch`);
  }

  // operatorRef alone does NOT change the effect, so it must not refuse.
  const sameEffect = await db.withTransaction((tx) => RES.reserve(tx, { ...req, operatorRef: 'someone-else' }));
  assert.equal(sameEffect.outcome, 'in_progress', 'a different label replays or waits, never mismatches');
  const stored = await db.withTransaction((tx) => RES.readRow(tx, req.resolutionId));
  assert.equal(stored.operator_ref, 'runbook', 'the first caller\'s label is kept');
});

test('#124 a stale lease owner cannot apply after another request reclaims', { skip }, async () => {
  const { id, row } = await seedEscalated();
  const req = requestFor(id, row);

  const stale = await db.withTransaction((tx) => RES.reserve(tx, req));
  assert.equal(stale.outcome, 'owner');

  // Expire the lease, simulating an owner presumed dead.
  await db.withTransaction((tx) => tx.query(
    'UPDATE booking_operator_resolutions SET lease_expires_at = now() - interval \'1 minute\' WHERE resolution_id = $1',
    [req.resolutionId]
  ));

  const reclaimer = await db.withTransaction((tx) => RES.reserve(tx, req));
  assert.equal(reclaimer.outcome, 'owner', 'the retry takes over');
  assert.equal(reclaimer.reclaimed, true);
  assert.notEqual(reclaimer.leaseToken, stale.leaseToken, 'a NEW fencing token');

  // The reclaimer applies its effect.
  await db.withTransaction(async (tx) => {
    await RES.finaliseFenced(tx, {
      resolutionId: req.resolutionId, leaseToken: reclaimer.leaseToken,
      status: 200, body: { resolved: true, by: 'reclaimer' },
    });
    await tx.query("UPDATE booking_journeys SET zoho_status='pending' WHERE journey_id=$1", [id]);
  });

  // The stale owner returns from verification and tries to apply. It must mutate
  // NOTHING — the fence is checked first, so the whole transaction aborts.
  await assert.rejects(
    () => db.withTransaction(async (tx) => {
      await RES.finaliseFenced(tx, {
        resolutionId: req.resolutionId, leaseToken: stale.leaseToken,
        status: 200, body: { resolved: true, by: 'stale' },
      });
      await tx.query("UPDATE booking_journeys SET zoho_status='failed' WHERE journey_id=$1", [id]);
    }),
    (err) => err.code === 'resolution_lease_lost',
    'the stale owner is fenced out'
  );

  const stored = await db.withTransaction((tx) => RES.readRow(tx, req.resolutionId));
  assert.deepEqual(stored.result_body, { resolved: true, by: 'reclaimer' }, 'the reclaimer\'s result stands');
  const journey = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(journey.zoho_status, 'pending', 'the stale transaction mutated nothing');
});

test('#124b two racing reclaimers produce exactly one winner', { skip }, async () => {
  const { id, row } = await seedEscalated();
  const req = requestFor(id, row);
  await db.withTransaction((tx) => RES.reserve(tx, req));
  await db.withTransaction((tx) => tx.query(
    'UPDATE booking_operator_resolutions SET lease_expires_at = now() - interval \'1 minute\' WHERE resolution_id = $1',
    [req.resolutionId]
  ));

  const [x, y] = await Promise.all([
    db.withTransaction((tx) => RES.reserve(tx, req)),
    db.withTransaction((tx) => RES.reserve(tx, req)),
  ]);
  const owners = [x, y].filter((r) => r.outcome === 'owner');
  assert.equal(owners.length, 1, 'the reclaim UPDATE is guarded on the token just read');
});

test('#125 an indeterminate failure releases the lease without finalising', { skip }, async () => {
  const { id, row } = await seedEscalated();
  const req = requestFor(id, row);
  const owner = await db.withTransaction((tx) => RES.reserve(tx, req));

  // Verification was unreadable: release, do NOT finalise. A transient failure must
  // never become a stored verdict that replays forever.
  await db.withTransaction((tx) => RES.releaseLease(tx, req.resolutionId, owner.leaseToken));

  const stored = await db.withTransaction((tx) => RES.readRow(tx, req.resolutionId));
  assert.equal(stored.state, 'processing');
  assert.equal(stored.result_status, null, 'nothing finalised');

  // The operator retries the same id and can proceed.
  const retry = await db.withTransaction((tx) => RES.reserve(tx, req));
  assert.equal(retry.outcome, 'owner');
  assert.equal(retry.attemptCount, 2, 'the repeat is counted, and bounded by RESOLUTION_MAX_ATTEMPTS');
});

test('#125b reclaims are bounded, then the resolution is stuck rather than looping', { skip }, async () => {
  const { id, row } = await seedEscalated();
  const req = requestFor(id, row);
  await db.withTransaction((tx) => RES.reserve(tx, req));
  await db.withTransaction((tx) => tx.query(
    `UPDATE booking_operator_resolutions
        SET attempt_count = $2, lease_expires_at = now() - interval '1 minute'
      WHERE resolution_id = $1`,
    [req.resolutionId, RES.maxAttempts()]
  ));
  const res = await db.withTransaction((tx) => RES.reserve(tx, req));
  assert.equal(res.outcome, 'stuck');
});

test('#128 rotating BOOKING_ADMIN_SECRET does not change an existing fingerprint', { skip }, async () => {
  const { id, row } = await seedEscalated();
  const req = requestFor(id, row);

  process.env.BOOKING_ADMIN_SECRET = 'admin-secret-generation-one';
  const owner = await db.withTransaction((tx) => RES.reserve(tx, req));
  await db.withTransaction((tx) => RES.finaliseFenced(tx, {
    resolutionId: req.resolutionId, leaseToken: owner.leaseToken,
    status: 200, body: { resolved: true },
  }));

  // Rotate the admin bearer — the credential most likely to be rotated in a hurry.
  process.env.BOOKING_ADMIN_SECRET = 'admin-secret-generation-two';

  const replay = await db.withTransaction((tx) => RES.reserve(tx, req));
  assert.equal(replay.outcome, 'replay',
    'the fingerprint is keyed by RESOLUTION_FINGERPRINT_HMAC_KEY, not by the admin bearer');
  assert.equal(replay.status, 200);
});

test('#128b rotating the fingerprint key keeps one generation replayable', { skip }, async () => {
  const { id, row } = await seedEscalated();
  const req = requestFor(id, row);

  process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_ID = 'gen-one';
  process.env.RESOLUTION_FINGERPRINT_HMAC_KEY = 'fingerprint-key-generation-one';
  const owner = await db.withTransaction((tx) => RES.reserve(tx, req));
  await db.withTransaction((tx) => RES.finaliseFenced(tx, {
    resolutionId: req.resolutionId, leaseToken: owner.leaseToken, status: 200, body: { ok: true },
  }));

  // Rotate, moving the old key to the previous slot.
  process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_PREVIOUS_ID = 'gen-one';
  process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_PREVIOUS = 'fingerprint-key-generation-one';
  process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_ID = 'gen-two';
  process.env.RESOLUTION_FINGERPRINT_HMAC_KEY = 'fingerprint-key-generation-two';

  const replay = await db.withTransaction((tx) => RES.reserve(tx, req));
  assert.equal(replay.outcome, 'replay', 'the row records the key that signed it');

  // Drop the previous slot: the old id can no longer be verified, and degrades to a
  // clean refusal rather than replaying the wrong effect.
  delete process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_PREVIOUS_ID;
  delete process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_PREVIOUS;
  const orphaned = await db.withTransaction((tx) => RES.reserve(tx, req));
  assert.equal(orphaned.outcome, 'mismatch');
  assert.equal(orphaned.reason, 'key_generation_unavailable');

  process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_ID = 'test-v1';
  process.env.RESOLUTION_FINGERPRINT_HMAC_KEY = 'test-fingerprint-key-not-a-real-secret';
});
