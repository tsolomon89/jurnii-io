-- =============================================================================
-- 0003 — admit the MR1 escalation to the operator-resolution ledger.
--
-- `booking_operator_resolutions.bor_escalation` enumerates the escalations an
-- operator may act on. `create_meeting_only` introduces MR1 (the Meeting itself
-- could not be created or verified), so without this the endpoint reserves its
-- fencing row, trips the CHECK and returns 500 before any verification runs.
--
-- Caught by a live probe rather than a unit test: nothing offline exercises the
-- reservation INSERT, because the constraint lives in Postgres and the suite that
-- would have hit it is the one that refuses to run against a real database.
--
-- Idempotent and additive: the constraint is dropped and re-added with the extra
-- value, which cannot invalidate an existing row.
-- =============================================================================

ALTER TABLE booking_operator_resolutions
  DROP CONSTRAINT IF EXISTS bor_escalation;
ALTER TABLE booking_operator_resolutions
  ADD CONSTRAINT bor_escalation CHECK (escalation IN ('t1', 't2', 't3', 't4', 'g7', 'rr1', 'mr1'));
