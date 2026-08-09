-- 0005_meeting_title.sql
--
-- Two derived columns that make the meeting's identity a persisted fact rather than
-- something each consumer recomputes.
--
-- 1. MEETING TITLE.
--
--    The Google Calendar `summary` and the Zoho `Event_Title` were the same hard-coded
--    constant in two unrelated files, pinned by no test. Both now read ONE generated
--    string, `Jurnii | {Company} - {First} | {Products}`, built by
--    `api/_utils/meeting-title.js`.
--
--    It is persisted rather than recomputed because the two consumers run minutes apart
--    in different processes: the Google event is created in the request path, the Zoho
--    Meeting by the worker, and a recovery or retry can run later still. A stored value
--    is what makes "Google and Zoho carry the identical string" true by construction,
--    and what makes a reschedule keep the original title — `updateEventTimes` patches
--    only start/end, so a title that drifted would leave the calendar and the CRM
--    permanently disagreeing.
--
--    DERIVED at R1 (page-2 commit) from the merged journey snapshot: `first_name` lands
--    on page 1, `company` and `product_interests` on page 2. It is deliberately absent
--    from PAGE2_COLUMNS, so `R1_page2Commit` THROWS on a caller-supplied title rather
--    than accepting one, and absent from GOOGLE_COLUMNS and ZOHO_COLUMNS, so no
--    booking, reschedule, cancel, recovery or Zoho step can name it in an UPDATE.
--
-- 2. MEETING ANCHOR PRODUCT.
--
--    A Zoho Event has exactly one native `What_Id`, so a multi-product booking still
--    anchors on ONE Product Deal. That choice moves from tick order
--    (`product_interests[0]`) to the authored canonical order in
--    `api/_utils/products.js::PRODUCT_ORDER`, whose last entry is Partnership — which
--    is precisely the "prefer a B2B Deal over a Partnership Deal" rule.
--
--    Persisting it is a correctness requirement, not an optimisation. `meetingCreate`
--    and `dealReconcile` run in separate worker passes and MUST resolve the same Deal:
--    if a journey created its Meeting under tick order and reconciled under canonical
--    order, `alreadyLinked` would not short-circuit and a triggers-enabled PUT would
--    fire WF007 a second time against a different Deal. A pre-0005 row keeps NULL and
--    both call sites fall back to `primaryProduct`, so no journey in flight across the
--    deploy can flip its anchor.
--
--    The full product scope is NOT narrowed by this: it travels in
--    `Meeting_Task_Contract_Products`, and `product_interests` itself is never
--    reordered (0004 explains why its order is load-bearing).
--
-- NO BACKFILL, deliberately. An SQL approximation of the title builder would be a
-- second, divergent implementation of the one thing that must exist exactly once —
-- sanitisation, the canonical product order and the 255-char company budget included.
-- Rows that committed page 2 before this migration keep NULL and are served by
-- `meetingTitleFor`'s runtime fallback, which is deterministic over a row that can no
-- longer change (from G1 onward `booking_status = 'confirmed'`, which R1's WHERE clause
-- excludes). The set of rows that committed page 2 before this ran and book after it is
-- bounded by FLOW_TOKEN_TTL, which is 2 hours.
--
-- Neither column is touched by `bj_guard()` (0001_init.sql:538-623) — that trigger
-- enforces monotonicity on step/status/timestamps and names neither of these — so no
-- trigger change is required.

ALTER TABLE booking_journeys
  ADD COLUMN IF NOT EXISTS meeting_title          text NULL,
  ADD COLUMN IF NOT EXISTS meeting_anchor_product text NULL;

-- The live `Events.Event_Title` length. The builder already budgets against it; this
-- makes a direct SQL write unable to produce a value Zoho would reject.
ALTER TABLE booking_journeys
  ADD CONSTRAINT bj_meeting_title_len CHECK (
    meeting_title IS NULL OR length(meeting_title) <= 255
  );

COMMENT ON COLUMN booking_journeys.meeting_title IS
  'Generated at page-2 commit and used verbatim as the Google Calendar summary and the '
  'Zoho Event_Title. Never accepted from a request body, never rewritten by a Google or '
  'Zoho step. NULL on rows predating this migration; meetingTitleFor() rebuilds those.';

COMMENT ON COLUMN booking_journeys.meeting_anchor_product IS
  'The single canonical product whose Deal the Zoho Meeting anchors to via What_Id, '
  'chosen in PRODUCT_ORDER (Partnership last, so B2B wins). NULL on rows predating this '
  'migration, which keep the previous tick-order behaviour via primaryProduct().';
