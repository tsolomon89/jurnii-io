'use strict';

const db = require('../db');
const Z = require('../integrations/zoho');
const J = require('../db/queries/journeys');
const ZS = require('../db/queries/zoho-state');
const O = require('../db/queries/ops');
const RV = require('../db/queries/review');
const { zohoEventOwned } = require('../lib/ownership');
const { log } = require('../lib/http');

/**
 * Zoho worker steps.
 *
 * No step here writes booking truth: every write goes through `patchZoho`, whose
 * column allow-list cannot name `booking_status`, `google_event_id`, `slot_*`,
 * `intent_version` or any reservation. A Zoho failure therefore cannot revert a
 * confirmed booking, release a slot or unconfirm the visitor — structurally, not by
 * discipline.
 *
 * Node creates no Contact, Account, Deal or Quote. The integration layer has no
 * function to do it, and `processLead` owns the commercial graph.
 */

const LEAD_SOURCE = process.env.ZOHO_LEAD_SOURCE || 'Website';

function classify(err) {
  if (err instanceof Z.ZohoError) {
    if (err.terminal) return { kind: 'terminal', code: err.code, retryAfter: null };
    return { kind: 'retryable', code: err.code, retryAfter: err.retryAfterSeconds };
  }
  return { kind: 'retryable', code: 'zoho_unknown_error', retryAfter: null };
}

/** The full data-load payload, sent SUPPRESSED so no conversion is initiated. */
function dataLoadPayload(j, { includeCompany = true } = {}) {
  const p = {
    First_Name: j.first_name,
    Last_Name: j.last_name,
    Email: j.email,
    Lead_Source: LEAD_SOURCE,
  };
  if (includeCompany && j.company) p.Company = j.company;
  if (j.phone_e164) p.Phone = j.phone_e164;
  if (j.country_name) p.Country = j.country_name;
  if (j.job_title_raw) p[process.env.ZOHO_LEAD_JOBTITLE_RAW_FIELD || 'Job_Title_Raw'] = j.job_title_raw;
  if (j.product_interest) p.Product_Interest = j.product_interest;
  return p;
}

// ---------------------------------------------------------------------------
// Identity — reads only, in the required order
// ---------------------------------------------------------------------------

async function identityResolve(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j || !j.email_normalized) return { kind: 'parked_precondition', errorCode: 'no_email' };

  try {
    const contacts = await Z.searchContactsByEmail(j.email_normalized);
    if (contacts.length > 1) {
      await db.withTransaction((tx) => ZS.Z2_identityAmbiguous(tx, journeyId));
      return { kind: 'progress', recorded: true };
    }
    if (contacts.length === 1) {
      // An existing Contact NEVER causes a Lead to be created, and Leads are not even
      // searched — searching them invites the duplicate this rule exists to prevent.
      await db.withTransaction((tx) => ZS.Z1_identityResolved(tx, journeyId, {
        outcome: 'contact_reused', recordType: 'Contact', recordId: contacts[0].id,
        contactId: contacts[0].id,
      }));
      return { kind: 'progress', recorded: true };
    }

    const leads = await Z.searchUnconvertedLeadsByEmail(j.email_normalized);
    if (leads.length > 1) {
      await db.withTransaction((tx) => ZS.Z2_identityAmbiguous(tx, journeyId));
      return { kind: 'progress', recorded: true };
    }
    if (leads.length === 1) {
      await db.withTransaction((tx) => ZS.Z1_identityResolved(tx, journeyId, {
        outcome: 'lead_reused', recordType: 'Lead', recordId: leads[0].id,
      }));
      return { kind: 'progress', recorded: true };
    }
    await db.withTransaction((tx) => ZS.Z1_identityResolved(tx, journeyId, {
      outcome: 'new_lead_required', recordType: null, recordId: null,
    }));
    return { kind: 'progress', recorded: true };
  } catch (err) {
    const c = classify(err);
    if (c.kind === 'terminal' || claim.failure_count + 1 >= claim.max_failures) {
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_identity_resolve', code: 'identity_resolve_failed', status: 'failed' }));
      return { kind: 'progress', recorded: true };
    }
    return { kind: 'retryable_failure', errorCode: c.code, retryAfterSeconds: c.retryAfter };
  }
}

// ---------------------------------------------------------------------------
// The one suppressed write per path
// ---------------------------------------------------------------------------

