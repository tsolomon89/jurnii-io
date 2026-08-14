-- 0006_selected_host_calendar.sql
--
-- Multi-calendar booking hosts. One new column, plus two invariants on the columns that
-- already existed.
--
-- Almost nothing is needed here, because the schema was already host-generic:
--
--   * `booking_calendars` is keyed `host_calendar_key PRIMARY KEY` with
--     `canonical_fingerprint UNIQUE`, so it already models N calendars and already
--     refuses both halves of the failure that matters (one key on two calendars, one
--     calendar under two keys). No second registry table.
--
--   * `bsr_no_cross_journey_overlap` is already
--     `EXCLUDE USING gist (host_calendar_key WITH =, journey_id WITH <>, slot_hold WITH &&)`.
--     The `WITH =` on the key means each host ALREADY owns an independent reservation
--     namespace: Fraser at 15:00 and Timothy at 15:00 never collide, while two journeys
--     both wanting Fraser at 15:00 still do. Nothing to change, no data to migrate.
--
--   * `booking_journeys.google_calendar_id` / `host_calendar_key` already record which
--     calendar a journey was booked against, and every reschedule, cancel, recovery and
--     operator path already reads them rather than the environment.
--
-- 1. SELECTED HOST — intake context, not booking truth.
--
--    `selected_host_key` holds the STABLE public host id (`fraser`), not the
--    environment-scoped `host_calendar_key` (`fraser_prod`). Three consequences, all
--    intended: it means the same thing in every environment, it survives a calendar-key
--    rotation, and it is the value the browser is allowed to see.
--
--    It is deliberately a SEPARATE column rather than letting page 2 write
--    `host_calendar_key` directly. The Google columns become authoritative the moment a
--    booking attempt is armed, and a page-2 input field that could move them would put
--    visitor-supplied data inside booking truth. `selected_host_key` is what a journey
--    ASKED for; `host_calendar_key`/`google_calendar_id` are what it GOT, written only by
--    `R2_armCreate`.
--
--    NULL means "use the configured public default", exactly as NULL `lead_source` means
--    "use the configured ZOHO_LEAD_SOURCE default". Only journeys created before this
--    migration are NULL: from here on the server assigns the public default explicitly on
--    every page-2 commit, so a later change of `BOOKING_PUBLIC_HOST` cannot retroactively
--    move a journey that is already in flight.
--
--    Added to PAGE2_COLUMNS in db/queries/journeys.js — and to nothing else. It is absent
--    from GOOGLE_COLUMNS and ZOHO_COLUMNS, so no booking, recovery or CRM step can name it
--    in an UPDATE.
--
-- 2. A BOOKING MAY NOT MIGRATE BETWEEN HOSTS.
--
--    Belt-and-braces behind `R2_armCreate`, whose WHERE clause already admits only
--    `draft`/`reserved`/`booking_failed` with no outstanding `creating`/`unknown`
--    attempt. The trigger makes it structural: once `google_event_id` is set, a real
--    event exists on a real calendar, and repointing either column would orphan it —
--    recovery would read the wrong calendar and reservations would sit in the wrong
--    namespace.
--
--    Both rules are written to tolerate the two legitimate transitions:
--      * G1 sets `google_event_id` in the same statement, so OLD is still NULL there;
--      * the retention scrub nulls `google_calendar_id` while RETAINING
--        `host_calendar_key` (retention.js: a calendar id is usually a mailbox address
--        and so is personal data, the opaque key is not), which the `NEW … IS NOT NULL`
--        clause below permits.

ALTER TABLE booking_journeys
  ADD COLUMN IF NOT EXISTS selected_host_key text NULL;

COMMENT ON COLUMN booking_journeys.selected_host_key IS
  'The booking host this journey ASKED for, as a stable environment-independent id '
  '(fraser/marlon/timothy) resolved through config/host-calendars.js. Intake context, not '
  'booking truth: host_calendar_key and google_calendar_id are what the journey GOT, and '
  'become authoritative once R2 arms an attempt. Assigned by the server on every page-2 '
  'commit — the operator''s choice on an internal-booking placement, the configured '
  'BOOKING_PUBLIC_HOST otherwise. NULL only on journeys predating this migration, which '
  'read as the public default.';

-- -----------------------------------------------------------------------------
-- bj_guard() — unchanged except for the two new rules under "carried forward".
-- Replaced wholesale because CREATE OR REPLACE FUNCTION takes the whole body.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bj_guard() RETURNS trigger AS $$
DECLARE
  open_reasons integer;
