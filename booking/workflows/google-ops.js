'use strict';

const db = require('../db');
const G = require('../integrations/google');
const J = require('../db/queries/journeys');
const R = require('../db/queries/reservations');
const O = require('../db/queries/ops');
const RV = require('../db/queries/review');
const { verifyEventOwnership } = require('../lib/ownership');
const { log } = require('../lib/http');

/**
 * Google worker steps. Read-only recovery: these steps never issue a create.
 *
 * Every call uses the PERSISTED `google_calendar_id` and `google_event_candidate_id` /
 * `google_event_id` from the journey row, never environment configuration, so changing
 * `GOOGLE_CALENDAR_ID` mid-flight cannot orphan a booking or point recovery at the
 * wrong calendar.
 */

function watchHours() { return Number(process.env.GOOGLE_WATCH_MAX_HOURS || 24); }
function watchCadence() { return Number(process.env.GOOGLE_WATCH_CADENCE_MINUTES || 60); }

/** Both qualifiers of the §5.1 rule, in one place. */
async function provenAbsent(calendarId, readKind) {
  if (readKind === 'gone' || readKind === 'cancelled') return true;
  if (readKind !== 'not_found') return false;
  const { verdict } = await G.qualifyNotFound(calendarId);
  return verdict === 'absent';
}

/**
 * `google_create_recovery` — the ONLY worker path to G3, and G3 requires proof.
 *
 * Strictly read-only: it issues `events.get` and, on a `404`, the access probe. It
 * never inserts, so an uncertain create can never become a second event.
 */
async function createRecovery(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j || !j.google_calendar_id || !j.google_event_candidate_id) {
    return { kind: 'parked_precondition', errorCode: 'no_candidate' };
  }

  const deadlineReached = claim.deadline_at && new Date(claim.deadline_at).getTime() <= Date.now();
  const read = await G.readEvent(j.google_calendar_id, j.google_event_candidate_id);

  if (read.kind === 'present') {
    const owned = verifyEventOwnership(read.event, {
      journeyId, attemptVersion: j.booking_attempt_version,
      adoptedEventId: j.google_event_adopted_at ? j.google_event_id : null,
    });
    if (!owned.ok) {
      // Never adopted, and the hold is RETAINED: a mismatch is not absence.
      await db.withTransaction(async (tx) => {
        await RV.addReviewReason(tx, journeyId, owned.code === 'stale_attempt_event'
          ? 'stale_attempt_event' : 'correlation_conflict');
      });
      return { kind: 'retryable_failure', errorCode: owned.code };
    }
    const start = read.event.start && (read.event.start.dateTime || read.event.start.date);
    const end = read.event.end && (read.event.end.dateTime || read.event.end.date);
    const meet = G.extractMeetLink(read.event);
    await db.withTransaction((tx) => J.G1_createConfirmed(tx, journeyId, {
      googleEventId: read.event.id,
      slotStartUtc: new Date(start).toISOString(),
      slotEndUtc: new Date(end).toISOString(),
      meetUrl: meet || null,
    }));
    log({ evt: 'google.create_recovery.confirmed', journeyId });
    return { kind: 'progress', recorded: true };
  }

  // `410` or `status:'cancelled'` — the id is spent and unusable for this attempt.
  if (read.kind === 'gone' || read.kind === 'cancelled') {
    await db.withTransaction((tx) => J.G3_provenAbsent(tx, journeyId));
    log({ evt: 'google.create_recovery.absent', journeyId, via: read.kind });
    return { kind: 'progress', recorded: true };
  }

  if (read.kind === 'not_found') {
    const { verdict, probe } = await G.qualifyNotFound(j.google_calendar_id);
    if (verdict !== 'absent') {
      // Access unconfirmed: `[google_calendar_unreadable]`, hold RETAINED, attempt NOT
      // final. A revoked scope or downgraded role must never look like absence.
      await db.withTransaction((tx) => RV.addReviewReason(tx, journeyId, 'google_calendar_unreadable'));
      return { kind: 'retryable_failure', errorCode: 'google_calendar_unreadable' };
    }
    if (!deadlineReached) {
      // A 404 with confirmed access BEFORE the deadline is not evidence: the original
      // insert may still be in flight. Keep polling; the hold stays.
      return { kind: 'no_progress', errorCode: 'not_indexed_yet' };
    }
    await db.withTransaction((tx) => J.G3_provenAbsent(tx, journeyId));
    log({ evt: 'google.create_recovery.absent', journeyId, via: '404_probed', role: probe.role });
    return { kind: 'progress', recorded: true };
  }

  // Unreadable. At the deadline this is T1 — never G3, and never `booking_failed`.
  if (deadlineReached) {
    await db.withTransaction((tx) => J.T1_createUnprovable(tx, journeyId));
    log({ evt: 'google.create_recovery.unprovable', journeyId });
    return { kind: 'progress', recorded: true };
  }
  return { kind: 'retryable_failure', errorCode: 'google_unreadable' };
}