async function recordWrite(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j || !j.zoho_identity_outcome) return { kind: 'parked_precondition', errorCode: 'no_identity' };

  // Never a second create for the same journey. `create_attempts` is capped at 1 and is
  // never reset for this op, by repository assertion.
  if (j.zoho_identity_outcome === 'new_lead_required' && claim.create_attempts >= 1
      && !j.zoho_record_id) {
    return recoverUncertainLead(claim, j);
  }

  try {
    if (j.zoho_identity_outcome === 'contact_reused') {
      // Contacts carry company via the Account lookup, so Company is omitted.
      await Z.updateContactSuppressed(j.zoho_contact_id, dataLoadPayload(j, { includeCompany: false }));
      await db.withTransaction((tx) => ZS.Z4_contactWritten(tx, journeyId));
      return { kind: 'progress', recorded: true };
    }

    if (j.zoho_identity_outcome === 'lead_reused') {
      await Z.updateLeadSuppressed(j.zoho_record_id, dataLoadPayload(j));
      await db.withTransaction((tx) => ZS.Z3_leadWritten(tx, journeyId, { recordId: j.zoho_record_id }));
      return { kind: 'progress', recorded: true };
    }

    // new_lead_required: ONE suppressed create with the COMPLETE payload. The armed
    // protocol commits `sending` and increments the latch BEFORE the request leaves,
    // so a lost response can never authorise a second create.
    await db.withTransaction((tx) => O.incrementCreateAttempts(tx, journeyId, 'zoho_record_write'));
    const result = await Z.createLeadSuppressed(dataLoadPayload(j));
    const recordId = result.ok ? result.id : result.duplicateId;
    if (!recordId) throw new Z.ZohoError('zoho_write_no_id');
    await db.withTransaction((tx) => ZS.Z3_leadWritten(tx, journeyId, { recordId }));
    return { kind: 'progress', recorded: true };
  } catch (err) {
    const c = classify(err);
    if (j.zoho_identity_outcome === 'new_lead_required' && c.kind !== 'terminal') {
      // Uncertain create: latch at `outcome_unknown`, which `ensureOp` can never revive.
      await db.withTransaction((tx) => O.markOutcomeUnknown(tx, journeyId, 'zoho_record_write'));
      return { kind: 'no_progress', errorCode: c.code };
    }
    if (c.kind === 'terminal' || claim.failure_count + 1 >= claim.max_failures) {
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_record_write', code: 'record_write_failed', status: 'failed' }));
      return { kind: 'progress', recorded: true };
    }
    return { kind: 'retryable_failure', errorCode: c.code, retryAfterSeconds: c.retryAfter };
  }
}

/** Read-only recovery for an uncertain Lead create. Never creates again. */
async function recoverUncertainLead(claim, j) {
  const journeyId = claim.journey_id;
  const deadline = claim.unknown_since
    && new Date(claim.unknown_since).getTime() + ZS.zohoRecoveryWindowMinutes() * 60000;
  try {
    // Contact-first, then unconverted Leads — the same order as identity resolution,
    // because the create may have landed and then been converted.
    const contacts = await Z.searchContactsByEmail(j.email_normalized);
    if (contacts.length === 1) {
      await db.withTransaction((tx) => ZS.Z1_identityResolved(tx, journeyId, {
        outcome: 'contact_reused', recordType: 'Contact', recordId: contacts[0].id, contactId: contacts[0].id }));
      return { kind: 'progress', recorded: true };
    }
    const leads = await Z.searchUnconvertedLeadsByEmail(j.email_normalized);
    if (leads.length === 1) {
      await db.withTransaction((tx) => ZS.Z3_leadWritten(tx, journeyId, { recordId: leads[0].id }));
      return { kind: 'progress', recorded: true };
    }
    if (deadline && Date.now() >= deadline) {
      // No second Lead create, ever.
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_record_write', code: 'lead_create_outcome_unknown' }));
      return { kind: 'progress', recorded: true };
    }
    // A single empty result is never sufficient — indexing lags.
    return { kind: 'no_progress', errorCode: 'lead_not_found_yet' };
  } catch (err) {
    return { kind: 'retryable_failure', errorCode: classify(err).code };
  }
}

// ---------------------------------------------------------------------------
// The single workflow-enabled Lead update — at most once, never resent
// ---------------------------------------------------------------------------

