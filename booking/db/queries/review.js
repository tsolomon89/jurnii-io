'use strict';

const { ensureOp } = require('./ops');

/**
 * The reason-occurrence ledger — the single source of review truth (§4.1).
 *
 * Review state is per reason OCCURRENCE and nothing about it is journey-wide. Two
 * defects made that necessary, and they are the same defect at different scopes:
 *
 *   Revision 14 advanced the version only when the code was absent from the
 *   LIFETIME reason array, so a reason that occurred, was resolved, and recurred
 *   never advanced it — the recurrence was silently swallowed.
 *
 *   Revision 15 fixed that with a journey-wide generation, then resolved with
 *   `resolved_version = manual_review_version`, which closed EVERY outstanding
 *   reason at once: an RT1 clearing a Google problem also closed an unrelated
 *   `identity_ambiguous` a human had never looked at.
 */

/** Every reason code the system may raise. */
const REASON_CODES = new Set([
  'identity_ambiguous', 'identity_resolve_failed', 'record_write_failed',
  'lead_create_outcome_unknown', 'lead_update_outcome_unknown', 'conversion_not_discovered',
  'meeting_create_failed', 'meeting_create_outcome_unknown',
  'product_unresolved', 'duplicate_product_deal', 'deal_reconcile_failed',
  'booking_cancelled', 'cancel_propagation_failed', 'reschedule_propagation_failed',
  'google_cancel_failed', 'google_unreadable', 'google_calendar_unreadable',
  'reschedule_event_missing', 'correlation_conflict', 'stale_attempt_event',
  'worker_crash_loop', 'crm_cancellation_followup_required',
]);

/**
 * Codes an escalation may resolve (§4.10). Resolution is scoped by this table and
 * by nothing else. Every other code — `identity_ambiguous`, `product_unresolved`
 * and the rest — is NOT resolvable through the operator endpoint at all: those are
 * cleared by the CRM work that fixes them. The endpoint moves booking state, and a
 * reason it cannot act on is a reason it must not close.
 */
const ESCALATION_REASONS = {
  t1: ['google_calendar_unreadable', 'correlation_conflict', 'stale_attempt_event'],
  t2: ['google_cancel_failed'],
  t3: ['google_unreadable'],
  t4: ['lead_update_outcome_unknown', 'conversion_not_discovered'],
  g7: ['reschedule_event_missing'],
  rr1: ['crm_cancellation_followup_required'],
  // MR1 — the Meeting itself could not be created or verified. `create_meeting_only`
  // closes ONLY this occurrence; every unrelated reason on the journey stays open.
  mr1: ['meeting_create_failed'],
};

/**
 * The review-only set: reasons describing work in a system this backend cannot
 * read, closed by `RR1.confirm_followup_done` rather than by an escalation action.
 */
const REVIEW_ONLY_REASONS = new Set(['crm_cancellation_followup_required']);

function reasonKey(code, generation) {
  return `${code}#${generation}`;
}

function retentionExtensionDays() {
  return Number(process.env.RETENTION_REVIEW_EXTENSION_DAYS || 90);
}

/**
 * Append a reason occurrence and flag attention.
 *
 * Always inside the caller's transaction, alongside `ensureOp('zoho_manual_review')`.
 * Implemented as ORDERED STATEMENTS rather than the plan's single CTE: a
 * data-modifying CTE's INSERT is not visible to an UPDATE in the same statement, so
 * the `bj_guard` trigger would not see the new reason row and would reject the
 * journey update with `invariant_attention_without_reason`. The reason row must be
 * committed to the transaction's view BEFORE the journey update runs.
 *
 * A code that is ALREADY OPEN never advances the clock — a Google read failing
 * forty times is one outstanding reason, not forty — while a code whose latest
 * occurrence is RESOLVED always does, which is what reopens the Task.
 */
