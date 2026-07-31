'use strict';

const G = require('../integrations/google');
const Z = require('../integrations/zoho');
const J = require('../db/queries/journeys');
const R = require('../db/queries/reservations');
const O = require('../db/queries/ops');
const B = require('../db/queries/bindings');
const RV = require('../db/queries/review');
const { verifyEventOwnership } = require('../lib/ownership');

/**
 * The fifteen operator actions (§4.10).
 *
 * `verify()` performs READS ONLY — no operator action mutates Google or Zoho, which is
 * what makes a crash-and-reclaim safe: the repeated work is a read, and the fencing
 * token makes the effect exactly-once.
 *
 * `apply()` composes the SAME repository transactions the worker uses. No §4.8 logic is
 * re-implemented here.
 */

const LEGAL = {
  t1: ['resume', 'adopt', 'absent'],
  t2: ['retry_cancel', 'confirm_cancelled', 'abandon_cancel'],
  t3: ['reconcile', 'retry_reschedule', 'abandon_reschedule'],
  t4: ['adopt_identity', 'abandon'],
  g7: ['adopt_at_old_slot', 'adopt_at_new_slot', 'mark_cancelled'],
  rr1: ['confirm_followup_done'],
};

function legalActions(escalation) { return LEGAL[escalation] || []; }

/** Which reason codes this request may resolve. Scoped by escalation, and nothing else. */
function reasonsFor(request) {
  if (request.escalation === 'rr1') return [request.reasonCode];
  return RV.ESCALATION_REASONS[request.escalation] || [];
}

const refuse = (code, message) => ({ ok: false, code, message, indeterminate: false });
const unavailable = (code) => ({ ok: false, code, indeterminate: true });

// ---------------------------------------------------------------------------
// PHASE 2 — verification. Reads only.
// ---------------------------------------------------------------------------

