'use strict';

/**
 * Retention — bounded eligibility (§9).
 *
 * Every clause of the busy predicate is bounded. Revision 8 made a pending hold
 * block unconditionally, which meant a hold that was armed and then stranded stayed
 * `pending` forever and its journey could never be scrubbed. A hold is a retention
 * obstacle only while it can still withhold something, which is exactly while
 * `hold_end_utc > now()`; past that it is a historical record, not a lock, because
 * availability only ever offers future slots.
 *
 * `terminal` ops and the two `unresolved` parent states are deliberately ABSENT from
 * the busy set: they are given-up states, governed by the bounded review window
 * instead. An open reason row is likewise not a busy clause — a reason nobody can
 * act on must not hold a journey forever.
 */

/**
 * Shared busy predicate, as a SQL fragment over alias `j`.
 *
 * Every nullable comparison is COALESCEd and the whole expression is wrapped in
 * `COALESCE(..., false)`. This is not defensive noise — it is a correctness
 * requirement. `google_outcome_state` is nullable, so `NULL IN ('creating',…)`
 * yields NULL, and under SQL three-valued logic `false OR NULL` is NULL, not false.
 * `NOT NULL` is also NULL, so `WHERE NOT busy` would silently exclude the row and
 * **no journey with a null outcome state would ever be scrubbed** — a retention
 * policy that quietly retains everything. Caught against a real server; the plan's
 * SQL carried the same latent hole.
 */
const BUSY_SQL = `COALESCE((
  EXISTS (SELECT 1 FROM booking_journey_ops o WHERE o.journey_id = j.journey_id
          AND (o.next_retry_at IS NOT NULL
            OR o.state IN ('sending','watching','outcome_unknown')
            OR o.lease_expires_at > now()))
  OR COALESCE(j.lead_terminal_update_state,'') IN ('sending','outcome_unknown')
  OR COALESCE(j.google_outcome_state,'') IN ('creating','updating','cancelling','unknown')
  OR COALESCE(j.cancel_intent_state,'') = 'pending'
  OR COALESCE(j.reschedule_intent_state,'') = 'pending'
  OR (j.needs_attention = true
      AND COALESCE(j.review_retention_until, '-infinity'::timestamptz) > now())
  OR EXISTS (SELECT 1 FROM booking_operator_resolutions r WHERE r.journey_id = j.journey_id
             AND r.state = 'processing'
             AND COALESCE(r.lease_expires_at, '-infinity'::timestamptz) > now())
  OR EXISTS (SELECT 1 FROM booking_slot_reservations s WHERE s.journey_id = j.journey_id
             AND s.status IN ('pending','confirmed')
             AND s.hold_end_utc > now())
), false)`;

/** Lifecycle clock per §9. The 365-day clock runs from the real meeting end. */
const LIFECYCLE_SQL = `
  CASE
    WHEN j.booking_status IN ('confirmed','cancelled') OR j.slot_end_utc IS NOT NULL
      THEN COALESCE(j.slot_end_utc, j.cancelled_at, j.updated_at) + make_interval(days => $2)
    WHEN j.page_2_completed_at IS NOT NULL
      THEN j.updated_at + make_interval(days => $3)
    ELSE j.updated_at + make_interval(days => $4)
  END`;

function periods() {
  return {
    booked: Number(process.env.RETENTION_BOOKED_DAYS || 365),
    page2: Number(process.env.RETENTION_PAGE2_DAYS || 180),
    page1: Number(process.env.RETENTION_PAGE1_DAYS || 90),
    purge: Number(process.env.RETENTION_PURGE_DAYS || 730),
  };
}

/** Journeys eligible for the PII scrub, newest lifecycle boundary first. */
async function findScrubCandidates(tx, limit = 50) {
  const p = periods();
  const res = await tx.query(
    `SELECT j.journey_id
       FROM booking_journeys j
      WHERE j.pii_scrubbed_at IS NULL
        AND now() >= ${LIFECYCLE_SQL}
        AND NOT ${BUSY_SQL}
      ORDER BY j.updated_at
      FOR UPDATE SKIP LOCKED
      LIMIT $1`,
    [limit, p.booked, p.page2, p.page1]
  );
  return res.rows.map((r) => r.journey_id);
}

