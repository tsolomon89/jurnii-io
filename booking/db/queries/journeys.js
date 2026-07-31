'use strict';

const { ConflictError, isSlotTaken } = require('../errors');
const R = require('./reservations');
const O = require('./ops');
const RV = require('./review');
const B = require('./bindings');

/**
 * Journey state and the named §4.8 transactions.
 *
 * Every transaction here takes a `tx` and performs its journey transition together
 * with the activation of whatever operation the new state requires — that pairing,
 * in one transaction, is the universal outbox rule and the reason no journey can
 * advance without its ops row or vice versa.
 *
 * Column allow-lists, not free-form SET: a Zoho step must be structurally unable to
 * write `booking_status`, `google_event_id`, `slot_*` or any reservation (§10).
 */

const GOOGLE_COLUMNS = new Set([
  'booking_status', 'google_status', 'google_outcome_state', 'google_event_id',
  'google_event_candidate_id', 'google_calendar_id', 'host_calendar_key',
  'google_meet_url', 'booking_attempt_version', 'slot_start_utc', 'slot_end_utc',
  'pending_slot_start_utc', 'confirmed_at', 'cancelled_at', 'reschedule_count',
  'cancel_intent_state', 'reschedule_intent_state', 'cancel_requested_at',
  'cancel_completed_at', 'reschedule_requested_at', 'reschedule_completed_at',
  'intent_version', 'google_event_adopted_at', 'google_event_adopted_resolution_id',
]);

const ZOHO_COLUMNS = new Set([
  'zoho_status', 'zoho_identity_outcome', 'zoho_record_type', 'zoho_record_id',
  'zoho_contact_id', 'zoho_account_id', 'zoho_deal_id', 'zoho_meeting_id',
  'zoho_manual_review_task_id', 'lead_terminal_update_state',
  'lead_terminal_update_attempted_at', 'processing_started_at', 'processing_completed_at',
  'manual_review_reasons_applied', 'manual_review_applied_version',
  'manual_review_closed_version',
]);

function buildSet(patch, allowed, label) {
  const cols = [];
  const vals = [];
  for (const [k, v] of Object.entries(patch)) {
    if (!allowed.has(k)) throw new Error(`${label}_may_not_write:${k}`);
    cols.push(k);
    vals.push(v);
  }
  if (!cols.length) throw new Error('empty_patch');
  const assignments = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
  return { assignments, vals };
}

async function get(tx, journeyId) {
  const res = await tx.query('SELECT * FROM booking_journeys WHERE journey_id = $1', [journeyId]);
  return res.rows[0] || null;
}

async function getForUpdate(tx, journeyId) {
  const res = await tx.query(
    'SELECT * FROM booking_journeys WHERE journey_id = $1 FOR UPDATE', [journeyId]
  );
  return res.rows[0] || null;
}

/** Guarded Google-side patch. Throws `ConflictError` when the guard matched nothing. */
async function patchGoogle(tx, journeyId, patch, guard = {}) {
  const { assignments, vals } = buildSet(patch, GOOGLE_COLUMNS, 'google_step');
  const guardCols = Object.keys(guard);
  const guardSql = guardCols
    .map((c, i) => `AND ${c} = $${vals.length + 2 + i}`)
    .join(' ');
  const res = await tx.query(
    `UPDATE booking_journeys SET ${assignments}, updated_at = now()
      WHERE journey_id = $1 ${guardSql} RETURNING *`,
    [journeyId, ...vals, ...guardCols.map((c) => guard[c])]
  );
  if (!res.rowCount) throw new ConflictError('journey_guard_failed');
  return res.rows[0];
}

/** Guarded Zoho-side patch. Cannot name a booking-truth column by construction. */
async function patchZoho(tx, journeyId, patch) {
  const { assignments, vals } = buildSet(patch, ZOHO_COLUMNS, 'zoho_step');
  const res = await tx.query(
    `UPDATE booking_journeys SET ${assignments}, updated_at = now()
      WHERE journey_id = $1 RETURNING *`,
    [journeyId, ...vals]
  );
  if (!res.rowCount) throw new ConflictError('journey_missing');
  return res.rows[0];
}

// ---------------------------------------------------------------------------
// Request-path transactions
// ---------------------------------------------------------------------------

/**
 * Page-1 commit — Postgres only, ZERO Zoho calls and no ops row.
 *
 * The immutable journeyId↔email binding of §4.7: every attribution column is
 * deliberately absent from the DO UPDATE list, because first-touch attribution is
 * immutable (spec §7.3). Zero rows means either an email mismatch or a journey past
 * `draft`; the caller re-reads to tell those apart and answers `409 journey_conflict`
 * or `409 wrong_step`.
 */