async function verify(request) {
  const db = require('../db');
  const { journey, pending } = await db.withTransaction(async (tx) => ({
    journey: await J.get(tx, request.journeyId),
    pending: await R.pendingRescheduleHold(tx, request.journeyId),
  }));
  if (!journey) return refuse('journey_not_found');

  // The journey must actually be in the escalation the operator named.
  const escalated = journey.google_outcome_state === 'unresolved'
    || journey.booking_status === 'needs_attention'
    || journey.lead_terminal_update_state === 'unresolved'
    || journey.needs_attention;
  if (!escalated) return refuse('not_escalated');

  if (request.escalation === 'rr1') {
    if (!RV.REVIEW_ONLY_REASONS.has(request.reasonCode)) return refuse('invalid_reason_code');
    const open = await db.withTransaction((tx) => RV.isReasonOpen(tx, request.journeyId, request.reasonCode));
    if (!open) return refuse('reason_not_open');
    // The ONE action whose evidence is the operator's word: the CRM state it describes
    // is unverifiable precisely because the propagation that would verify it is off.
    return { ok: true, observed: { source: 'operator_assertion', reasonCode: request.reasonCode } };
  }

  const calendarId = journey.google_calendar_id;

  switch (request.action) {
    // No verification needed: these re-enter bounded cycles that re-escalate by
    // themselves, so they assert nothing about a third-party system.
    case 'resume':
    case 'retry_cancel':
    case 'retry_reschedule':
    case 'abandon':
      return { ok: true, observed: { source: 'none' } };

    case 'absent': {
      // Absence releases a slot and declares a booking failed, so the SERVER re-derives
      // G3's proof rather than accepting the operator's assertion.
      if (!calendarId || !journey.google_event_candidate_id) return refuse('absence_unverified');
      const read = await G.readEvent(calendarId, journey.google_event_candidate_id);
      if (read.kind === 'present') return refuse('event_exists');
      if (read.kind === 'unreadable') return unavailable('verification_unavailable');
      if (read.kind === 'gone' || read.kind === 'cancelled') {
        return { ok: true, observed: { source: 'events.get', outcome: read.kind } };
      }
      const { verdict, probe } = await G.qualifyNotFound(calendarId);
      if (verdict !== 'absent') return refuse('absence_unverified');
      return { ok: true, observed: { source: 'events.get', outcome: '404_probed', role: probe.role } };
    }

    case 'adopt':
    case 'adopt_at_old_slot':
    case 'adopt_at_new_slot': {
      if (!request.googleEventId) return refuse('validation');
      const read = await G.readEvent(calendarId, request.googleEventId);
      if (read.kind === 'unreadable') return unavailable('verification_unavailable');
      if (read.kind !== 'present') return refuse('event_absent');

      const expected = request.action === 'adopt_at_new_slot'
        ? (pending && pending.slot_start_utc)
        : (request.action === 'adopt' ? await initialSlot(request.journeyId) : journey.slot_start_utc);
      if (!expected) return refuse('slot_mismatch');
      const start = new Date(read.event.start.dateTime || read.event.start.date).toISOString();
      if (start !== new Date(expected).toISOString()) return refuse('slot_mismatch');

      // Labelling rule: a mismatched label is never adopted; an unlabelled event needs
      // an explicit acknowledgement.
      const owned = verifyEventOwnership(read.event, {
        journeyId: request.journeyId, attemptVersion: journey.booking_attempt_version,
      });
      if (!owned.ok) {
        if (owned.code === 'correlation_conflict') {
          const priv = (read.event.extendedProperties && read.event.extendedProperties.private) || {};
          if (priv.journeyId) return refuse('correlation_conflict');
          if (!request.acknowledgeUnlabelledEvent) return refuse('event_unlabelled');
        } else if (owned.code === 'stale_attempt_event') {
          return refuse('stale_attempt_event');
        }
      }
      const boundElsewhere = await db.withTransaction((tx) =>
        B.eventBoundElsewhere(tx, request.journeyId, request.googleEventId));
      if (boundElsewhere) return refuse('event_already_bound');

      return { ok: true, observed: { source: 'events.get', outcome: 'present', slotStart: start } };
    }

    case 'confirm_cancelled':
    case 'mark_cancelled': {
      if (!journey.google_event_id) return refuse('event_absent');
      const read = await G.readEvent(calendarId, journey.google_event_id);
      if (read.kind === 'present') return refuse('event_still_active');
      if (read.kind === 'unreadable') return unavailable('verification_unavailable');
      if (read.kind === 'not_found') {
        const { verdict, probe } = await G.qualifyNotFound(calendarId);
        if (verdict !== 'absent') return unavailable('verification_unavailable');
        return { ok: true, observed: { source: 'events.get', outcome: '404_probed', role: probe.role } };
      }
      return { ok: true, observed: { source: 'events.get', outcome: read.kind } };
    }

    case 'abandon_cancel': {
      // "The booking is intact" is a presumption after T2, so one read settles it.
      const read = await G.readEvent(calendarId, journey.google_event_id);
      if (read.kind === 'unreadable') return unavailable('verification_unavailable');
      if (read.kind !== 'present') return refuse('event_absent');
      return { ok: true, observed: { source: 'events.get', outcome: 'present' } };
    }

    case 'abandon_reschedule': {
      const read = await G.readEvent(calendarId, journey.google_event_id);
      if (read.kind === 'unreadable') return unavailable('verification_unavailable');
      if (read.kind !== 'present') return refuse('event_absent');
      const start = new Date(read.event.start.dateTime || read.event.start.date).toISOString();
      if (pending && start === new Date(pending.slot_start_utc).toISOString()) {
        return refuse('event_at_new_slot');
      }
      return { ok: true, observed: { source: 'events.get', outcome: 'present', slotStart: start } };
    }

    case 'reconcile': {
      const read = await G.readEvent(calendarId, journey.google_event_id);
      if (read.kind === 'unreadable') return unavailable('verification_unavailable');
      if (read.kind === 'present') {
        const start = new Date(read.event.start.dateTime || read.event.start.date).toISOString();
        const atNew = pending && start === new Date(pending.slot_start_utc).toISOString();
        const atOld = journey.slot_start_utc && start === new Date(journey.slot_start_utc).toISOString();
        if (!atNew && !atOld) return refuse('slot_mismatch');
        return { ok: true, observed: { source: 'events.get', outcome: atNew ? 'at_new_slot' : 'at_old_slot' } };
      }
      if (read.kind === 'not_found') {
        const { verdict } = await G.qualifyNotFound(calendarId);
        if (verdict !== 'absent') return unavailable('verification_unavailable');
      }
      return { ok: true, observed: { source: 'events.get', outcome: 'missing' } };
    }

    case 'adopt_identity': {
      if (!request.zohoContactId) return refuse('validation');
      let contact;
      try {
        contact = await Z.getContact(request.zohoContactId);
      } catch (err) {
        return unavailable('verification_unavailable');
      }
      if (!contact) return refuse('contact_email_mismatch');
      const email = (contact.Email || '').toLowerCase();
      if (!email || email !== (journey.email_normalized || '').toLowerCase()) {
        return refuse('contact_email_mismatch');
      }
      // DERIVE the Account. A supplied value may only agree or be refused: a hand-typed
      // id would attach this demo to another company's commercial graph.
      const derived = Z.accountIdOfContact(contact);
      if (request.zohoAccountId && derived && request.zohoAccountId !== derived) {
        return refuse('account_mismatch');
      }
      if (request.zohoAccountId && !derived) return refuse('account_mismatch');
      return { ok: true, observed: { source: 'getRecord', contactId: contact.id, accountId: derived || null } };
    }

    default:
      return refuse('invalid_action');
  }
}