/** `google_cancel` — G4 on proof, T2 on exhaustion. Slot held throughout. */
async function cancel(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j || !j.google_event_id) return { kind: 'parked_precondition', errorCode: 'no_event' };

  const read = await G.readEvent(j.google_calendar_id, j.google_event_id);

  if (read.kind === 'present') {
    // Re-issue the idempotent patch. Safe to repeat: cancelling a cancelled event is
    // a no-op, and there is no create involved.
    const patched = await G.cancelEvent(j.google_calendar_id, j.google_event_id);
    if (patched.kind === 'cancelled' || patched.kind === 'gone') {
      await db.withTransaction((tx) => J.G4_cancelled(tx, journeyId,
        { intentVersion: j.intent_version, propagateToZoho: true }));
      return { kind: 'progress', recorded: true };
    }
    if (claim.failure_count + 1 >= claim.max_failures) return exhaustCancel(journeyId);
    return { kind: 'retryable_failure', errorCode: patched.error ? 'google_unreadable' : patched.kind };
  }

  if (await provenAbsent(j.google_calendar_id, read.kind)) {
    await db.withTransaction((tx) => J.G4_cancelled(tx, journeyId,
      { intentVersion: j.intent_version, propagateToZoho: true }));
    log({ evt: 'google.cancel.confirmed', journeyId, via: read.kind });
    return { kind: 'progress', recorded: true };
  }

  // Unqualified 404 or unreadable: the slot stays held and `zoho_cancel_propagate` is
  // never created. Telling Zoho a live meeting was cancelled is the worse error.
  if (read.kind === 'not_found') {
    await db.withTransaction((tx) => RV.addReviewReason(tx, journeyId, 'google_calendar_unreadable'));
  }
  if (claim.failure_count + 1 >= claim.max_failures) return exhaustCancel(journeyId);
  return { kind: 'retryable_failure', errorCode: 'google_unreadable' };
}

async function exhaustCancel(journeyId) {
  await db.withTransaction((tx) => J.T2_cancelExhausted(tx, journeyId));
  log({ evt: 'google.cancel.exhausted', journeyId });
  return { kind: 'progress', recorded: true };
}

/**
 * `google_reschedule` — dispatch by what a read PROVES, then the durable watch phase.
 * Release is never driven by retry exhaustion or a TTL.
 */
async function reschedule(claim) {
  const journeyId = claim.journey_id;
  const { j, pending } = await db.withTransaction(async (tx) => ({
    j: await J.get(tx, journeyId), pending: await R.pendingRescheduleHold(tx, journeyId),
  }));
  if (!j || !j.google_event_id) return { kind: 'parked_precondition', errorCode: 'no_event' };

  const watching = claim.state === 'watching';
  const watchExpired = claim.watch_until_at && new Date(claim.watch_until_at).getTime() <= Date.now();

  const read = await G.readEvent(j.google_calendar_id, j.google_event_id);

  if (read.kind === 'present') {
    const startIso = new Date(read.event.start.dateTime || read.event.start.date).toISOString();
    const requested = pending ? new Date(pending.slot_start_utc).toISOString() : null;
    const original = j.slot_start_utc ? new Date(j.slot_start_utc).toISOString() : null;

    if (requested && startIso === requested) {
      await db.withTransaction((tx) => J.G5_reschedulePromoted(tx, journeyId, {
        intentVersion: j.intent_version,
        slotStartUtc: requested,
        slotEndUtc: new Date(new Date(requested).getTime() + 30 * 60000).toISOString(),
      }));
      return { kind: 'progress', recorded: true };
    }
    if (original && startIso === original) {
      // A confirmed successful read showing the OLD slot proves the move did not
      // happen. Release only the pending hold.
      await db.withTransaction((tx) => J.G6_rescheduleUnchanged(tx, journeyId,
        { intentVersion: j.intent_version }));
      return { kind: 'progress', recorded: true };
    }
    // Present at neither slot: someone moved it by hand. Not our call to resolve.
    await db.withTransaction((tx) => RV.addReviewReason(tx, journeyId, 'google_unreadable'));
    return { kind: 'retryable_failure', errorCode: 'unexpected_slot' };
  }

  if (await provenAbsent(j.google_calendar_id, read.kind)) {
    // G7 — proven missing. Both holds retained: neither slot is proven free.
    await db.withTransaction((tx) => J.G7_rescheduleEventMissing(tx, journeyId));
    log({ evt: 'google.reschedule.event_missing', journeyId });
    return { kind: 'progress', recorded: true };
  }

  if (read.kind === 'not_found') {
    await db.withTransaction((tx) => RV.addReviewReason(tx, journeyId, 'google_calendar_unreadable'));
  }

  if (watching) {
    if (watchExpired) {
      await db.withTransaction((tx) => J.T3_rescheduleWatchExhausted(tx, journeyId));
      log({ evt: 'google.reschedule.watch_exhausted', journeyId });
      return { kind: 'progress', recorded: true };
    }
    // A FAILED read during the watch is `watch_tick`, not `no_progress`: a failed read
    // is not a success, and it must not consume the budget either.
    return { kind: 'watch_tick', errorCode: 'google_unreadable' };
  }

  if (claim.failure_count + 1 >= claim.max_failures) {
    await db.withTransaction((tx) => O.enterWatching(tx, journeyId, 'google_reschedule',
      { watchHours: watchHours(), cadenceMinutes: watchCadence() }));
    log({ evt: 'google.reschedule.watching', journeyId });
    return { kind: 'progress', recorded: true };
  }
  return { kind: 'retryable_failure', errorCode: 'google_unreadable' };
}

module.exports = { createRecovery, cancel, reschedule, provenAbsent };