async function upsertPage1(tx, journeyId, fields) {
  const cols = Object.keys(fields);
  const placeholders = cols.map((_, i) => `$${i + 2}`).join(', ');
  const res = await tx.query(
    `INSERT INTO booking_journeys (journey_id, ${cols.join(', ')}, form_step, page_1_completed_at)
     VALUES ($1, ${placeholders}, 1, now())
     ON CONFLICT (journey_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       marketing_consent = EXCLUDED.marketing_consent,
       marketing_consent_at = CASE WHEN EXCLUDED.marketing_consent
                                     AND booking_journeys.marketing_consent_at IS NULL
                                   THEN now() ELSE booking_journeys.marketing_consent_at END,
       updated_at = now()
     WHERE booking_journeys.email_normalized = EXCLUDED.email_normalized
       AND booking_journeys.booking_status = 'draft'
     RETURNING *`,
    [journeyId, ...cols.map((c) => fields[c])]
  );
  return res.rowCount ? res.rows[0] : null;
}

/** R1 — Page-2 commit: journey fields + `zoho_status='pending'` + identity resolve. */
async function R1_page2Commit(tx, journeyId, fields) {
  const cols = Object.keys(fields);
  const assignments = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
  const res = await tx.query(
    `UPDATE booking_journeys SET ${assignments},
       form_step = GREATEST(form_step, 2),
       page_2_completed_at = COALESCE(page_2_completed_at, now()),
       zoho_status = 'pending',
       updated_at = now()
     WHERE journey_id = $1 AND booking_status IN ('draft','reserved','booking_failed')
     RETURNING *`,
    [journeyId, ...cols.map((c) => fields[c])]
  );
  if (!res.rowCount) throw new ConflictError('wrong_step');
  await O.ensureOp(tx, journeyId, 'zoho_identity_resolve');
  return res.rows[0];
}

/**
 * R2 — Google-create arming.
 *
 * Increments the attempt, persists the calendar and candidate id, arms the hold, and
 * starts the recovery op — the sole `create_attempts` reset. No previous-attempt
 * Google read precedes this: `booking_failed` already means absence was proven.
 */
async function R2_armCreate(tx, journeyId, {
  hostCalendarKey, googleCalendarId, slotStartUtc, candidateIdFor, uncertaintyMinutes,
}) {
  const bumped = await tx.query(
    `UPDATE booking_journeys SET
       booking_attempt_version = booking_attempt_version + 1,
       google_calendar_id = $2,
       host_calendar_key = $3,
       google_outcome_state = 'creating',
       google_status = 'pending',
       booking_status = 'reserved',
       updated_at = now()
     WHERE journey_id = $1
       AND booking_status IN ('draft','reserved','booking_failed')
       AND COALESCE(google_outcome_state,'') NOT IN ('creating','unknown','unresolved')
     RETURNING booking_attempt_version`,
    [journeyId, googleCalendarId, hostCalendarKey]
  );
  if (!bumped.rowCount) throw new ConflictError('attempt_not_permitted');
  const attemptVersion = bumped.rows[0].booking_attempt_version;

  const candidateId = candidateIdFor(attemptVersion);
  const withCandidate = await tx.query(
    `UPDATE booking_journeys SET google_event_candidate_id = $2, updated_at = now()
      WHERE journey_id = $1 RETURNING *`,
    [journeyId, candidateId]
  );

  const hold = await R.upsertPendingHold(tx, journeyId, {
    purpose: 'initial', hostCalendarKey, slotStartUtc, attemptVersion, armed: true,
  });

  await O.startAttemptOp(tx, journeyId, 'google_create_recovery', attemptVersion, {
    delaySeconds: 120,
    deadlineAt: new Date(Date.now() + uncertaintyMinutes * 60 * 1000),
  });

  return { journey: withCandidate.rows[0], hold, attemptVersion, candidateId };
}

/** R3 — cancel intent. `zoho_cancel_propagate` is deliberately NOT created here. */
async function R3_cancelIntent(tx, journeyId) {
  const res = await tx.query(
    `UPDATE booking_journeys SET
       cancel_intent_state = 'pending',
       cancel_requested_at = now(),
       intent_version = intent_version + 1,
       booking_status = 'cancel_pending',
       google_outcome_state = 'cancelling',
       updated_at = now()
     WHERE journey_id = $1 AND booking_status = 'confirmed'
       AND cancel_intent_state IN ('none','failed')
     RETURNING intent_version`,
    [journeyId]
  );
  if (!res.rowCount) throw new ConflictError('cancel_not_permitted');
  const intentVersion = res.rows[0].intent_version;
  await O.startIntentOp(tx, journeyId, 'google_cancel', intentVersion, { delaySeconds: 0 });
  return { intentVersion };
}