async function initialSlot(journeyId) {
  const db = require('../db');
  const holds = await db.withTransaction((tx) => R.liveHolds(tx, journeyId));
  const initial = holds.find((h) => h.purpose === 'initial');
  return initial ? initial.slot_start_utc : null;
}

// ---------------------------------------------------------------------------
// PHASE 3 — the effect. Repository transactions only.
// ---------------------------------------------------------------------------

async function apply(tx, { request, journey, verified }) {
  const jid = request.journeyId;

  switch (request.action) {
    case 'resume': {
      // The COMPLETE active create state, exactly as R2 leaves it — not merely a
      // cleared flag, which would leave the journey refused at every request surface.
      await J.patchGoogle(tx, jid, {
        google_outcome_state: 'unknown', google_status: 'pending', booking_status: 'reserved',
      });
      // Same cycle, same candidate id, same create latch. A new attempt would mint a new
      // candidate id and risk a SECOND event if the first one landed.
      await O.resumeOp(tx, jid, 'google_create_recovery', journey.booking_attempt_version, {
        deadlineSeconds: Number(process.env.GOOGLE_RESUME_WINDOW_MINUTES || 30) * 60,
      });
      return {};
    }

    case 'adopt': {
      await J.G1_createConfirmed(tx, jid, {
        googleEventId: request.googleEventId,
        slotStartUtc: verified.observed.slotStart,
        slotEndUtc: new Date(new Date(verified.observed.slotStart).getTime() + 30 * 60000).toISOString(),
        adoptedResolutionId: request.resolutionId,
        boundAction: 'rt1_adopt',
      });
      return {};
    }

    case 'absent':
      await J.G3_provenAbsent(tx, jid);
      return {};

    case 'retry_cancel': {
      const res = await tx.query(
        `UPDATE booking_journeys SET
           cancel_intent_state='pending', cancel_requested_at=now(),
           intent_version = intent_version + 1,
           booking_status='cancel_pending', google_outcome_state='cancelling', updated_at=now()
         WHERE journey_id=$1 RETURNING intent_version`, [jid]);
      await O.startIntentOp(tx, jid, 'google_cancel', res.rows[0].intent_version, { delaySeconds: 0 });
      return {};
    }

    case 'confirm_cancelled':
      await J.G4_cancelled(tx, jid, { intentVersion: journey.intent_version, propagateToZoho: true });
      return {};

    case 'abandon_cancel':
      await J.patchGoogle(tx, jid, {
        booking_status: 'confirmed', google_outcome_state: 'created',
        google_status: 'confirmed', cancel_intent_state: 'failed',
      });
      await O.terminateOp(tx, jid, 'google_cancel', 'abandoned_by_operator');
      return {};

    case 'retry_reschedule': {
      const pending = await R.pendingRescheduleHold(tx, jid);
      const res = await tx.query(
        `UPDATE booking_journeys SET
           reschedule_intent_state='pending', reschedule_requested_at=now(),
           pending_slot_start_utc=$2,
           intent_version = intent_version + 1,
           booking_status='reschedule_pending', google_outcome_state='updating', updated_at=now()
         WHERE journey_id=$1 RETURNING intent_version`,
        [jid, pending ? pending.slot_start_utc : null]);
      await O.startIntentOp(tx, jid, 'google_reschedule', res.rows[0].intent_version, { delaySeconds: 0 });
      return {};
    }

    case 'abandon_reschedule':
      await J.G6_rescheduleUnchanged(tx, jid, { intentVersion: journey.intent_version });
      return {};

    case 'reconcile': {
      const outcome = verified.observed.outcome;
      if (outcome === 'at_new_slot') {
        const pending = await R.pendingRescheduleHold(tx, jid);
        await J.G5_reschedulePromoted(tx, jid, {
          intentVersion: journey.intent_version,
          slotStartUtc: new Date(pending.slot_start_utc).toISOString(),
          slotEndUtc: new Date(new Date(pending.slot_start_utc).getTime() + 30 * 60000).toISOString(),
        });
        return {};
      }
      if (outcome === 'at_old_slot') {
        await J.G6_rescheduleUnchanged(tx, jid, { intentVersion: journey.intent_version });
        return {};
      }
      // Missing: G7 re-escalates. It resolves NOTHING — `google_unreadable` stays open
      // and a new `reschedule_event_missing` is raised.
      await J.G7_rescheduleEventMissing(tx, jid);
      return { resolvesReasons: false };
    }

    case 'adopt_at_old_slot': {
      await R.releaseHold(tx, jid, 'reschedule');
      await J.patchGoogle(tx, jid, {
        google_event_id: request.googleEventId,
        google_event_adopted_at: new Date(),
        google_event_adopted_resolution_id: request.resolutionId,
        google_status: 'confirmed', booking_status: 'confirmed',
        google_outcome_state: 'created', reschedule_intent_state: 'failed',
        pending_slot_start_utc: null,
      });
      await B.bindEvent(tx, jid, {
        googleEventId: request.googleEventId, slotStartUtc: journey.slot_start_utc,
        boundAction: 'rg7_adopt_old', resolutionId: request.resolutionId,
      });
      // The time did not change, so there is nothing to propagate to Zoho.
      if (!journey.zoho_meeting_id) await O.ensureOp(tx, jid, 'zoho_meeting_create');
      return {};
    }

    case 'adopt_at_new_slot': {
      const pending = await R.pendingRescheduleHold(tx, jid);
      await J.G5_reschedulePromoted(tx, jid, {
        intentVersion: journey.intent_version,
        slotStartUtc: new Date(pending.slot_start_utc).toISOString(),
        slotEndUtc: new Date(new Date(pending.slot_start_utc).getTime() + 30 * 60000).toISOString(),
        googleEventId: request.googleEventId,
        adoptedResolutionId: request.resolutionId,
        boundAction: 'rg7_adopt_new',
      });
      return {};
    }

    case 'mark_cancelled': {
      const propagate = process.env.BOOKING_CANCELLATION_ENABLED === 'true';
      await tx.query(
        `UPDATE booking_journeys SET intent_version = intent_version + 1 WHERE journey_id = $1`, [jid]);
      const bumped = await J.get(tx, jid);
      await J.G4_cancelled(tx, jid, { intentVersion: bumped.intent_version, propagateToZoho: propagate });
      if (!propagate) {
        // The Task must NOT close while CRM housekeeping remains. This raises a new
        // unresolved reason, so `needs_attention` stays true and RR1 closes it later.
        await RV.addReviewReason(tx, jid, 'crm_cancellation_followup_required');
      }
      return {};
    }

    case 'adopt_identity': {
      await J.patchZoho(tx, jid, {
        zoho_contact_id: verified.observed.contactId,
        zoho_account_id: verified.observed.accountId,
        zoho_status: 'record_saved',
      });
      // Activate only what its own prerequisite permits. `lead_terminal_update_state` is
      // NOT touched and no workflow-enabled update is ever resent.
      const fresh = await J.get(tx, jid);
      if (fresh.booking_status === 'confirmed' && !fresh.zoho_meeting_id
          && !['pending', 'completed'].includes(fresh.cancel_intent_state)) {
        await O.ensureOp(tx, jid, 'zoho_meeting_create');
      }
      if (fresh.zoho_meeting_id) await O.ensureOp(tx, jid, 'zoho_deal_reconcile');
      return {};
    }

    case 'abandon':
      // Leaves the permanent latch alone; T-a′ exempts it so attention can still clear.
      return {};

    case 'confirm_followup_done':
      return {};

    default:
      throw Object.assign(new Error('invalid_action'), { code: 'invalid_action' });
  }
}

module.exports = { LEGAL, legalActions, reasonsFor, verify, apply };
