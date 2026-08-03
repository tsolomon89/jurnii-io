'use strict';

const { fail, methodNotAllowed, log } = require('../../../../../lib/http');
const { requireAdminSecret, requireCronSecret } = require('../../../../../lib/auth');
const V = require('../../../../../lib/validate');
const { UnknownKeyError } = require('../../../../../lib/fingerprint');
const db = require('../../../../../db');
const RES = require('../../../../../db/queries/resolutions');
const RV = require('../../../../../db/queries/review');
const J = require('../../../../../db/queries/journeys');
const actions = require('../../../../../workflows/operator-actions');

/**
 * POST /api/v1/internal/journeys/{journeyId}/resolve
 *
 * The guarded operator endpoint. `BOOKING_ADMIN_SECRET` only; `CRON_SECRET` is
 * explicitly rejected, because a scheduler credential must not carry authority to
 * change a booking's truth.
 *
 * Protocol: RESERVE (before any external read) → VERIFY (reads only) → FENCE → APPLY
 * and FINALISE in one transaction. The fence is checked FIRST inside the effect
 * transaction, so a presumed-dead owner that is merely slow mutates nothing.
 */

const ESCALATIONS = new Set(['t1', 't2', 't3', 't4', 'g7', 'rr1', 'mr1']);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  // Auth first, and the cron credential is refused even though both are shared secrets.
  const admin = requireAdminSecret(req);
  if (!admin.ok) {
    if (requireCronSecret(req).ok) log({ evt: 'resolve.cron_secret_rejected' });
    return fail(res, admin.status, admin.code, 'Unauthorized');
  }

  const journeyId = req.query && (req.query.id || req.query.journeyId);
  if (!journeyId || !V.isUuid(journeyId)) return fail(res, 400, 'validation', 'Invalid journey id.');

  const b = req.body || {};
  if (!V.isUuid(b.resolutionId)) return fail(res, 400, 'validation', 'resolutionId must be a uuid.');
  if (!ESCALATIONS.has(b.escalation)) return fail(res, 400, 'validation', 'Unknown escalation.');
  if (!b.action || typeof b.action !== 'string') return fail(res, 400, 'validation', 'action is required.');
  for (const k of ['expectedAttemptVersion', 'expectedIntentVersion', 'expectedReviewVersion']) {
    if (!Number.isInteger(b[k])) return fail(res, 400, 'validation', `${k} is required.`);
  }
  const legal = actions.legalActions(b.escalation);
  if (!legal.includes(b.action)) return fail(res, 400, 'invalid_action', `Not legal for ${b.escalation}.`);

  const request = {
    resolutionId: b.resolutionId,
    journeyId,
    escalation: b.escalation,
    action: b.action,
    reasonCode: b.reasonCode || null,
    expectedAttemptVersion: b.expectedAttemptVersion,
    expectedIntentVersion: b.expectedIntentVersion,
    expectedReviewVersion: b.expectedReviewVersion,
    googleEventId: b.googleEventId || null,
    zohoContactId: b.zohoContactId || null,
    zohoAccountId: b.zohoAccountId || null,
    acknowledgeUnlabelledEvent: b.acknowledgeUnlabelledEvent === true,
    operatorRef: V.truncate(b.operatorRef, V.LIMITS.operator_ref),
  };

  // ---- PHASE 1: RESERVE, before any external read -------------------------
  let reservation;
  try {
    reservation = await db.withTransaction((tx) => RES.reserve(tx, request));
  } catch (err) {
    if (err instanceof UnknownKeyError) {
      return fail(res, 409, 'resolution_request_mismatch', 'This resolution cannot be verified.');
    }
    if (err.code === 'resolution_fingerprint_key_id_missing' || err.code === 'fingerprint_secret_missing') {
      return fail(res, 503, 'resolution_not_configured', 'Operator resolution is not configured.');
    }
    if (err.code === '23503') return fail(res, 404, 'journey_not_found', 'Booking not found.');
    throw err;
  }

  switch (reservation.outcome) {
    case 'replay':
      // Exact replay. No external call, no mutation, no second audit row.
      log({ evt: 'resolve.replay', journeyId, resolutionId: request.resolutionId });
      return res.status(reservation.status).json(reservation.body);
    case 'mismatch':
      return fail(res, 409, 'resolution_request_mismatch', 'This resolutionId was used for a different request.');
    case 'in_progress':
      return fail(res, 409, 'resolution_in_progress', 'This resolution is already being applied.');
    case 'stuck':
      return fail(res, 409, 'resolution_stuck', 'This resolution has been retried too many times.');
    case 'vanished':
      return fail(res, 503, 'resolution_unavailable', 'Please retry.');
    default: break;   // 'owner' — we hold the fencing token
  }
  const leaseToken = reservation.leaseToken;

  // ---- PHASE 2: VERIFY — reads only, never a mutation --------------------
  let verified;
  try {
    verified = await actions.verify(request);
  } catch (err) {
    // Indeterminate: release the lease WITHOUT finalising, so a transient failure never
    // becomes a stored verdict that replays forever. The fence guards the release too.
    await db.withTransaction((tx) => RES.releaseLease(tx, request.resolutionId, leaseToken));
    log({ evt: 'resolve.verify_error', journeyId, code: err.code || 'unknown' });
    return fail(res, 409, 'verification_unavailable', 'We could not verify the current state. Please retry.');
  }

  if (!verified.ok && verified.indeterminate) {
    await db.withTransaction((tx) => RES.releaseLease(tx, request.resolutionId, leaseToken));
    return fail(res, 409, verified.code, verified.message || 'We could not verify the current state.');
  }

  // ---- PHASE 3: APPLY + FINALISE, one transaction, fence FIRST -----------
  try {
    const outcome = await db.withTransaction(async (tx) => {
      const status = verified.ok ? 200 : 409;
      const bodyDraft = verified.ok ? null : { error: verified.code, code: verified.code };

      // THE FENCE. Zero rows aborts the whole transaction: nothing is mutated.
      if (!verified.ok) {
        await RES.finaliseFenced(tx, {
          resolutionId: request.resolutionId, leaseToken,
          status, body: bodyDraft, verifiedOutcome: verified.observed || null,
        });
        return { status, body: bodyDraft };
      }

      const journey = await J.getForUpdate(tx, journeyId);
      if (!journey) throw Object.assign(new Error('journey_not_found'), { code: 'journey_not_found' });

      // Guards: the operator's view of all three versions is part of the contract.
      if (journey.booking_attempt_version !== request.expectedAttemptVersion
          || journey.intent_version !== request.expectedIntentVersion) {
        const body = { error: 'version_conflict', code: 'version_conflict' };
        await RES.finaliseFenced(tx, { resolutionId: request.resolutionId, leaseToken, status: 409, body });
        return { status: 409, body };
      }
      if (journey.manual_review_version !== request.expectedReviewVersion) {
        // A reason arrived between the operator's read and their write. Refuse rather
        // than silently sweeping it into the resolution.
        const body = { error: 'review_version_conflict', code: 'review_version_conflict' };
        await RES.finaliseFenced(tx, { resolutionId: request.resolutionId, leaseToken, status: 409, body });
        return { status: 409, body };
      }

      // Apply the repository effect. Every transition is a §4.8 transaction.
      const applied = await actions.apply(tx, { request, journey, verified });

      // Resolve ONLY this escalation's own reasons, bounded by the seen version.
      const resolvedKeys = applied.resolvesReasons === false ? []
        : await RV.resolveReasons(tx, journeyId,
          actions.reasonsFor(request), request.resolutionId, request.expectedReviewVersion);
      await RV.refreshAttention(tx, journeyId);

      const after = await J.get(tx, journeyId);
      const remaining = await RV.openReasonKeys(tx, journeyId);
      const body = {
        resolved: applied.resolvesReasons !== false,
        escalation: request.escalation,
        action: request.action,
        resolvedReasons: resolvedKeys,
        remainingOpenReasons: remaining,
        attentionCleared: after.needs_attention === false,
        verified: verified.observed || null,
      };

      await RES.finaliseFenced(tx, {
        resolutionId: request.resolutionId, leaseToken,
        status: 200, body, verifiedOutcome: verified.observed || null,
        resolvedReasonKeys: resolvedKeys,
      });
      return { status: 200, body };
    });

    log({
      evt: 'resolve.applied', journeyId, resolutionId: request.resolutionId,
      escalation: request.escalation, action: request.action, status: outcome.status,
    });
    return res.status(outcome.status).json(outcome.body);
  } catch (err) {
    if (err.code === 'resolution_lease_lost') {
      // Another request reclaimed while we verified. We mutated nothing.
      log({ evt: 'resolve.lease_lost', journeyId, resolutionId: request.resolutionId });
      return fail(res, 409, 'resolution_lease_lost', 'This resolution was taken over. Please re-read and retry.');
    }
    if (err.code === 'journey_not_found') return fail(res, 404, err.code, 'Booking not found.');
    // Anything else is indeterminate: leave the row processing so a retry can proceed.
    await db.withTransaction((tx) => RES.releaseLease(tx, request.resolutionId, leaseToken)).catch(() => {});
    log({ evt: 'resolve.apply_error', journeyId, code: err.code || 'unknown' });
    return fail(res, 503, 'resolution_unavailable', 'We could not apply the resolution. Please retry.');
  }
};
