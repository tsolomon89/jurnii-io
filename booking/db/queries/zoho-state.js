'use strict';

const { ConflictError } = require('../errors');
const O = require('./ops');
const RV = require('./review');
const { patchZoho, get } = require('./journeys');

/**
 * The Zoho chained transactions Z1–Z11 (§4.8).
 *
 * Split from journeys.js only for file size; every function here writes exclusively
 * through `patchZoho`, whose column allow-list makes it structurally impossible for a
 * Zoho step to touch `booking_status`, `google_event_id`, `slot_*`, `intent_version`
 * or any reservation. That is the isolation guarantee of §10 expressed as code rather
 * than as discipline.
 */

function conversionWindowMinutes() {
  return Number(process.env.CONVERSION_DISCOVERY_WINDOW_MINUTES || 60);
}
function zohoRecoveryWindowMinutes() {
  return Number(process.env.ZOHO_CREATE_RECOVERY_WINDOW_MINUTES || 60);
}

/** Z1 — identity resolved. */
async function Z1_identityResolved(tx, journeyId, { outcome, recordType, recordId, contactId = null }) {
  const row = await patchZoho(tx, journeyId, {
    zoho_identity_outcome: outcome,
    zoho_record_type: recordType,
    zoho_record_id: recordId,
    zoho_contact_id: contactId,
    zoho_status: 'identity_resolved',
  });
  await O.completeOp(tx, journeyId, 'zoho_identity_resolve');
  await O.ensureOp(tx, journeyId, 'zoho_record_write');
  return row;
}

/** Z2 — identity ambiguous. Nothing is chosen, so no record write follows. */
async function Z2_identityAmbiguous(tx, journeyId) {
  await RV.addReviewReason(tx, journeyId, 'identity_ambiguous');
  const row = await patchZoho(tx, journeyId, {
    zoho_identity_outcome: 'ambiguous',
    zoho_status: 'manual_review',
  });
  await O.completeOp(tx, journeyId, 'zoho_identity_resolve');
  return row;
}

/** Z3 — suppressed write succeeded, LEAD path. Arms the at-most-once triggered update. */
async function Z3_leadWritten(tx, journeyId, { recordId }) {
  const row = await patchZoho(tx, journeyId, {
    zoho_record_id: recordId,
    zoho_status: 'identity_resolved',
  });
  await O.completeOp(tx, journeyId, 'zoho_record_write');
  await O.ensureOp(tx, journeyId, 'zoho_lead_terminal_update');
  return row;
}

/**
 * Z4 — suppressed write succeeded, CONTACT path.
 *
 * `zoho_record_write` ALWAYS completes here: it never parks and never waits for
 * Google. Page-2 CRM data loading is independent of the calendar — nothing about a
 * booking is a precondition for loading the visitor's company details into Zoho.
 * The Meeting op is created only when the booking is ALREADY confirmed; otherwise G1
 * creates it, and G1 is its sole creator in that ordering.
 */
async function Z4_contactWritten(tx, journeyId) {
  const row = await patchZoho(tx, journeyId, { zoho_status: 'record_saved' });
  await O.completeOp(tx, journeyId, 'zoho_record_write');
  const j = await get(tx, journeyId);
  if (j.booking_status === 'confirmed') await O.ensureOp(tx, journeyId, 'zoho_meeting_create');
  return row;
}

/**
 * Z5 — triggered Lead update ACCEPTED.
 *
 * An accepted response proves only that Zoho took the update — not that `processLead`
 * has finished converting, nor that the final Contact and Account are visible. So
 * conversion discovery is activated on this path too, with an explicit deadline
 * because its `no_progress` outcome consumes no budget.
 */
async function Z5_leadUpdateAccepted(tx, journeyId) {
  const row = await patchZoho(tx, journeyId, {
    lead_terminal_update_state: 'accepted',
    zoho_status: 'record_saved',
  });
  await O.completeOp(tx, journeyId, 'zoho_lead_terminal_update');
  await O.ensureOp(tx, journeyId, 'zoho_conversion_discover', {
    deadlineAt: await conversionDeadline(tx, journeyId),
  });
  const j = await get(tx, journeyId);
  if (j.booking_status === 'confirmed') await O.ensureOp(tx, journeyId, 'zoho_meeting_create');
  return row;
}