/** R4 — reschedule intent. */
async function R4_rescheduleIntent(tx, journeyId, { hostCalendarKey, slotStartUtc }) {
  const res = await tx.query(
    `UPDATE booking_journeys SET
       reschedule_intent_state = 'pending',
       reschedule_requested_at = now(),
       pending_slot_start_utc = $2,
       intent_version = intent_version + 1,
       booking_status = 'reschedule_pending',
       google_outcome_state = 'updating',
       updated_at = now()
     WHERE journey_id = $1 AND booking_status = 'confirmed'
       AND reschedule_intent_state <> 'pending'
       AND cancel_intent_state NOT IN ('pending','completed')
     RETURNING intent_version`,
    [journeyId, slotStartUtc]
  );
  if (!res.rowCount) throw new ConflictError('reschedule_not_permitted');
  const intentVersion = res.rows[0].intent_version;
  const hold = await R.upsertPendingHold(tx, journeyId, {
    purpose: 'reschedule', hostCalendarKey, slotStartUtc, armed: true,
  });
  await O.startIntentOp(tx, journeyId, 'google_reschedule', intentVersion, { delaySeconds: 0 });
  return { intentVersion, hold };
}

// ---------------------------------------------------------------------------
// Google outcome transactions
// ---------------------------------------------------------------------------

/**
 * G1 — create confirmed. The SOLE creator of `zoho_meeting_create`.
 *
 * `ensureOp('zoho_meeting_create')` is unconditional: if CRM identity is not yet at
 * `record_saved` the op parks itself, and Z4/Z5 reactivates it. Both orderings of
 * Google confirmation vs CRM identity therefore produce exactly one Meeting op.
 */
async function G1_createConfirmed(tx, journeyId, {
  googleEventId, slotStartUtc, slotEndUtc, meetUrl = null, adoptedResolutionId = null,
  boundAction = 'pipeline_create',
}) {
  const j = await tx.query(
    `UPDATE booking_journeys SET
       google_event_id = $2,
       google_status = 'confirmed',
       booking_status = 'confirmed',
       confirmed_at = COALESCE(confirmed_at, now()),
       slot_start_utc = $3,
       slot_end_utc = $4,
       google_meet_url = COALESCE($5, google_meet_url),
       google_outcome_state = 'created',
       google_event_adopted_at = CASE WHEN $6::uuid IS NOT NULL THEN now()
                                      ELSE google_event_adopted_at END,
       google_event_adopted_resolution_id = COALESCE($6::uuid, google_event_adopted_resolution_id),
       updated_at = now()
     WHERE journey_id = $1
     RETURNING *`,
    [journeyId, googleEventId, slotStartUtc, slotEndUtc, meetUrl, adoptedResolutionId]
  );

  await R.confirmHold(tx, journeyId, 'initial');
  await B.bindEvent(tx, journeyId, {
    googleEventId, slotStartUtc, boundAction, resolutionId: adoptedResolutionId,
  });
  await O.completeOp(tx, journeyId, 'google_create_recovery');
  await O.ensureOp(tx, journeyId, 'zoho_meeting_create');

  const row = j.rows[0];
  if (row.lead_terminal_update_state !== 'not_sent'
      && ['sending', 'accepted', 'outcome_unknown'].includes(row.lead_terminal_update_state)) {
    await O.ensureOp(tx, journeyId, 'zoho_conversion_discover');
  }
  return row;
}

/** G2 — create definitively rejected. */
async function G2_createRejected(tx, journeyId) {
  const row = await patchGoogle(tx, journeyId, {
    google_outcome_state: 'not_created', google_status: 'failed', booking_status: 'draft',
  });
  await R.releaseHold(tx, journeyId, 'initial');
  await O.completeOp(tx, journeyId, 'google_create_recovery');
  return row;
}

/** G2a — FreeBusy conflict after R2, before any insert. `create_attempts` stays 0. */
async function G2a_conflictBeforeInsert(tx, journeyId) {
  const row = await patchGoogle(tx, journeyId, {
    google_outcome_state: 'not_created', google_status: 'not_started', booking_status: 'draft',
  });
  await R.releaseHold(tx, journeyId, 'initial');
  await O.completeOp(tx, journeyId, 'google_create_recovery');
  return row;
}

