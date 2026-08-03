-- =============================================================================
-- 0002 — separate Meeting PERSISTENCE from Meeting AUTOMATION
--
-- `zoho_status` already answers "is the CRM integration finished?". It cannot also
-- answer "was the commercial automation invoked?", because in Meeting-only mode a
-- journey is legitimately FINISHED with the automation deliberately never invoked.
-- Overloading it — or worse, using Manual Review to represent an intentional
-- configuration choice — would make `meeting_create_failed` mean two unrelated things
-- and destroy the operator's ability to triage.
--
-- So activation gets its own small state machine, orthogonal to `zoho_status`:
--
--   not_requested    no Meeting exists yet
--   suppressed       Meeting created AND linked; automation deliberately not invoked
--   pending          activation wanted, not yet attempted
--   sending          the one triggers-enabled write is in flight
--   accepted         Zoho accepted that write
--   outcome_unknown  the write's outcome could not be established
--   complete         activation done; WF007 was given the Event
--
-- A journey may sit at `zoho_status = 'complete'` with activation `suppressed`. That
-- is the target state of Meeting-only mode and is NOT an error.
--
-- Idempotent, additive, and touches no Zoho metadata. Existing rows adopt
-- `not_requested`, then the backfill below promotes the ones that already carry a
-- Meeting so history is not misreported as "no Meeting".
-- =============================================================================

ALTER TABLE booking_journeys
  ADD COLUMN IF NOT EXISTS zoho_meeting_activation_state text NOT NULL DEFAULT 'not_requested';

ALTER TABLE booking_journeys
  DROP CONSTRAINT IF EXISTS bj_meeting_activation_state;
ALTER TABLE booking_journeys
  ADD CONSTRAINT bj_meeting_activation_state CHECK (zoho_meeting_activation_state IN (
    'not_requested', 'suppressed', 'pending', 'sending',
    'accepted', 'outcome_unknown', 'complete'));

-- Backfill. Every journey written before this migration ran with automation ENABLED
-- (the flag did not exist), so a Meeting that reached the retro-link genuinely did
-- activate WF007 — `complete` is the truthful value, not `suppressed`. A Meeting that
-- exists without a linked Deal never reached the retro-link, so activation was never
-- requested for it.
UPDATE booking_journeys
   SET zoho_meeting_activation_state = 'complete'
 WHERE zoho_meeting_activation_state = 'not_requested'
   AND zoho_meeting_id IS NOT NULL
   AND zoho_deal_id IS NOT NULL;

COMMENT ON COLUMN booking_journeys.zoho_meeting_activation_state IS
  'Whether the commercial automation (WF007 and its downstream stage/reminder/email '
  'chain) was invoked for this journey''s Meeting. Orthogonal to zoho_status: a '
  'journey can be integration-complete with activation deliberately suppressed. '
  'Gated by BOOKING_MEETING_AUTOMATION_ENABLED; see lib/meeting-automation.js.';

CREATE INDEX IF NOT EXISTS bj_meeting_activation_state_idx
  ON booking_journeys (zoho_meeting_activation_state)
  WHERE zoho_meeting_activation_state IN ('pending', 'sending', 'outcome_unknown');
