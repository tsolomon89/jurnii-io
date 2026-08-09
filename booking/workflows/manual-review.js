'use strict';

const db = require('../db');
const Z = require('../integrations/zoho');
const RV = require('../db/queries/review');
const ZS = require('../db/queries/zoho-state');
const { log } = require('../lib/http');

/**
 * `zoho_manual_review` — ONE Task per journey, for its whole life.
 *
 * Works from a SNAPSHOT taken at the start, so a reason appended mid-flight is never
 * mistaken for one already written, and the Task is closed only when nothing is
 * outstanding. Resolving one escalation on a journey that still holds an unrelated
 * reason therefore leaves the Task open with the other block intact.
 */

/** One block per unwritten occurrence, with the recurrence made visible. */
function renderBlock(reason) {
  const detail = DETAIL[reason.code] || 'Needs review.';
  const marker = reason.generation > 0 ? ` (recurrence g${reason.generation})` : '';
  return `[${reason.code}]${marker} ${detail}`;
}

const DETAIL = {
  identity_ambiguous: 'Several CRM records match this email. Choose the correct one; no record was modified.',
  identity_resolve_failed: 'CRM identity lookup failed repeatedly.',
  record_write_failed: 'The CRM data load failed.',
  lead_create_outcome_unknown: 'A Lead create had an unknown outcome. No second Lead was created — verify by hand.',
  lead_update_outcome_unknown: 'The workflow-enabled Lead update had an unknown outcome. It will NEVER be resent; confirm whether conversion ran.',
  conversion_not_discovered: 'Conversion was accepted but the resulting Contact was never found.',
  meeting_create_failed: 'The CRM Meeting could not be created.',
  meeting_create_outcome_unknown: 'A Meeting create had an unknown outcome. No second Meeting was created — verify by hand.',
  product_unresolved: 'No single Product Deal could be resolved for this Account.',
  duplicate_product_deal: 'Several Product Deals matched. None was linked.',
  deal_reconcile_failed: 'Linking the Contact and Deal to the Meeting failed.',
  booking_cancelled: 'The visitor cancelled. Move the pipeline and clear the demo reminder by hand.',
  cancel_propagation_failed: 'The CRM cancellation representation could not be written.',
  reschedule_propagation_failed: 'The CRM Meeting time could not be updated.',
  google_cancel_failed: 'Google cancellation could not be confirmed. The meeting may still be live; the slot is held.',
  google_unreadable: 'Google could not be read within the watch window. Both slots are held.',
  google_calendar_unreadable: 'The calendar could not be read with confirmed access. The slot is held and the booking is NOT marked failed.',
  reschedule_event_missing: 'The calendar event is provably gone. Both slots are held.',
  correlation_conflict: 'A calendar event belongs to a different journey. It was not adopted.',
  stale_attempt_event: 'A calendar event belongs to an earlier attempt. It was not adopted.',
  worker_crash_loop: 'A worker operation crash-looped and was terminated before any external call.',
  crm_cancellation_followup_required:
    'CRM cancellation propagation is disabled. Move the pipeline and clear Demo_Reminder_Send_At by hand, then close this reason via the operator endpoint.',
};

async function reconcileTask(claim) {
  const journeyId = claim.journey_id;
  const snap = await db.withTransaction((tx) => RV.reviewSnapshot(tx, journeyId));

  if (!snap.branch) return { kind: 'progress' };   // nothing to write, nothing to close

  try {
    // Resolve the Task: stored id, then the journey-scoped Subject lookup, then create
    // once. Never a second Task, even if a rep completed the first one.
    let task = null;
    if (snap.taskId) task = await Z.getTask(snap.taskId);
    if (!task) task = await Z.searchTaskBySubject(journeyId);

    if (snap.branch === 'close') {
      if (!task) {
        // Nothing to close remotely; record it locally so we stop trying.
        await db.withTransaction((tx) => ZS.Z11_taskReconciled(tx, journeyId,
          { taskId: null, branch: 'close', snapshotVersion: snap.v, writtenKeys: [] }));
        return { kind: 'progress', recorded: true };
      }
      await Z.updateTaskSuppressed(task.id, {
        Status: 'Completed', Task_Status: 'Closed', Task_State: 'Won',
        Description: `${task.Description || ''}\n[resolved] All review reasons resolved.`.trim(),
      });
      await db.withTransaction((tx) => ZS.Z11_taskReconciled(tx, journeyId,
        { taskId: task.id, branch: 'close', snapshotVersion: snap.v, writtenKeys: [] }));
      log({ evt: 'review.task.closed', journeyId });
      return { kind: 'progress', recorded: true };
    }

    // WRITE branch: append the unwritten blocks, reopening if the Task is closed.
    const blocks = snap.pending.map(renderBlock);
    const writtenKeys = snap.pending.map((p) => p.key);
    const description = [
      `Booking reference: ${journeyId}`,
      snap.emailNormalized ? `Email: ${snap.emailNormalized}` : null,
      snap.productInterests.length ? `Product: ${snap.productInterests.join(', ')}` : null,
      '',
      ...blocks,
    ].filter((l) => l !== null).join('\n');

    if (!task) {
      const payload = Z.buildManualReviewTask({
        journeyId, contactId: snap.contactId, description,
      });
      const created = await Z.createTaskSuppressed(payload);
      const taskId = created.ok ? created.id : created.duplicateId;
      await db.withTransaction((tx) => ZS.Z11_taskReconciled(tx, journeyId,
        { taskId, branch: 'write', snapshotVersion: snap.v, writtenKeys }));
      log({ evt: 'review.task.created', journeyId, reasons: writtenKeys.length });
      return { kind: 'progress', recorded: true };
    }

    const patch = {
      Description: `${task.Description || ''}\n${blocks.join('\n')}`.trim(),
      Ext_Calendar_Booking_ID: undefined,
    };
    delete patch.Ext_Calendar_Booking_ID;
    if (Z.taskIsClosed(task)) {
      // A closed Task is never a reason to create a second one.
      patch.Status = 'In Progress'; patch.Task_Status = 'Working'; patch.Task_State = 'Open';
    }
    await Z.updateTaskSuppressed(task.id, patch);
    await db.withTransaction((tx) => ZS.Z11_taskReconciled(tx, journeyId,
      { taskId: task.id, branch: 'write', snapshotVersion: snap.v, writtenKeys }));
    log({ evt: 'review.task.updated', journeyId, reasons: writtenKeys.length, reopened: Z.taskIsClosed(task) });
    return { kind: 'progress', recorded: true };
  } catch (err) {
    const code = err && err.code ? String(err.code) : 'review_failed';
    if (claim.failure_count + 1 >= claim.max_failures) {
      // Log-only terminal: the escalation channel itself is broken, and re-arming this
      // op would ask a failing reviewer to report its own failure.
      log({ evt: 'review.task.exhausted', journeyId, code });
      return { kind: 'terminal_failure', errorCode: code };
    }
    return { kind: 'retryable_failure', errorCode: code };
  }
}

module.exports = { reconcileTask, renderBlock, DETAIL };