async function leadTerminalUpdate(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j || !j.zoho_record_id) return { kind: 'parked_precondition', errorCode: 'no_lead' };

  // The parent latch is the authoritative prohibition. Any state past `not_sent` means
  // a send was already attempted, and an uncertain outcome is just as final as a
  // confirmed one for this purpose.
  if (j.lead_terminal_update_state !== 'not_sent') {
    log({ evt: 'zoho.lead_update.refused_resend', journeyId, state: j.lead_terminal_update_state });
    return { kind: 'parked_precondition', errorCode: 'already_attempted' };
  }

  try {
    // Committed BEFORE the request leaves. If the process dies here the command
    // executes zero times and we conservatively never retry.
    await db.withTransaction((tx) => ZS.markLeadUpdateSending(tx, journeyId));
  } catch (err) {
    return { kind: 'parked_precondition', errorCode: 'already_attempted' };
  }

  try {
    await Z.updateLeadWorkflowEnabled(j.zoho_record_id, dataLoadPayload(j));
    await db.withTransaction((tx) => ZS.Z5_leadUpdateAccepted(tx, journeyId));
    log({ evt: 'zoho.lead_update.accepted', journeyId });
    return { kind: 'progress', recorded: true };
  } catch (err) {
    const c = classify(err);
    if (c.kind === 'terminal') {
      await db.withTransaction(async (tx) => {
        await J.patchZoho(tx, journeyId, { lead_terminal_update_state: 'rejected' });
        await ZS.Z10_escalate(tx, journeyId, { op: 'zoho_lead_terminal_update', code: 'record_write_failed' });
      });
      return { kind: 'progress', recorded: true };
    }
    // Uncertain: the request MAY have arrived and started processLead. Recover through
    // reads only.
    await db.withTransaction((tx) => ZS.Z6_leadUpdateUncertain(tx, journeyId));
    log({ evt: 'zoho.lead_update.uncertain', journeyId });
    return { kind: 'progress', recorded: true };
  }
}

// ---------------------------------------------------------------------------
// Conversion discovery — read-only, deadline-bound, on BOTH paths
// ---------------------------------------------------------------------------

async function conversionDiscover(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j) return { kind: 'parked_precondition', errorCode: 'no_journey' };

  const deadlineReached = claim.deadline_at && new Date(claim.deadline_at).getTime() <= Date.now();

  try {
    if (j.zoho_record_id) {
      const lead = await Z.getLead(j.zoho_record_id);
      const conv = Z.readConversion(lead);
      if (conv.converted && conv.contactId) {
        await db.withTransaction((tx) => ZS.Z7_conversionDiscovered(tx, journeyId,
          { contactId: conv.contactId, accountId: conv.accountId }));
        return { kind: 'progress', recorded: true };
      }
    }
    // Fall back to a Contact search: conversion may be visible there first.
    const contacts = await Z.searchContactsByEmail(j.email_normalized);
    if (contacts.length === 1) {
      await db.withTransaction((tx) => ZS.Z7_conversionDiscovered(tx, journeyId, {
        contactId: contacts[0].id, accountId: Z.accountIdOfContact(contacts[0]),
      }));
      return { kind: 'progress', recorded: true };
    }

    if (deadlineReached) {
      // The two exits differ by what the SEND outcome was, not by what the reads found.
      if (j.lead_terminal_update_state === 'outcome_unknown') {
        await db.withTransaction((tx) => J.T4_conversionUndiscovered(tx, journeyId));
      } else {
        await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
          { op: 'zoho_conversion_discover', code: 'conversion_not_discovered' }));
      }
      return { kind: 'progress', recorded: true };
    }
    // A successful read that found nothing yet. Consumes no budget; bounded by the deadline.
    return { kind: 'no_progress', errorCode: 'not_converted_yet' };
  } catch (err) {
    return { kind: 'retryable_failure', errorCode: classify(err).code };
  }
}

// ---------------------------------------------------------------------------
// Meeting — one per journey, ever
// ---------------------------------------------------------------------------