/**
 * Z6 — triggered Lead update outcome UNKNOWN.
 *
 * The op is latched at `outcome_unknown`, which `ensureOp` can never revive. A
 * duplicated `processLead` would run conversion twice and corrupt the commercial
 * graph; a missed one is a visible, human-resolvable Task. Recovery is reads only.
 */
async function Z6_leadUpdateUncertain(tx, journeyId) {
  const row = await patchZoho(tx, journeyId, { lead_terminal_update_state: 'outcome_unknown' });
  await O.markOutcomeUnknown(tx, journeyId, 'zoho_lead_terminal_update');
  await O.ensureOp(tx, journeyId, 'zoho_conversion_discover', {
    deadlineAt: await conversionDeadline(tx, journeyId),
  });
  return row;
}

async function conversionDeadline(tx, journeyId) {
  const j = await get(tx, journeyId);
  const base = j.lead_terminal_update_attempted_at
    ? new Date(j.lead_terminal_update_attempted_at).getTime()
    : Date.now();
  return new Date(base + conversionWindowMinutes() * 60 * 1000);
}

/** Mark the triggered update as being sent. Committed BEFORE the request leaves. */
async function markLeadUpdateSending(tx, journeyId) {
  const res = await tx.query(
    `UPDATE booking_journeys SET
       lead_terminal_update_state = 'sending',
       lead_terminal_update_attempted_at = now(),
       updated_at = now()
     WHERE journey_id = $1 AND lead_terminal_update_state = 'not_sent'
     RETURNING lead_terminal_update_attempted_at`,
    [journeyId]
  );
  // Any other state is an authoritative prohibition on sending again.
  if (!res.rowCount) throw new ConflictError('lead_update_already_attempted');
  return res.rows[0].lead_terminal_update_attempted_at;
}

/** Z7 — conversion discovered. Deal reconcile starts only once a Meeting exists. */
async function Z7_conversionDiscovered(tx, journeyId, { contactId, accountId = null }) {
  const row = await patchZoho(tx, journeyId, {
    zoho_contact_id: contactId,
    zoho_account_id: accountId,
  });
  await O.completeOp(tx, journeyId, 'zoho_conversion_discover');
  if (row.zoho_meeting_id) await O.ensureOp(tx, journeyId, 'zoho_deal_reconcile');
  return row;
}

/** Z8 — Meeting created or reused. */
async function Z8_meetingCreated(tx, journeyId, { meetingId }) {
  const row = await patchZoho(tx, journeyId, {
    zoho_meeting_id: meetingId,
    zoho_status: 'meeting_created',
  });
  await tx.query(
    `UPDATE booking_journey_ops SET state = 'accepted', updated_at = now()
      WHERE journey_id = $1 AND op = 'zoho_meeting_create'`,
    [journeyId]
  );
  await O.completeOp(tx, journeyId, 'zoho_meeting_create');
  if (row.zoho_contact_id) await O.ensureOp(tx, journeyId, 'zoho_deal_reconcile');
  return row;
}

/**
 * Z9 — Deal linked. The journey is complete.
 *
 * `activationState` records whether that link ALSO invoked the commercial automation.
 * `complete` means the retro-link was triggers-enabled and WF007 was given the Event;
 * `suppressed` means the Meeting is fully written and correctly linked but automation
 * was deliberately not invoked. Both are finished states — the journey reaches
 * `zoho_status = 'complete'` either way, and suppression raises no review reason.
 */
async function Z9_dealLinked(tx, journeyId, { dealId, activationState = 'complete' }) {
  const row = await patchZoho(tx, journeyId, {
    zoho_deal_id: dealId,
    zoho_status: 'complete',
    zoho_meeting_activation_state: activationState,
    processing_completed_at: new Date(),
  });
  await O.completeOp(tx, journeyId, 'zoho_deal_reconcile');
  return row;
}