/** True when a specific journey is currently busy. Used by tests and diagnostics. */
async function isBusy(tx, journeyId) {
  const res = await tx.query(
    `SELECT ${BUSY_SQL} AS busy FROM booking_journeys j WHERE j.journey_id = $1`,
    [journeyId]
  );
  return res.rowCount ? res.rows[0].busy : null;
}

/**
 * Scrub one journey.
 *
 * The five `analytics_*` fields are computed HERE, from the ids, immediately before
 * those ids are nulled — after the nulling there is nothing left to compute them
 * from. `host_calendar_key` is retained while `google_calendar_id` is nulled: a
 * calendar id is very often a mailbox address and so is personal data, while the
 * configured opaque key preserves the one thing analytics needs without keeping an
 * address or a reversible derivative of one.
 */
async function scrubJourney(tx, journeyId) {
  const res = await tx.query(
    `UPDATE booking_journeys SET
       analytics_google_booking_created   = (google_event_id IS NOT NULL),
       analytics_zoho_identity_resolved   = (zoho_record_id IS NOT NULL OR zoho_contact_id IS NOT NULL),
       analytics_zoho_meeting_created     = (zoho_meeting_id IS NOT NULL),
       analytics_deal_linked              = (zoho_deal_id IS NOT NULL),
       analytics_final_integration_status = CASE
           WHEN needs_attention THEN 'needs_attention'
           WHEN zoho_status = 'complete' THEN 'complete'
           ELSE zoho_status END,
       first_name = NULL, last_name = NULL,
       email = NULL, email_normalized = NULL,
       company = NULL, job_title_raw = NULL,
       phone_dial_code = NULL, phone_national_number = NULL, phone_e164 = NULL,
       landing_url = NULL, referrer_url = NULL,
       google_meet_url = NULL, google_event_id = NULL,
       google_event_candidate_id = NULL, google_calendar_id = NULL,
       zoho_record_id = NULL, zoho_contact_id = NULL, zoho_account_id = NULL,
       zoho_deal_id = NULL, zoho_meeting_id = NULL, zoho_manual_review_task_id = NULL,
       attribution_extra = '{}',
       email_sha256 = CASE WHEN $2 THEN email_sha256 ELSE NULL END,
       email_domain = CASE WHEN $2 THEN email_domain ELSE NULL END,
       pii_scrubbed_at = now(),
       updated_at = now()
     WHERE journey_id = $1 AND pii_scrubbed_at IS NULL
     RETURNING journey_id`,
    [journeyId, process.env.ANALYTICS_RETAIN_EMAIL_HASH === 'true']
  );
  if (!res.rowCount) return false;

  // A verified outcome can quote a Google event summary or a Zoho Contact's email,
  // so it is journey PII. The operational audit — ids, action, operator_ref,
  // resolved keys, timestamps — survives.
  await tx.query(
    `UPDATE booking_operator_resolutions
        SET result_body = '{}', verified_outcome = NULL
      WHERE journey_id = $1`,
    [journeyId]
  );
  // The binding's event id is the same identifier as the journey's copy.
  await tx.query(
    `UPDATE booking_journey_event_bindings SET google_event_id = NULL WHERE journey_id = $1`,
    [journeyId]
  );
  return true;
}

/** Journeys whose scrubbed row may now be deleted outright. */
async function findPurgeCandidates(tx, limit = 50) {
  const p = periods();
  const res = await tx.query(
    `SELECT journey_id FROM booking_journeys
      WHERE pii_scrubbed_at IS NOT NULL
        AND now() >= pii_scrubbed_at + make_interval(days => $2)
      ORDER BY pii_scrubbed_at
      FOR UPDATE SKIP LOCKED
      LIMIT $1`,
    [limit, p.purge]
  );
  return res.rows.map((r) => r.journey_id);
}

/**
 * Delete a journey and everything hanging off it. Ops, reservations, review reasons,
 * bindings and resolutions all cascade from `booking_journeys`; bindings and reasons
 * reference resolutions with ON DELETE SET NULL, so the cascade cannot deadlock on
 * the order the two paths are processed.
 */
async function purgeJourney(tx, journeyId) {
  const res = await tx.query('DELETE FROM booking_journeys WHERE journey_id = $1 RETURNING journey_id', [journeyId]);
  return res.rowCount === 1;
}

module.exports = {
  BUSY_SQL,
  periods,
  findScrubCandidates,
  isBusy,
  scrubJourney,
  findPurgeCandidates,
  purgeJourney,
};