async function meetingCreate(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j) return { kind: 'parked_precondition', errorCode: 'no_journey' };

  // Cancel intent outranks normal Meeting creation (§7.3).
  if (['pending', 'completed'].includes(j.cancel_intent_state)) {
    return { kind: 'parked_precondition', errorCode: 'cancel_intent_pending' };
  }
  if (j.booking_status !== 'confirmed') {
    return { kind: 'parked_precondition', errorCode: 'awaiting_google_confirmation' };
  }
  if (!['record_saved', 'meeting_created', 'complete'].includes(j.zoho_status)) {
    // Identity is not loaded yet. G1 created this op; Z4/Z5 will reactivate it.
    return { kind: 'parked_precondition', errorCode: 'awaiting_record_saved' };
  }
  if (j.zoho_meeting_id) return { kind: 'progress' };

  try {
    // Reuse by the correlation key before creating — the recovery path for an uncertain
    // create, and also what makes a retry safe.
    const existing = await Z.searchEventByExternalId(journeyId);
    if (existing) {
      if (!zohoEventOwned(existing, journeyId)) {
        await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
          { op: 'zoho_meeting_create', code: 'correlation_conflict' }));
        return { kind: 'progress', recorded: true };
      }
      await db.withTransaction((tx) => ZS.Z8_meetingCreated(tx, journeyId, { meetingId: existing.id }));
      return { kind: 'progress', recorded: true };
    }

    if (claim.create_attempts >= 1) {
      // An uncertain create already happened. NEVER a second Meeting: a duplicate
      // fires WF007 twice and corrupts pipeline automation.
      const deadline = claim.unknown_since
        && new Date(claim.unknown_since).getTime() + ZS.zohoRecoveryWindowMinutes() * 60000;
      if (deadline && Date.now() >= deadline) {
        await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
          { op: 'zoho_meeting_create', code: 'meeting_create_outcome_unknown' }));
        return { kind: 'progress', recorded: true };
      }
      return { kind: 'no_progress', errorCode: 'meeting_not_found_yet' };
    }

    // A Deal is linked at create ONLY when the final Contact is already known.
    let dealId = null;
    if (j.zoho_contact_id && j.zoho_account_id && j.product_interest) {
      const resolved = await Z.resolveProductDeal(j.zoho_account_id, j.product_interest);
      if (resolved.status === 'one') dealId = resolved.deal.id;
    }

    await db.withTransaction((tx) => O.incrementCreateAttempts(tx, journeyId, 'zoho_meeting_create'));
    const payload = Z.buildMeetingPayload({
      journeyId,
      startIso: j.slot_start_utc, endIso: j.slot_end_utc,
      contactId: j.zoho_contact_id,
      leadId: j.zoho_contact_id ? null : j.zoho_record_id,
      dealId,
      meetLink: j.google_meet_url,
      product: j.product_interest,
    });
    const result = await Z.createEventSuppressed(payload);
    const meetingId = result.ok ? result.id : result.duplicateId;
    if (!meetingId) throw new Z.ZohoError('zoho_write_no_id');
    await db.withTransaction((tx) => ZS.Z8_meetingCreated(tx, journeyId, { meetingId }));
    log({ evt: 'zoho.meeting.created', journeyId, dealLinked: Boolean(dealId) });
    return { kind: 'progress', recorded: true };
  } catch (err) {
    const c = classify(err);
    if (c.kind === 'terminal') {
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_meeting_create', code: 'meeting_create_failed' }));
      return { kind: 'progress', recorded: true };
    }
    await db.withTransaction((tx) => O.markOutcomeUnknown(tx, journeyId, 'zoho_meeting_create'));
    return { kind: 'no_progress', errorCode: c.code };
  }
}

// ---------------------------------------------------------------------------
// Deal reconciliation — the retro-link
// ---------------------------------------------------------------------------