/**
 * Z10 — any Manual Review escalation.
 *
 * The originating op goes to `terminal` when it is escalating out of `sending` or
 * `outcome_unknown` — preserving `create_attempts` and `unknown_since` as the audit
 * of what was attempted — because `parked` would be revivable by `ensureOp` and could
 * issue a duplicate create. Otherwise it simply completes.
 */
async function Z10_escalate(tx, journeyId, { op, code, status = 'manual_review' }) {
  await RV.addReviewReason(tx, journeyId, code);
  const row = await patchZoho(tx, journeyId, { zoho_status: status });
  if (op) {
    const current = await O.getOp(tx, journeyId, op);
    if (current && ['sending', 'outcome_unknown', 'watching'].includes(current.state)) {
      await O.terminateOp(tx, journeyId, op, code);
    } else if (current) {
      await O.completeOp(tx, journeyId, op);
    }
  }
  return row;
}

/**
 * Z11 — Manual Review Task written, reopened or closed.
 *
 * `manual_review_reasons_applied` is a CUMULATIVE UNION of what was already applied
 * and the keys written this run — never a replacement. Replacing it would erase
 * earlier generations' keys, and since the array is the dedup source those keys would
 * then be rewritten as duplicate blocks on the next run, growing the description
 * without bound.
 *
 * The op row is requeued DIRECTLY rather than through `ensureOp`: during the run the
 * row is in `sending` with a live lease, which `ensureOp`'s predicate deliberately
 * refuses to touch, so calling it would silently no-op and strand the newer reason.
 */
async function Z11_taskReconciled(tx, journeyId, { taskId, branch, snapshotVersion, writtenKeys = [] }) {
  if (!['write', 'close'].includes(branch)) throw new Error(`unknown_branch:${branch}`);

  await tx.query(
    `UPDATE booking_journeys SET
       zoho_manual_review_task_id = COALESCE($2, zoho_manual_review_task_id),
       manual_review_reasons_applied = (
         SELECT COALESCE(array_agg(DISTINCT k ORDER BY k), '{}')
           FROM unnest(manual_review_reasons_applied || $5::text[]) AS k),
       manual_review_applied_version = CASE WHEN $3 = 'write' THEN $4
                                            ELSE manual_review_applied_version END,
       manual_review_closed_version  = CASE WHEN $3 = 'close' THEN $4
                                            ELSE manual_review_closed_version END,
       updated_at = now()
     WHERE journey_id = $1`,
    [journeyId, taskId || null, branch, snapshotVersion, writtenKeys]
  );

  // Requeue when EITHER a newer reason arrived mid-flight OR a close is now owed.
  await tx.query(
    `UPDATE booking_journey_ops o SET
       state             = CASE WHEN s.more_work THEN 'pending' ELSE 'done' END,
       next_retry_at     = CASE WHEN s.more_work THEN now()     ELSE NULL   END,
       completed_at      = CASE WHEN s.more_work THEN NULL      ELSE now()  END,
       outcome_recorded  = true, lease_expires_at = NULL, crash_reclaim_count = 0,
       last_outcome_kind = 'progress', updated_at = now()
     FROM (
       SELECT ( j.manual_review_version > $2
                OR ( NOT EXISTS (SELECT 1 FROM booking_journey_review_reasons r
                                 WHERE r.journey_id = $1 AND r.resolved_at IS NULL)
                     AND j.manual_review_closed_version < j.manual_review_version )
              ) AS more_work
         FROM booking_journeys j WHERE j.journey_id = $1
     ) s
     WHERE o.journey_id = $1 AND o.op = 'zoho_manual_review'`,
    [journeyId, snapshotVersion]
  );

  return get(tx, journeyId);
}

module.exports = {
  conversionWindowMinutes,
  zohoRecoveryWindowMinutes,
  Z1_identityResolved,
  Z2_identityAmbiguous,
  Z3_leadWritten,
  Z4_contactWritten,
  Z5_leadUpdateAccepted,
  Z6_leadUpdateUncertain,
  Z7_conversionDiscovered,
  Z8_meetingCreated,
  Z9_dealLinked,
  Z10_escalate,
  Z11_taskReconciled,
  markLeadUpdateSending,
  conversionDeadline,
};