async function addReviewReason(tx, journeyId, code, { extensionDays } = {}) {
  if (!REASON_CODES.has(code)) throw new Error(`unknown_reason_code:${code}`);
  const days = extensionDays === undefined ? retentionExtensionDays() : extensionDays;

  // 1. Lock the newest occurrence of THIS code, so two concurrent appends of the
  //    same code cannot both create one.
  const latest = await tx.query(
    `SELECT generation, resolved_at
       FROM booking_journey_review_reasons
      WHERE journey_id = $1 AND code = $2
      ORDER BY generation DESC
      LIMIT 1
      FOR UPDATE`,
    [journeyId, code]
  );
  const open = latest.rowCount === 1 && latest.rows[0].resolved_at === null;

  if (open) {
    // Already outstanding: touch it, advance nothing.
    await tx.query(
      `UPDATE booking_journey_review_reasons
          SET last_seen_at = now(), occurrences = occurrences + 1
        WHERE journey_id = $1 AND code = $2 AND resolved_at IS NULL`,
      [journeyId, code]
    );
    await refreshAttention(tx, journeyId);
    await ensureOp(tx, journeyId, 'zoho_manual_review');
    return { created: false, code, generation: latest.rows[0].generation };
  }

  // 2. A genuinely new occurrence: advance the review clock first so the row can
  //    record the version it produced.
  const bumped = await tx.query(
    `UPDATE booking_journeys SET
       manual_review_version = manual_review_version + 1,
       manual_review_reasons = CASE WHEN $2 = ANY(manual_review_reasons)
                                    THEN manual_review_reasons
                                    ELSE array_append(manual_review_reasons, $2) END,
       -- One retention extension per OUTSTANDING EPISODE. refreshAttention clears
       -- the marker when the open set empties, so the next episode gets its own
       -- window rather than inheriting an expired one.
       review_retention_until = CASE WHEN review_extension_applied_at IS NULL
                                     THEN now() + make_interval(days => $3)
                                     ELSE review_retention_until END,
       review_extension_applied_at = COALESCE(review_extension_applied_at, now()),
       updated_at = now()
     WHERE journey_id = $1
     RETURNING manual_review_version`,
    [journeyId, code, days]
  );
  if (!bumped.rowCount) throw new Error('journey_missing');
  const reviewVersion = bumped.rows[0].manual_review_version;

  const generation = latest.rowCount === 1 ? latest.rows[0].generation + 1 : 0;
  await tx.query(
    `INSERT INTO booking_journey_review_reasons
       (journey_id, code, generation, review_version)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (journey_id, code, generation) DO NOTHING`,
    [journeyId, code, generation, reviewVersion]
  );

  // 3. Now the row exists in this transaction's view, so the trigger will accept
  //    needs_attention = true.
  await refreshAttention(tx, journeyId);
  await ensureOp(tx, journeyId, 'zoho_manual_review');
  return { created: true, code, generation, reviewVersion, key: reasonKey(code, generation) };
}

/**
 * Resolve ONLY this escalation's own occurrences, and only those the operator could
 * actually have seen.
 *
 * `review_version <= expectedReviewVersion` is the bound: an occurrence appended
 * after the operator read the journey can never be swept up, even if the Phase-3
 * version guard were relaxed.
 */
async function resolveReasons(tx, journeyId, codes, resolutionId, expectedReviewVersion) {
  if (!Array.isArray(codes) || !codes.length) return [];
  for (const c of codes) {
    if (!REASON_CODES.has(c)) throw new Error(`unknown_reason_code:${c}`);
  }
  const res = await tx.query(
    `UPDATE booking_journey_review_reasons SET
       resolved_at = now(),
       resolved_resolution_id = $3
     WHERE journey_id = $1
       AND code = ANY($2)
       AND resolved_at IS NULL
       AND review_version <= $4
     RETURNING code, generation`,
    [journeyId, codes, resolutionId, expectedReviewVersion]
  );
  return res.rows.map((r) => reasonKey(r.code, r.generation));
}

/**
 * Recompute the three attention columns from the ledger. The ONLY writer of them.
 *
 * `needs_attention` is true exactly while something is outstanding, and false the
 * moment the last open reason is resolved — never because a resolution said so.
 * The `bj_guard` trigger rejects any row where the columns and the ledger disagree.
 */