/**
 * G3 — create PROVEN absent. Requires a definitive 404 plus a confirmed
 * `writer`/`owner` access probe plus `now() >= deadline_at`, or a direct 410 /
 * `status:'cancelled'`. The attempt is final; no same-cycle re-arm.
 */
async function G3_provenAbsent(tx, journeyId) {
  const row = await patchGoogle(tx, journeyId, {
    google_outcome_state: 'not_created', booking_status: 'booking_failed',
  });
  await R.releaseHold(tx, journeyId, 'initial');
  await O.completeOp(tx, journeyId, 'google_create_recovery');
  return row;
}

/** G4 — cancellation confirmed. */
async function G4_cancelled(tx, journeyId, { intentVersion, propagateToZoho = true }) {
  const res = await tx.query(
    `UPDATE booking_journeys SET
       booking_status = 'cancelled',
       google_status = 'cancelled',
       google_outcome_state = 'cancelled',
       cancelled_at = COALESCE(cancelled_at, now()),
       cancel_intent_state = 'completed',
       cancel_completed_at = now(),
       cancel_requested_at = COALESCE(cancel_requested_at, now()),
       reschedule_intent_state = CASE WHEN reschedule_intent_state = 'pending'
                                      THEN 'failed' ELSE reschedule_intent_state END,
       pending_slot_start_utc = NULL,
       updated_at = now()
     WHERE journey_id = $1 AND intent_version = $2
     RETURNING *`,
    [journeyId, intentVersion]
  );
  if (!res.rowCount) throw new ConflictError('intent_superseded');
  await R.releaseAllHolds(tx, journeyId);
  await B.unbindEvent(tx, journeyId, 'cancelled');
  await O.completeOp(tx, journeyId, 'google_cancel');
  if (propagateToZoho) {
    await O.startIntentOp(tx, journeyId, 'zoho_cancel_propagate', intentVersion, { delaySeconds: 0 });
  }
  return res.rows[0];
}

/** G5 — reschedule promoted. Release-then-promote ordering is load-bearing. */
async function G5_reschedulePromoted(tx, journeyId, { intentVersion, slotStartUtc, slotEndUtc, googleEventId = null, adoptedResolutionId = null, boundAction = null }) {
  await R.promoteRescheduleHold(tx, journeyId);
  const res = await tx.query(
    `UPDATE booking_journeys SET
       slot_start_utc = $3, slot_end_utc = $4,
       booking_status = 'confirmed',
       google_outcome_state = 'created',
       google_status = 'confirmed',
       google_event_id = COALESCE($5, google_event_id),
       google_event_adopted_at = CASE WHEN $6::uuid IS NOT NULL THEN now()
                                      ELSE google_event_adopted_at END,
       google_event_adopted_resolution_id = COALESCE($6::uuid, google_event_adopted_resolution_id),
       reschedule_intent_state = 'completed',
       reschedule_completed_at = now(),
       pending_slot_start_utc = NULL,
       reschedule_count = reschedule_count + 1,
       updated_at = now()
     WHERE journey_id = $1 AND intent_version = $2
     RETURNING *`,
    [journeyId, intentVersion, slotStartUtc, slotEndUtc, googleEventId, adoptedResolutionId]
  );
  if (!res.rowCount) throw new ConflictError('intent_superseded');
  if (boundAction) {
    await B.bindEvent(tx, journeyId, {
      googleEventId: googleEventId || res.rows[0].google_event_id,
      slotStartUtc, boundAction, resolutionId: adoptedResolutionId, unboundReason: 'rescheduled',
    });
  }
  await O.completeOp(tx, journeyId, 'google_reschedule');
  await O.startIntentOp(tx, journeyId, 'zoho_reschedule_propagate', intentVersion, { delaySeconds: 0 });
  return res.rows[0];
}

/** G6 — reschedule proven unchanged. Releases ONLY the pending hold. */
async function G6_rescheduleUnchanged(tx, journeyId, { intentVersion }) {
  await R.releaseHold(tx, journeyId, 'reschedule');
  const res = await tx.query(
    `UPDATE booking_journeys SET
       pending_slot_start_utc = NULL,
       reschedule_intent_state = 'failed',
       booking_status = 'confirmed',
       google_outcome_state = 'created',
       updated_at = now()
     WHERE journey_id = $1 AND intent_version = $2
     RETURNING *`,
    [journeyId, intentVersion]
  );
  if (!res.rowCount) throw new ConflictError('intent_superseded');
  await O.completeOp(tx, journeyId, 'google_reschedule');
  return res.rows[0];
}

