-- =============================================================================
-- 0001_init.sql — Jurnii booking backend, initial schema (plan Revision 16)
--
-- Seven tables, their constraints and indexes, the two ladder functions, and the
-- §4.5 invariant triggers. Deliberately contains NO environment-specific data:
-- a seeded calendar row would either bake Preview's calendar into Production or
-- fail to apply cleanly in one of them. Calendar registration is a separate
-- idempotent command (db/register-calendar.js).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- required by bsr_no_cross_journey_overlap

-- -----------------------------------------------------------------------------
-- booking_journeys — the authoritative intake record
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_journeys (
  journey_id                     uuid PRIMARY KEY,
  -- identity
  email                          text NULL,
  email_normalized               text NULL,
  email_sha256                   text NULL,
  email_domain                   text NULL,
  first_name                     text NULL,
  last_name                      text NULL,
  company                        text NULL,
  job_title_raw                  text NULL,
  country_iso2                   char(2) NULL,
  country_name                   text NULL,
  phone_dial_code                text NULL,
  phone_national_number          text NULL,
  phone_e164                     text NULL,
  product_interest               text NULL,
  marketing_consent              boolean NOT NULL DEFAULT false,
  marketing_consent_at           timestamptz NULL,
  -- progressive form state
  form_step                      integer NOT NULL DEFAULT 1,
  page_1_completed_at            timestamptz NULL,
  page_2_completed_at            timestamptz NULL,
  -- attribution (first-touch, immutable after the initial insert)
  source_page                    text NULL,
  landing_url                    text NULL,
  referrer_url                   text NULL,
  form_placement                 text NULL,
  cta_id                         text NULL,
  form_variant                   text NULL,
  utm_source                     text NULL,
  utm_medium                     text NULL,
  utm_campaign                   text NULL,
  utm_term                       text NULL,
  utm_content                    text NULL,
  utm_id                         text NULL,
  client_timezone                text NULL,
  client_locale                  text NULL,
  attribution_extra              jsonb NOT NULL DEFAULT '{}',
  -- booking truth
  booking_status                 text NOT NULL DEFAULT 'draft',
  slot_start_utc                 timestamptz NULL,
  slot_end_utc                   timestamptz NULL,
  pending_slot_start_utc         timestamptz NULL,
  confirmed_at                   timestamptz NULL,
  cancelled_at                   timestamptz NULL,
  reschedule_count               integer NOT NULL DEFAULT 0,
  -- google
  google_status                  text NOT NULL DEFAULT 'not_started',
  google_outcome_state           text NULL,
  google_event_id                text NULL,
  google_event_candidate_id      text NULL,
  google_calendar_id             text NULL,
  host_calendar_key              text NULL,
  google_meet_url                text NULL,
  booking_attempt_version        integer NOT NULL DEFAULT 0,
  google_event_adopted_at        timestamptz NULL,
  google_event_adopted_resolution_id uuid NULL,
  -- manage intents
  cancel_intent_state            text NOT NULL DEFAULT 'none',
  reschedule_intent_state        text NOT NULL DEFAULT 'none',
  cancel_requested_at            timestamptz NULL,
  cancel_completed_at            timestamptz NULL,
  reschedule_requested_at        timestamptz NULL,
  reschedule_completed_at        timestamptz NULL,
  intent_version                 integer NOT NULL DEFAULT 0,
  -- zoho
  zoho_status                    text NOT NULL DEFAULT 'not_started',
  zoho_identity_outcome          text NULL,
  zoho_record_type               text NULL,
  zoho_record_id                 text NULL,
  zoho_contact_id                text NULL,
  zoho_account_id                text NULL,
  zoho_deal_id                   text NULL,
  zoho_meeting_id                text NULL,
  zoho_manual_review_task_id     text NULL,
  lead_terminal_update_state     text NOT NULL DEFAULT 'not_sent',
  lead_terminal_update_attempted_at timestamptz NULL,
  -- manual review (control flow is version comparisons + the ledger's open set)
  needs_attention                boolean NOT NULL DEFAULT false,
  needs_attention_code           text NULL,
  needs_attention_at             timestamptz NULL,
  manual_review_reasons          text[] NOT NULL DEFAULT '{}',
  manual_review_reasons_applied  text[] NOT NULL DEFAULT '{}',
  manual_review_version          integer NOT NULL DEFAULT 0,
  manual_review_applied_version  integer NOT NULL DEFAULT 0,
  manual_review_closed_version   integer NOT NULL DEFAULT 0,
  review_retention_until         timestamptz NULL,
  review_extension_applied_at    timestamptz NULL,
  -- observability + retention
  workflow_run_id                text NULL,
  processing_started_at          timestamptz NULL,
  processing_completed_at        timestamptz NULL,
  analytics_google_booking_created boolean NULL,
  analytics_zoho_identity_resolved boolean NULL,
  analytics_zoho_meeting_created   boolean NULL,
  analytics_deal_linked            boolean NULL,
  analytics_final_integration_status text NULL,
  pii_scrubbed_at                timestamptz NULL,
  created_at                     timestamptz NOT NULL DEFAULT now(),
  updated_at                     timestamptz NOT NULL DEFAULT now(),

  -- text + CHECK, so adding a value stays an additive, reversible DROP/ADD
  CONSTRAINT bj_booking_status CHECK (booking_status IN (
    'draft','reserved','confirmed','booking_failed','needs_attention',
    'cancel_pending','cancelled','reschedule_pending')),
  CONSTRAINT bj_google_status CHECK (google_status IN (
    'not_started','pending','confirmed','failed','cancelled')),
  CONSTRAINT bj_google_outcome_state CHECK (google_outcome_state IS NULL OR google_outcome_state IN (
    'creating','created','not_created','updating','cancelling','cancelled','unknown','unresolved')),
  CONSTRAINT bj_cancel_intent CHECK (cancel_intent_state IN ('none','pending','completed','failed')),
  CONSTRAINT bj_reschedule_intent CHECK (reschedule_intent_state IN ('none','pending','completed','failed')),
  CONSTRAINT bj_zoho_status CHECK (zoho_status IN (
    'not_started','pending','identity_resolved','record_saved','meeting_created',
    'complete','manual_review','failed')),
  CONSTRAINT bj_lead_terminal_update_state CHECK (lead_terminal_update_state IN (
    'not_sent','sending','accepted','rejected','outcome_unknown','unresolved')),
  CONSTRAINT bj_form_step CHECK (form_step BETWEEN 1 AND 3),
  CONSTRAINT bj_review_versions CHECK (
    manual_review_applied_version <= manual_review_version
    AND manual_review_closed_version <= manual_review_version)
);

CREATE UNIQUE INDEX IF NOT EXISTS bj_email_normalized_key
  ON booking_journeys (email_normalized) WHERE email_normalized IS NOT NULL AND pii_scrubbed_at IS NULL;
-- One journey per Google event: what stops two escalated journeys adopting the
-- same replacement event, a mistake an operator working from a calendar UI could
-- otherwise make silently (§4.1).
CREATE UNIQUE INDEX IF NOT EXISTS bj_one_journey_per_event
  ON booking_journeys (google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bj_attention ON booking_journeys (needs_attention_at)
  WHERE needs_attention = true;
CREATE INDEX IF NOT EXISTS bj_retention ON booking_journeys (updated_at) WHERE pii_scrubbed_at IS NULL;
CREATE INDEX IF NOT EXISTS bj_slot_end ON booking_journeys (slot_end_utc);

COMMENT ON COLUMN booking_journeys.needs_attention IS
  'DERIVED from booking_journey_review_reasons: true iff an unresolved reason row exists. '
  'Maintained only by refreshAttention(); writing it directly is unsupported and is rejected '
  'by the bj_guard trigger. Clearing an escalation means resolving its reason rows (plan §4.10).';
COMMENT ON COLUMN booking_journeys.booking_status IS
  'booking_failed is reachable only for a booking that never existed (G3 / RT1.absent). A booking '
  'that was ever confirmed becomes cancelled or needs_attention, never booking_failed (invariant T-b).';

-- -----------------------------------------------------------------------------
-- booking_calendars — canonical calendar identity, one row per environment
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_calendars (
  host_calendar_key     text PRIMARY KEY,            -- one row per internal key
  canonical_fingerprint text NOT NULL UNIQUE,        -- one row per real calendar
  note                  text NULL,
  registered_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bc_key_format CHECK (host_calendar_key ~ '^[a-z0-9_]{4,32}$')
);

COMMENT ON TABLE booking_calendars IS
  'The key<->calendar mapping, enforced in Postgres rather than by an environment assertion alone. '
  'The primary key stops one internal key mapping to two calendars; the unique fingerprint stops one '
  'calendar acquiring two keys, which is the failure that would split a reservation namespace. '
  'canonical_fingerprint = HMAC-SHA256(BOOKING_CALENDAR_HMAC_KEY, ''calendar:v1|'' || lower(trim(id))) '
  'computed by booking/lib/fingerprint.js — never a plain digest, which would be enumerable.';

-- -----------------------------------------------------------------------------
-- booking_operator_resolutions — operator idempotency, fencing and audit
-- Created before the two tables that reference it.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_operator_resolutions (
  resolution_id            uuid PRIMARY KEY,            -- client-supplied
  journey_id               uuid NOT NULL REFERENCES booking_journeys(journey_id) ON DELETE CASCADE,
  request_fingerprint      text NOT NULL,
  fingerprint_key_id       text NOT NULL,
  escalation               text NOT NULL,
  action                   text NOT NULL,
  reason_code              text NULL,                   -- RR1 only
  expected_attempt_version integer NOT NULL,
  expected_intent_version  integer NOT NULL,
  expected_review_version  integer NOT NULL,
  operator_ref             text NULL,                   -- opaque label, never PII
  state                    text NOT NULL,
  attempt_count            integer NOT NULL DEFAULT 1,
  lease_token              uuid NOT NULL,               -- FENCING TOKEN, new per reserve/reclaim
  lease_expires_at         timestamptz NULL,
  verified_outcome         jsonb NULL,
  resolved_reason_keys     text[] NOT NULL DEFAULT '{}',
  result_status            integer NULL,
  result_body              jsonb NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  completed_at             timestamptz NULL,
  CONSTRAINT bor_state CHECK (state IN ('processing','completed')),
  CONSTRAINT bor_escalation CHECK (escalation IN ('t1','t2','t3','t4','g7','rr1')),
  CONSTRAINT bor_completed_has_result CHECK (
    state <> 'completed' OR (result_status IS NOT NULL AND result_body IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS bor_journey ON booking_operator_resolutions (journey_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bor_processing ON booking_operator_resolutions (lease_expires_at)
  WHERE state = 'processing';

COMMENT ON COLUMN booking_operator_resolutions.lease_token IS
  'Fencing token. Phase 3 may apply or finalise only while this exact token still owns the '
  'processing row, so a presumed-dead owner that is merely slow cannot apply its effect on top '
  'of the reclaimer''s. A lease expiring is a presumption; the token is the fact.';

-- -----------------------------------------------------------------------------
-- booking_journey_review_reasons — per-occurrence review state
-- The single source of truth for "is anything outstanding".
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_journey_review_reasons (
  journey_id             uuid NOT NULL REFERENCES booking_journeys(journey_id) ON DELETE CASCADE,
  code                   text NOT NULL,
  generation             integer NOT NULL,   -- occurrence index of THIS code on THIS journey, from 0
  review_version         integer NOT NULL,   -- the manual_review_version this occurrence produced
  first_seen_at          timestamptz NOT NULL DEFAULT now(),
  last_seen_at           timestamptz NOT NULL DEFAULT now(),
  occurrences            integer NOT NULL DEFAULT 1,
  resolved_at            timestamptz NULL,   -- NULL = still outstanding
  -- SET NULL rather than NO ACTION so a retention purge cannot deadlock on the
  -- order in which two cascade paths from booking_journeys are processed.
  resolved_resolution_id uuid NULL REFERENCES booking_operator_resolutions(resolution_id) ON DELETE SET NULL,
  PRIMARY KEY (journey_id, code, generation),
  CONSTRAINT bjrr_generation_nonneg CHECK (generation >= 0),
  -- An id implies a resolution time. Not a biconditional: a purge may null the id.
  CONSTRAINT bjrr_id_implies_time CHECK (resolved_resolution_id IS NULL OR resolved_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS bjrr_open ON booking_journey_review_reasons (journey_id)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS bjrr_journey_code
  ON booking_journey_review_reasons (journey_id, code, generation DESC);

COMMENT ON TABLE booking_journey_review_reasons IS
  'One row per reason OCCURRENCE. Dedup is per (code, generation), so the same code recurring '
  'after its previous occurrence was resolved is a new fact that reopens the Task. Resolution is '
  'per row, so resolving one escalation never closes an unrelated reason (plan §4.1, §4.10).';

-- -----------------------------------------------------------------------------
-- booking_journey_event_bindings — which Google event stood for this booking
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_journey_event_bindings (
  binding_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id             uuid NOT NULL REFERENCES booking_journeys(journey_id) ON DELETE CASCADE,
  google_event_id        text NULL,                    -- nulled by the PII scrub with the journey copy
  slot_start_utc         timestamptz NOT NULL,
  bound_at               timestamptz NOT NULL DEFAULT now(),
  bound_by_resolution_id uuid NULL REFERENCES booking_operator_resolutions(resolution_id) ON DELETE SET NULL,
  bound_action           text NOT NULL,
  unbound_at             timestamptz NULL,
  unbound_reason         text NULL,
  CONSTRAINT bjeb_bound_action CHECK (bound_action IN (
    'pipeline_create','rt1_adopt','rg7_adopt_old','rg7_adopt_new')),
  CONSTRAINT bjeb_unbound_reason CHECK (unbound_reason IS NULL OR unbound_reason IN (
    'superseded','event_absent','cancelled','rescheduled')),
  CONSTRAINT bjeb_unbound_pair CHECK ((unbound_at IS NULL) = (unbound_reason IS NULL))
);
-- At most one LIVE binding per journey and per event. A journey may hold many
-- bindings over its life: an adopted event can itself disappear, and the operator
-- must be able to adopt a second verified replacement (§4.10 change #6).
--
-- ===========================================================================
-- APPROVED DEVIATION 2 from plan Revision 16 §4.10
--
-- Replacing a binding must be TWO ORDERED STATEMENTS inside one transaction:
--   1. close the existing live binding  (UPDATE ... SET unbound_at, unbound_reason)
--   2. insert the replacement binding   (INSERT ...)
-- A single statement that does both — an INSERT with a data-modifying CTE that
-- closes the old row — violates bjeb_one_live_per_journey, because a unique index
-- is checked per statement and both rows are live within it. Confirmed empirically
-- against PostgreSQL 17.10: the ordered form succeeds, the reverse order fails.
--
-- This is the same load-bearing ordering the plan already documents for G5 against
-- bsr_one_confirmed: a partial unique index cannot be deferred, so the release
-- must precede the promotion. bindEvent() in db/queries/bindings.js enforces it,
-- and the tests pin both directions. A correction required by actual PostgreSQL
-- behaviour, not an architectural change.
-- ===========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS bjeb_one_live_per_journey
  ON booking_journey_event_bindings (journey_id) WHERE unbound_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bjeb_one_live_per_event
  ON booking_journey_event_bindings (google_event_id)
  WHERE unbound_at IS NULL AND google_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bjeb_journey ON booking_journey_event_bindings (journey_id, bound_at DESC);

-- -----------------------------------------------------------------------------
-- booking_journey_ops — transactional outbox, budgets, cycles, deadlines
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_journey_ops (
  journey_id          uuid NOT NULL REFERENCES booking_journeys(journey_id) ON DELETE CASCADE,
  op                  text NOT NULL,
  state               text NOT NULL DEFAULT 'pending',
  run_count           integer NOT NULL DEFAULT 0,    -- OBSERVABILITY ONLY. Never a budget.
  failure_count       integer NOT NULL DEFAULT 0,
  crash_reclaim_count integer NOT NULL DEFAULT 0,
  create_attempts     integer NOT NULL DEFAULT 0,
  outcome_recorded    boolean NOT NULL DEFAULT true,
  max_failures        integer NOT NULL,
  max_crash_reclaims  integer NOT NULL DEFAULT 3,
  next_retry_at       timestamptz NULL,              -- NULL = not due (parked/done/terminal)
  lease_expires_at    timestamptz NULL,
  deadline_at         timestamptz NULL,
  watch_started_at    timestamptz NULL,
  watch_until_at      timestamptz NULL,
  last_error_code     text NULL,
  last_outcome_kind   text NULL,
  last_error_at       timestamptz NULL,
  first_attempted_at  timestamptz NULL,
  unknown_since       timestamptz NULL,
  completed_at        timestamptz NULL,
  cycle_version       integer NULL,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (journey_id, op),
  CONSTRAINT bjo_state CHECK (state IN
    ('pending','sending','watching','accepted','outcome_unknown','rejected',
     'done','parked','terminal')),
  CONSTRAINT bjo_op CHECK (op IN (
    'reservation_release',
    'google_create_recovery','google_cancel','google_reschedule',
    'zoho_identity_resolve','zoho_record_write','zoho_lead_terminal_update',
    'zoho_conversion_discover','zoho_meeting_create','zoho_deal_reconcile',
    'zoho_cancel_propagate','zoho_reschedule_propagate','zoho_manual_review')),
  CONSTRAINT bjo_outcome_kind CHECK (last_outcome_kind IS NULL OR last_outcome_kind IN (
    'progress','no_progress','parked_precondition','watch_tick',
    'retryable_failure','terminal_failure'))
);
CREATE INDEX IF NOT EXISTS idx_bjo_due ON booking_journey_ops (next_retry_at)
  WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bjo_active ON booking_journey_ops (journey_id)
  WHERE next_retry_at IS NOT NULL OR state IN ('sending','watching','outcome_unknown');

COMMENT ON COLUMN booking_journey_ops.state IS
  '''terminal'' is the given-up state: not in the retention busy set and NOT revivable by ensureOp, '
  'which is why ''parked'' could not serve — ensureOp deliberately re-arms parked rows, so parking an '
  'uncertain-create op would defeat the latch that stops a duplicate Lead or Meeting.';

-- -----------------------------------------------------------------------------
-- booking_slot_reservations — holds, with the buffered overlap constraint
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_slot_reservations (
  reservation_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id        uuid NOT NULL REFERENCES booking_journeys(journey_id) ON DELETE CASCADE,
  purpose           text NOT NULL CHECK (purpose IN ('initial','reschedule')),
  host_calendar_key text NOT NULL,
  slot_start_utc    timestamptz NOT NULL,   -- the ONLY authoritative slot value
  -- ===========================================================================
  -- APPROVED DEVIATION 1 from plan Revision 16 §4.3
  --
  -- The plan specifies slot_hold and hold_end_utc as
  --   GENERATED ALWAYS AS (... slot_start_utc +/- interval ...) STORED
  -- PostgreSQL rejects that outright:
  --   ERROR: generation expression is not immutable
  -- because `timestamptz + interval` (timestamptz_pl_interval) is STABLE, not
  -- IMMUTABLE — interval arithmetic with day/month units depends on the session
  -- TimeZone, and volatility is a property of the function, not of the value.
  -- The epoch round-trip is no better: date_part('epoch', timestamptz) is STABLE
  -- too. Both were confirmed empirically against PostgreSQL 17.10 before this
  -- change was made.
  --
  -- These are therefore plain columns maintained by the bsr_derive trigger below,
  -- which derives them UNCONDITIONALLY on every INSERT and UPDATE and IGNORES any
  -- value the application supplies. Every property the design relies on is kept:
  -- the columns remain derived and authoritative, the application cannot write an
  -- inconsistent hold, and the EXCLUDE constraint still indexes slot_hold.
  --
  -- This is a correction required by actual PostgreSQL behaviour, not an
  -- architectural change. See booking/docs/implementation-notes.md.
  -- ===========================================================================
  slot_end_utc      timestamptz NOT NULL,
  slot_hold         tstzrange NOT NULL,
  hold_end_utc      timestamptz NOT NULL,
  status            text NOT NULL CHECK (status IN ('pending','confirmed','released','expired')),
  armed             boolean NOT NULL DEFAULT false,
  attempt_version   integer NOT NULL DEFAULT 0,
  expires_at        timestamptz NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- 1800 = booking/config/slots.js GRID_SECONDS. Both derive from that one value.
  CONSTRAINT bsr_grid_aligned CHECK (EXTRACT(EPOCH FROM slot_start_utc)::bigint % 1800 = 0)
);

-- APPROVED DEVIATION 1 (continued): the replacement for the invalid generated
-- columns. Assignment is UNCONDITIONAL — any slot_end_utc, hold_end_utc or
-- slot_hold the application supplies is overwritten, never merged and never
-- trusted, so these columns behave exactly as GENERATED ALWAYS would have.
--
-- 30 / 15 / 45 minutes mirror SLOT_MINUTES and BUFFER_MINUTES in
-- booking/config/slots.js, which remains the source of truth; test 52 asserts
-- Postgres and Node agree about what "taken" means.
--
-- The buffered window is EXACTLY the availability conflict predicate:
--   [a-15, a+45) && [b-15, b+45)  <=>  |a-b| < 60 min.   '[)' bounds are essential.
CREATE OR REPLACE FUNCTION bsr_derive() RETURNS trigger AS $$
BEGIN
  -- Unconditional: slot_start_utc is the only authoritative input.
  NEW.slot_end_utc := NEW.slot_start_utc + interval '30 minutes';
  NEW.hold_end_utc := NEW.slot_start_utc + interval '45 minutes';
  NEW.slot_hold    := tstzrange(NEW.slot_start_utc - interval '15 minutes',
                                NEW.slot_start_utc + interval '45 minutes', '[)');
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bsr_derive_trg ON booking_slot_reservations;
CREATE TRIGGER bsr_derive_trg BEFORE INSERT OR UPDATE ON booking_slot_reservations
  FOR EACH ROW EXECUTE FUNCTION bsr_derive();

-- journey_id WITH <> means a violation requires same calendar AND different
-- journey AND overlapping hold, so one journey may hold its confirmed 13:00 and a
-- pending 13:30 while no other journey can take either.
ALTER TABLE booking_slot_reservations
  DROP CONSTRAINT IF EXISTS bsr_no_cross_journey_overlap;
ALTER TABLE booking_slot_reservations
  ADD CONSTRAINT bsr_no_cross_journey_overlap
  EXCLUDE USING gist (host_calendar_key WITH =, journey_id WITH <>, slot_hold WITH &&)
  WHERE (status IN ('pending','confirmed'));

CREATE UNIQUE INDEX IF NOT EXISTS bsr_one_confirmed ON booking_slot_reservations (journey_id)
  WHERE status = 'confirmed';
CREATE UNIQUE INDEX IF NOT EXISTS bsr_one_pending ON booking_slot_reservations (journey_id, purpose)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS bsr_active_hold ON booking_slot_reservations USING gist (slot_hold)
  WHERE status IN ('pending','confirmed');
CREATE INDEX IF NOT EXISTS bsr_hold_end ON booking_slot_reservations (hold_end_utc)
  WHERE status IN ('pending','confirmed');
CREATE INDEX IF NOT EXISTS bsr_expiring ON booking_slot_reservations (expires_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS bsr_journey_retention
  ON booking_slot_reservations (journey_id, status, hold_end_utc);

COMMENT ON COLUMN booking_slot_reservations.armed IS
  'The Google mutation PIPELINE is armed for this hold (set at R2/R4, before any call). NOT a record '
  'of any request being sent — that is booking_journey_ops.create_attempts. A hold armed at R2 whose '
  'insert never left has armed=true and create_attempts=0, which is what lets G2a release it safely '
  'while a post-insert crash cannot.';

-- -----------------------------------------------------------------------------
-- Ladders, declared in exactly one place.
--
-- IMMUTABLE, so elapsed time is passed in rather than read: the caller supplies
-- now() - first_attempted_at. A function that called now() could not be IMMUTABLE
-- and could not be inlined into the claim statement.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ladder_delay(
  p_op            text,
  p_state         text,
  p_failure_count integer,
  p_elapsed       interval
) RETURNS interval AS $$
  SELECT CASE
    -- The durable watch phase runs at a fixed slow cadence regardless of op.
    WHEN p_state = 'watching' THEN interval '60 minutes'

    WHEN p_op = 'reservation_release' THEN interval '1 minute'

    -- google_cancel: 30s,1,2,4,8,16,30,30 min
    WHEN p_op = 'google_cancel' THEN
      (ARRAY[interval '30 seconds', interval '1 minute', interval '2 minutes',
             interval '4 minutes', interval '8 minutes', interval '16 minutes',
             interval '30 minutes'])[LEAST(GREATEST(p_failure_count,0),6) + 1]

    WHEN p_op = 'google_reschedule' THEN
      (ARRAY[interval '30 seconds', interval '1 minute', interval '2 minutes',
             interval '4 minutes', interval '8 minutes', interval '16 minutes',
             interval '30 minutes'])[LEAST(GREATEST(p_failure_count,0),6) + 1]

    -- google_create_recovery: 2,2,5,10,15 min, then the slow cadence to the
    -- deadline. Exhausting max_failures only slows it down; it never decides an
    -- outcome (§4.2 precedence rule).
    WHEN p_op = 'google_create_recovery' THEN
      (ARRAY[interval '2 minutes', interval '2 minutes', interval '5 minutes',
             interval '10 minutes', interval '15 minutes',
             interval '60 minutes'])[LEAST(GREATEST(p_failure_count,0),5) + 1]

    -- zoho_deal_reconcile: 5m, 15m, 1h, 6h, 24h by ELAPSED since confirmed_at
    WHEN p_op = 'zoho_deal_reconcile' THEN
      CASE
        WHEN p_elapsed < interval '5 minutes'  THEN interval '5 minutes'
        WHEN p_elapsed < interval '20 minutes' THEN interval '15 minutes'
        WHEN p_elapsed < interval '1 hour'     THEN interval '1 hour'
        WHEN p_elapsed < interval '7 hours'    THEN interval '6 hours'
        ELSE interval '24 hours'
      END

    WHEN p_op = 'zoho_conversion_discover' THEN
      (ARRAY[interval '1 minute', interval '2 minutes', interval '5 minutes',
             interval '10 minutes', interval '15 minutes'])[LEAST(GREATEST(p_failure_count,0),4) + 1]

    -- zoho_lead_terminal_update sends once and is never resent; a delay is only
    -- ever consumed if something re-arms it, which no path does.
    WHEN p_op = 'zoho_lead_terminal_update' THEN interval '60 minutes'

    -- every remaining zoho op: 1,2,4,8,16,32,60,60 min
    ELSE
      (ARRAY[interval '1 minute', interval '2 minutes', interval '4 minutes',
             interval '8 minutes', interval '16 minutes', interval '32 minutes',
             interval '60 minutes'])[LEAST(GREATEST(p_failure_count,0),6) + 1]
  END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION op_priority(p_op text) RETURNS integer AS $$
  SELECT CASE p_op
    WHEN 'reservation_release'        THEN 5
    WHEN 'google_cancel'              THEN 8    -- cancel intent outranks everything
    WHEN 'google_reschedule'          THEN 9
    WHEN 'google_create_recovery'     THEN 10
    WHEN 'zoho_cancel_propagate'      THEN 20
    WHEN 'zoho_reschedule_propagate'  THEN 25
    WHEN 'zoho_identity_resolve'      THEN 30
    WHEN 'zoho_record_write'          THEN 30
    WHEN 'zoho_lead_terminal_update'  THEN 30
    WHEN 'zoho_conversion_discover'   THEN 40
    WHEN 'zoho_meeting_create'        THEN 40
    WHEN 'zoho_deal_reconcile'        THEN 50
    WHEN 'zoho_manual_review'         THEN 60
    ELSE 100
  END;
$$ LANGUAGE sql IMMUTABLE;

-- -----------------------------------------------------------------------------
-- §4.5 invariants. Guarded UPDATE ... WHERE predicates carry the optimistic
-- concurrency; these carry the cross-column and cross-table rules that a WHERE
-- clause cannot express.
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
  -- Evaluated when attention or an escalated parent state changes. Restricting it
  -- keeps unrelated updates (zoho_status, timestamps) off this subquery, while
  -- still catching every hand-flag, hand-clear and incomplete escalation.
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

    -- An escalated parent state with nothing outstanding is the invisibly stuck
    -- state: absent from the review queue, yet every request surface still
    -- returns 409 booking_needs_attention (§5.5).
    IF (NEW.google_outcome_state = 'unresolved' OR NEW.booking_status = 'needs_attention')
       AND open_reasons = 0 THEN
      RAISE EXCEPTION 'invariant_escalated_without_open_reason' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bj_guard_trg ON booking_journeys;
CREATE TRIGGER bj_guard_trg BEFORE UPDATE ON booking_journeys
  FOR EACH ROW EXECUTE FUNCTION bj_guard();

-- A resolved occurrence is an audit fact, not a mutable flag: a recurrence is a
-- NEW occurrence at the next generation, never a reopened row.
CREATE OR REPLACE FUNCTION bjrr_guard() RETURNS trigger AS $$
BEGIN
  IF OLD.resolved_at IS NOT NULL
     AND NEW.resolved_at IS DISTINCT FROM OLD.resolved_at THEN
    RAISE EXCEPTION 'invariant_resolved_at_write_once' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.generation <> OLD.generation OR NEW.review_version <> OLD.review_version THEN
    RAISE EXCEPTION 'invariant_reason_identity_immutable' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.occurrences < OLD.occurrences THEN
    RAISE EXCEPTION 'invariant_occurrences_monotonic' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bjrr_guard_trg ON booking_journey_review_reasons;
CREATE TRIGGER bjrr_guard_trg BEFORE UPDATE ON booking_journey_review_reasons
  FOR EACH ROW EXECUTE FUNCTION bjrr_guard();