async function refreshAttention(tx, journeyId) {
  const res = await tx.query(
    `UPDATE booking_journeys j SET
       needs_attention      = o.open_count > 0,
       needs_attention_code = o.latest_code,
       needs_attention_at   = o.oldest_open,
       review_extension_applied_at = CASE WHEN o.open_count = 0 THEN NULL
                                          ELSE j.review_extension_applied_at END,
       updated_at = now()
     FROM (
       SELECT count(*)                                        AS open_count,
              min(first_seen_at)                              AS oldest_open,
              (array_agg(code ORDER BY last_seen_at DESC))[1]  AS latest_code
         FROM booking_journey_review_reasons
        WHERE journey_id = $1 AND resolved_at IS NULL
     ) o
     WHERE j.journey_id = $1
     RETURNING needs_attention, needs_attention_code`,
    [journeyId]
  );
  return res.rows[0] || null;
}

/** Open reason keys, for the resolution response and the Task snapshot. */
async function openReasonKeys(tx, journeyId) {
  const res = await tx.query(
    `SELECT code, generation FROM booking_journey_review_reasons
      WHERE journey_id = $1 AND resolved_at IS NULL
      ORDER BY first_seen_at`,
    [journeyId]
  );
  return res.rows.map((r) => reasonKey(r.code, r.generation));
}

async function countOpenReasons(tx, journeyId) {
  const res = await tx.query(
    `SELECT count(*)::int AS n FROM booking_journey_review_reasons
      WHERE journey_id = $1 AND resolved_at IS NULL`,
    [journeyId]
  );
  return res.rows[0].n;
}

/** Is this specific code currently open? Used by RR1's `reason_not_open` refusal. */
async function isReasonOpen(tx, journeyId, code) {
  const res = await tx.query(
    `SELECT 1 FROM booking_journey_review_reasons
      WHERE journey_id = $1 AND code = $2 AND resolved_at IS NULL LIMIT 1`,
    [journeyId, code]
  );
  return res.rowCount === 1;
}

/**
 * The Task-update snapshot (§8.3).
 *
 * `pending` deliberately includes occurrences that have ALREADY been resolved: a
 * reason raised at 10:00 and resolved at 10:02, with the Task update landing at
 * 10:03, still gets its block written — otherwise a short-lived escalation would
 * vanish from the CRM record entirely and the Task would close with no trace.
 */
async function reviewSnapshot(tx, journeyId) {
  const j = await tx.query(
    `SELECT manual_review_version, manual_review_applied_version,
            manual_review_closed_version, manual_review_reasons_applied,
            zoho_manual_review_task_id, zoho_contact_id, email_normalized,
            product_interest, zoho_record_id, zoho_record_type
       FROM booking_journeys WHERE journey_id = $1`,
    [journeyId]
  );
  if (!j.rowCount) throw new Error('journey_missing');
  const row = j.rows[0];

  const all = await tx.query(
    `SELECT code, generation, review_version, first_seen_at, last_seen_at,
            occurrences, resolved_at
       FROM booking_journey_review_reasons
      WHERE journey_id = $1
      ORDER BY review_version, code`,
    [journeyId]
  );

  const applied = new Set(row.manual_review_reasons_applied || []);
  const pending = all.rows
    .map((r) => ({ ...r, key: reasonKey(r.code, r.generation) }))
    .filter((r) => !applied.has(r.key));
  const openNow = all.rows.filter((r) => r.resolved_at === null).length;

  return {
    v: row.manual_review_version,
    appliedVersion: row.manual_review_applied_version,
    closedVersion: row.manual_review_closed_version,
    applied: row.manual_review_reasons_applied || [],
    taskId: row.zoho_manual_review_task_id,
    contactId: row.zoho_contact_id,
    emailNormalized: row.email_normalized,
    productInterest: row.product_interest,
    recordId: row.zoho_record_id,
    recordType: row.zoho_record_type,
    pending,
    openNow,
    /** 'write' when there is unwritten text, else 'close' when a close is owed. */
    branch: pending.length > 0 ? 'write'
      : (openNow === 0 && row.manual_review_closed_version < row.manual_review_version ? 'close' : null),
  };
}

module.exports = {
  REASON_CODES,
  ESCALATION_REASONS,
  REVIEW_ONLY_REASONS,
  reasonKey,
  addReviewReason,
  resolveReasons,
  refreshAttention,
  openReasonKeys,
  countOpenReasons,
  isReasonOpen,
  reviewSnapshot,
};