/**
 * G7 — reschedule event PROVEN missing. Both holds retained: a missing event means
 * neither slot is proven free. Watch *exhaustion* is T3, not G7.
 *
 * The reason is added BEFORE the status update so the `bj_guard` trigger sees an open
 * reason when `google_outcome_state='unresolved'` lands (invariant T-a').
 */
async function G7_rescheduleEventMissing(tx, journeyId) {
  await RV.addReviewReason(tx, journeyId, 'reschedule_event_missing');
  const row = await patchGoogle(tx, journeyId, {
    reschedule_intent_state: 'failed',
    pending_slot_start_utc: null,
    google_outcome_state: 'unresolved',
    booking_status: 'needs_attention',
  });
  await O.terminateOp(tx, journeyId, 'google_reschedule', 'reschedule_event_missing');
  return row;
}

// ---------------------------------------------------------------------------
// Terminal escalations. Each: op -> terminal, intent terminated, reason added,
// zoho_manual_review activated — in ONE transaction. The reason is always added
// FIRST so invariant T-a' sees it.
// ---------------------------------------------------------------------------

/** T1 — creation still unprovable at the deadline. Hold RETAINED, never `booking_failed`. */
async function T1_createUnprovable(tx, journeyId) {
  await RV.addReviewReason(tx, journeyId, 'google_calendar_unreadable');
  const row = await patchGoogle(tx, journeyId, {
    google_outcome_state: 'unresolved', booking_status: 'needs_attention',
  });
  await O.terminateOp(tx, journeyId, 'google_create_recovery', 'deadline_unprovable');
  return row;
}

/** T2 — cancel exhausted, event intact. Slot HELD, no Zoho cancellation. */
async function T2_cancelExhausted(tx, journeyId) {
  await RV.addReviewReason(tx, journeyId, 'google_cancel_failed');
  const row = await patchGoogle(tx, journeyId, {
    google_outcome_state: 'unresolved',
    cancel_intent_state: 'failed',
    booking_status: 'confirmed',
  });
  await O.terminateOp(tx, journeyId, 'google_cancel', 'cancel_exhausted');
  return row;
}

/** T3 — reschedule watch exhausted. Original booking restored; BOTH holds retained. */
async function T3_rescheduleWatchExhausted(tx, journeyId) {
  await RV.addReviewReason(tx, journeyId, 'google_unreadable');
  const row = await patchGoogle(tx, journeyId, {
    google_outcome_state: 'unresolved',
    reschedule_intent_state: 'failed',
    booking_status: 'confirmed',
    pending_slot_start_utc: null,
  });
  await O.terminateOp(tx, journeyId, 'google_reschedule', 'watch_exhausted');
  return row;
}

/**
 * T4 — conversion never discovered after an uncertain send. Purely a CRM condition:
 * `booking_status` is untouched. Both op rows go terminal so `outcome_unknown` stops
 * blocking retention forever, while the parent latch remains the authoritative
 * prohibition on ever resending.
 */
async function T4_conversionUndiscovered(tx, journeyId) {
  await RV.addReviewReason(tx, journeyId, 'lead_update_outcome_unknown');
  await patchZoho(tx, journeyId, { lead_terminal_update_state: 'unresolved' });
  await O.terminateOp(tx, journeyId, 'zoho_lead_terminal_update', 'outcome_unknown');
  await O.terminateOp(tx, journeyId, 'zoho_conversion_discover', 'deadline_undiscovered');
  return get(tx, journeyId);
}

module.exports = {
  GOOGLE_COLUMNS,
  ZOHO_COLUMNS,
  get,
  getForUpdate,
  patchGoogle,
  patchZoho,
  upsertPage1,
  R1_page2Commit,
  R2_armCreate,
  R3_cancelIntent,
  R4_rescheduleIntent,
  G1_createConfirmed,
  G2_createRejected,
  G2a_conflictBeforeInsert,
  G3_provenAbsent,
  G4_cancelled,
  G5_reschedulePromoted,
  G6_rescheduleUnchanged,
  G7_rescheduleEventMissing,
  T1_createUnprovable,
  T2_cancelExhausted,
  T3_rescheduleWatchExhausted,
  T4_conversionUndiscovered,
  isSlotTaken,
  ConflictError,
};
