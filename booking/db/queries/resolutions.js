'use strict';

const crypto = require('crypto');
const { ConflictError } = require('../errors');
const { resolutionFingerprint, currentFingerprintKeyId, UnknownKeyError } = require('../../lib/fingerprint');

/**
 * Operator-resolution idempotency: reserve → verify → FENCE → finalise (§4.10).
 *
 * What is actually guaranteed, stated honestly:
 *
 *   For one resolutionId and one request: AT MOST ONE LIVE LEASE VERIFIES AT A TIME;
 *   a read-only verification MAY repeat after a crash-and-reclaim; and ONLY THE
 *   FENCED OWNER MAY APPLY THE EFFECT, so the database effect and the finalised
 *   result occur EXACTLY ONCE.
 *
 * Revision 15 claimed "at most one Google or Zoho call", which was an overclaim: a
 * reclaim after lease expiry does repeat the read. Repetition is harmless because no
 * operator action mutates an external system — every verification is a read — and
 * the fencing token makes the *effect* exactly-once even when a presumed-dead owner
 * turns out to be merely slow. A lease expiring is a presumption; the token is a fact.
 */

function leaseSeconds() {
  return Number(process.env.RESOLUTION_LEASE_SECONDS || 120);
}
function maxAttempts() {
  return Number(process.env.RESOLUTION_MAX_ATTEMPTS || 3);
}

/**
 * PHASE 1 — reserve, BEFORE any external read.
 *
 * `INSERT ... ON CONFLICT DO NOTHING` is the single serialisation point, so exactly
 * one caller reaches Phase 2. Returns one of:
 *
 *   { outcome: 'owner',    leaseToken }   proceed to verification
 *   { outcome: 'replay',   status, body } a completed resolution — replay verbatim
 *   { outcome: 'mismatch' }               same id, different effect-determining input
 *   { outcome: 'in_progress' }            a live lease, or someone else reclaimed first
 *   { outcome: 'stuck', attemptCount }    reclaimed too many times
 *
 * Every non-owner branch performs NO external call and NO journey mutation.
 */
async function reserve(tx, request) {
  const keyId = currentFingerprintKeyId();
  const fingerprint = resolutionFingerprint(request, keyId);
  const token = crypto.randomUUID();

  const inserted = await tx.query(
    `INSERT INTO booking_operator_resolutions
       (resolution_id, journey_id, request_fingerprint, fingerprint_key_id,
        escalation, action, reason_code,
        expected_attempt_version, expected_intent_version, expected_review_version,
        operator_ref, state, lease_token, lease_expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'processing',$12,
             now() + make_interval(secs => $13))
     ON CONFLICT (resolution_id) DO NOTHING
     RETURNING resolution_id`,
    [
      request.resolutionId, request.journeyId, fingerprint, keyId,
      request.escalation, request.action, request.reasonCode || null,
      request.expectedAttemptVersion, request.expectedIntentVersion, request.expectedReviewVersion,
      request.operatorRef || null, token, leaseSeconds(),
    ]
  );
  if (inserted.rowCount === 1) return { outcome: 'owner', leaseToken: token, fingerprint, keyId };

  // A new statement takes a fresh snapshot, so a concurrently committed row is
  // visible here. If it is still absent the other transaction rolled back.
  const existing = await readRow(tx, request.resolutionId);
  if (!existing) return { outcome: 'vanished' };

  // Compare under the key generation that SIGNED the row, not the current one, so
  // rotating a fingerprint key does not invalidate historical replays.
  let theirs;
  try {
    theirs = resolutionFingerprint(request, existing.fingerprint_key_id);
  } catch (err) {
    if (err instanceof UnknownKeyError) return { outcome: 'mismatch', reason: 'key_generation_unavailable' };
    throw err;
  }
  if (theirs !== existing.request_fingerprint) return { outcome: 'mismatch' };

  if (existing.state === 'completed') {
    return { outcome: 'replay', status: existing.result_status, body: existing.result_body };
  }

  const leaseLive = existing.lease_expires_at && existing.lease_expires_at.getTime() > Date.now();
  if (leaseLive) return { outcome: 'in_progress' };

  if (existing.attempt_count >= maxAttempts()) {
    return { outcome: 'stuck', attemptCount: existing.attempt_count };
  }

  // RECLAIM, guarded on the token just read: if someone else reclaimed in the
  // interval, this matches zero rows and we are not the owner.
  const newToken = crypto.randomUUID();
  const reclaimed = await tx.query(
    `UPDATE booking_operator_resolutions SET
       lease_token = $2,
       attempt_count = attempt_count + 1,
       lease_expires_at = now() + make_interval(secs => $3)
     WHERE resolution_id = $1
       AND state = 'processing'
       AND lease_token = $4
       AND (lease_expires_at IS NULL OR lease_expires_at < now())
     RETURNING lease_token, attempt_count`,
    [request.resolutionId, newToken, leaseSeconds(), existing.lease_token]
  );
  if (!reclaimed.rowCount) return { outcome: 'in_progress' };
  return { outcome: 'owner', leaseToken: newToken, reclaimed: true, attemptCount: reclaimed.rows[0].attempt_count };
}

/**
 * PHASE 3 — THE FENCE. Must be the first statement of the effect transaction.
 *
 * Zero rows means this request no longer owns the resolution: abort the whole
 * transaction so NOTHING is mutated, and answer `409 resolution_lease_lost`.
 */
async function finaliseFenced(tx, { resolutionId, leaseToken, status, body, verifiedOutcome = null, resolvedReasonKeys = [] }) {
  const res = await tx.query(
    `UPDATE booking_operator_resolutions SET
       state = 'completed',
       result_status = $3,
       result_body = $4,
       verified_outcome = $5,
       resolved_reason_keys = $6,
       lease_expires_at = NULL,
       completed_at = now()
     WHERE resolution_id = $1 AND state = 'processing' AND lease_token = $2
     RETURNING resolution_id`,
    [resolutionId, leaseToken, status, body, verifiedOutcome, resolvedReasonKeys]
  );
  if (!res.rowCount) throw new ConflictError('resolution_lease_lost');
  return true;
}

/**
 * Release the lease WITHOUT finalising, after an indeterminate failure — an
 * unreadable verification, a transport error, a database error. The row keeps
 * `state='processing'` and its current token, so the operator may retry the same id.
 * Deliberately NOT a finalisation: a transient failure must not become a stored
 * verdict that replays forever.
 */
async function releaseLease(tx, resolutionId, leaseToken) {
  await tx.query(
    `UPDATE booking_operator_resolutions SET lease_expires_at = NULL
      WHERE resolution_id = $1 AND state = 'processing' AND lease_token = $2`,
    [resolutionId, leaseToken]
  );
}

async function readRow(tx, resolutionId) {
  const res = await tx.query(
    'SELECT * FROM booking_operator_resolutions WHERE resolution_id = $1', [resolutionId]
  );
  return res.rows[0] || null;
}

async function listForJourney(tx, journeyId, limit = 20) {
  const res = await tx.query(
    `SELECT resolution_id, escalation, action, reason_code, state, result_status,
            resolved_reason_keys, operator_ref, created_at, completed_at
       FROM booking_operator_resolutions
      WHERE journey_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [journeyId, limit]
  );
  return res.rows;
}

module.exports = {
  leaseSeconds,
  maxAttempts,
  reserve,
  finaliseFenced,
  releaseLease,
  readRow,
  listForJourney,
};