async function dealReconcile(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j) return { kind: 'parked_precondition', errorCode: 'no_journey' };
  if (['pending', 'completed'].includes(j.cancel_intent_state)) {
    return { kind: 'parked_precondition', errorCode: 'cancel_intent_pending' };
  }

  // Both prerequisites, explicitly. A Lead id in the Contact position silently
  // mis-routes `routeContactSequence`, so the Contact must be DISCOVERED first.
  if (!j.zoho_contact_id) return { kind: 'no_progress', errorCode: 'awaiting_contact' };
  if (!j.zoho_meeting_id) return { kind: 'no_progress', errorCode: 'awaiting_meeting' };

  const deadlineReached = claim.deadline_at && new Date(claim.deadline_at).getTime() <= Date.now();

  try {
    const accountId = j.zoho_account_id
      || Z.accountIdOfContact(await Z.getContact(j.zoho_contact_id));
    if (!accountId) {
      if (deadlineReached) {
        await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
          { op: 'zoho_deal_reconcile', code: 'product_unresolved' }));
        return { kind: 'progress', recorded: true };
      }
      return { kind: 'no_progress', errorCode: 'awaiting_account' };
    }

    const resolved = await Z.resolveProductDeal(accountId, j.product_interest);
    if (resolved.status === 'many') {
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_deal_reconcile', code: 'duplicate_product_deal' }));
      return { kind: 'progress', recorded: true };
    }
    if (resolved.status !== 'one') {
      if (deadlineReached) {
        await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
          { op: 'zoho_deal_reconcile', code: 'product_unresolved' }));
        return { kind: 'progress', recorded: true };
      }
      return { kind: 'no_progress', errorCode: 'deal_not_visible_yet' };
    }

    // ONE triggers-enabled PUT applying Contact and Deal TOGETHER, so WF007
    // reprocesses the Meeting and the pipeline advances.
    await Z.updateEvent(j.zoho_meeting_id, {
      Who_Id: { id: j.zoho_contact_id },
      What_Id: { id: resolved.deal.id },
      $se_module: 'Deals',
      Ext_Calendar_Booking_ID: journeyId,
    }, { triggersEnabled: true });

    await db.withTransaction((tx) => ZS.Z9_dealLinked(tx, journeyId, { dealId: resolved.deal.id }));
    log({ evt: 'zoho.deal.linked', journeyId });
    return { kind: 'progress', recorded: true };
  } catch (err) {
    const c = classify(err);
    if (c.kind === 'terminal' || claim.failure_count + 1 >= claim.max_failures) {
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_deal_reconcile', code: 'deal_reconcile_failed' }));
      return { kind: 'progress', recorded: true };
    }
    return { kind: 'retryable_failure', errorCode: c.code, retryAfterSeconds: c.retryAfter };
  }
}

// ---------------------------------------------------------------------------
// Propagation
// ---------------------------------------------------------------------------

async function cancelPropagate(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j) return { kind: 'parked_precondition', errorCode: 'no_journey' };

  // Belt and braces: re-assert the precondition on every claim. G4 reactivates this op.
  if (j.booking_status !== 'cancelled' || j.google_status !== 'cancelled') {
    return { kind: 'parked_precondition', errorCode: 'awaiting_google_cancellation' };
  }
  if (!j.zoho_meeting_id) {
    await db.withTransaction((tx) => RV.addReviewReason(tx, journeyId, 'booking_cancelled'));
    return { kind: 'progress' };
  }

  try {
    // The audit-only representation of §7.2, until the approved Deluge correction ships.
    await Z.updateEvent(j.zoho_meeting_id, {
      Meeting_Task_State: 'Lost',
      Meeting_Task_Lost_Reasons: 'No Meeting / Demo',
      Meeting_Task_Status: 'Closed',
      Ext_Calendar_Booking_ID: journeyId,
    }, { triggersEnabled: false });
    await db.withTransaction((tx) => RV.addReviewReason(tx, journeyId, 'booking_cancelled'));
    return { kind: 'progress' };
  } catch (err) {
    const c = classify(err);
    if (c.kind === 'terminal' || claim.failure_count + 1 >= claim.max_failures) {
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_cancel_propagate', code: 'cancel_propagation_failed' }));
      return { kind: 'progress', recorded: true };
    }
    return { kind: 'retryable_failure', errorCode: c.code, retryAfterSeconds: c.retryAfter };
  }
}

async function reschedulePropagate(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j) return { kind: 'parked_precondition', errorCode: 'no_journey' };
  if (!j.zoho_meeting_id) return { kind: 'parked_precondition', errorCode: 'no_meeting' };

  try {
    // The SAME Meeting's times are updated. A still-person-linked Meeting is updated
    // without fabricating a Deal.
    await Z.updateEvent(j.zoho_meeting_id, {
      Start_DateTime: Z.formatZohoDateTime(j.slot_start_utc),
      End_DateTime: Z.formatZohoDateTime(j.slot_end_utc),
      Ext_Calendar_Booking_ID: journeyId,
    }, { triggersEnabled: false });
    log({ evt: 'zoho.reschedule.propagated', journeyId });
    return { kind: 'progress' };
  } catch (err) {
    const c = classify(err);
    if (c.kind === 'terminal' || claim.failure_count + 1 >= claim.max_failures) {
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_reschedule_propagate', code: 'reschedule_propagation_failed' }));
      return { kind: 'progress', recorded: true };
    }
    return { kind: 'retryable_failure', errorCode: c.code, retryAfterSeconds: c.retryAfter };
  }
}

module.exports = {
  identityResolve,
  recordWrite,
  leadTerminalUpdate,
  conversionDiscover,
  meetingCreate,
  dealReconcile,
  cancelPropagate,
  reschedulePropagate,
  dataLoadPayload,
  classify,
};