BEGIN
  -- ---- carried forward -----------------------------------------------------
  IF OLD.google_status = 'confirmed' AND NEW.google_status = 'not_started' THEN
    RAISE EXCEPTION 'invariant_confirmed_google_cannot_reset' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.form_step < OLD.form_step THEN
    RAISE EXCEPTION 'invariant_form_step_cannot_decrease' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.page_1_completed_at IS NOT NULL
     AND NEW.page_1_completed_at IS DISTINCT FROM OLD.page_1_completed_at THEN
    RAISE EXCEPTION 'invariant_page_1_completed_at_write_once' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.booking_status = 'cancelled'
     AND NEW.booking_status IN ('draft','reserved','confirmed','cancel_pending','reschedule_pending') THEN
    RAISE EXCEPTION 'invariant_cancelled_cannot_reactivate' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.booking_attempt_version < OLD.booking_attempt_version THEN
    RAISE EXCEPTION 'invariant_attempt_version_cannot_decrease' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.intent_version < OLD.intent_version THEN
    RAISE EXCEPTION 'invariant_intent_version_cannot_decrease' USING ERRCODE = 'P0001';
  END IF;

  -- ---- 0006: a booking may not migrate between host calendars --------------
  -- Once google_event_id is set an event exists on a specific calendar. Repointing
  -- either column would orphan it: recovery reads google_calendar_id, and reservations
  -- are namespaced by host_calendar_key.
  IF OLD.google_event_id IS NOT NULL
     AND NEW.host_calendar_key IS DISTINCT FROM OLD.host_calendar_key THEN
    RAISE EXCEPTION 'invariant_host_calendar_immutable_after_booking' USING ERRCODE = 'P0001';
  END IF;
  -- NEW … IS NOT NULL admits the retention scrub, which nulls the address while keeping
  -- the opaque key.
  IF OLD.google_event_id IS NOT NULL
     AND NEW.google_calendar_id IS NOT NULL
     AND NEW.google_calendar_id IS DISTINCT FROM OLD.google_calendar_id THEN
    RAISE EXCEPTION 'invariant_google_calendar_immutable_after_booking' USING ERRCODE = 'P0001';
  END IF;

  -- ---- T-b: booking_failed is unreachable for a booking that existed -------
  IF NEW.booking_status = 'booking_failed'
     AND (NEW.confirmed_at IS NOT NULL OR NEW.google_event_id IS NOT NULL
          OR OLD.confirmed_at IS NOT NULL OR OLD.google_event_id IS NOT NULL) THEN
    RAISE EXCEPTION 'invariant_booking_failed_requires_never_confirmed' USING ERRCODE = 'P0001';
  END IF;

  -- ---- T-c: review bookkeeping is monotonic and additive -------------------
  IF NEW.manual_review_version < OLD.manual_review_version
     OR NEW.manual_review_applied_version < OLD.manual_review_applied_version
     OR NEW.manual_review_closed_version < OLD.manual_review_closed_version THEN
    RAISE EXCEPTION 'invariant_review_versions_monotonic' USING ERRCODE = 'P0001';
  END IF;
  IF NOT (NEW.manual_review_reasons @> OLD.manual_review_reasons) THEN
    RAISE EXCEPTION 'invariant_review_reasons_additive' USING ERRCODE = 'P0001';
  END IF;
  -- The applied array is the dedup source for the Task description. If it shrank,
  -- earlier keys would be rewritten as duplicate blocks on the next run.
  IF NOT (NEW.manual_review_reasons_applied @> OLD.manual_review_reasons_applied) THEN
    RAISE EXCEPTION 'invariant_review_applied_additive' USING ERRCODE = 'P0001';
  END IF;

  -- ---- T-a / T-a': attention agrees with the ledger ------------------------
  IF NEW.needs_attention IS DISTINCT FROM OLD.needs_attention
     OR NEW.google_outcome_state IS DISTINCT FROM OLD.google_outcome_state
     OR NEW.booking_status IS DISTINCT FROM OLD.booking_status THEN

    SELECT count(*) INTO open_reasons
      FROM booking_journey_review_reasons r
     WHERE r.journey_id = NEW.journey_id AND r.resolved_at IS NULL;

    IF NEW.needs_attention IS DISTINCT FROM OLD.needs_attention THEN
      IF NEW.needs_attention = false AND open_reasons > 0 THEN
        RAISE EXCEPTION 'invariant_attention_open_reasons_remain' USING ERRCODE = 'P0001';
      END IF;
      IF NEW.needs_attention = true AND open_reasons = 0 THEN
        RAISE EXCEPTION 'invariant_attention_without_reason' USING ERRCODE = 'P0001';
      END IF;
    END IF;

    IF (NEW.google_outcome_state = 'unresolved' OR NEW.booking_status = 'needs_attention')
       AND open_reasons = 0 THEN
      RAISE EXCEPTION 'invariant_escalated_without_open_reason' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
