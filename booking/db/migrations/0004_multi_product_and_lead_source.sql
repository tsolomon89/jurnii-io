-- 0004_multi_product_and_lead_source.sql
--
-- Two columns, both widening an existing contract rather than changing one.
--
-- 1. PRODUCT INTEREST becomes multi-valued.
--
--    `Leads.Product_Interest` in Zoho is, and always was, a multiselectpicklist
--    (json_type jsonarray) offering Jurnii UX / Jurnii 360 / Jurnii Cortex /
--    Partnership. The scalar `product_interest text` column was the narrower side of
--    that contract, and `zoho-ops.js` papered over the mismatch by wrapping the single
--    value in `[ ]`. The form now lets a visitor pick several, so the column has to
--    hold several.
--
--    The legacy scalar is RETAINED and simply no longer written. Dropping it belongs in
--    a later migration once nothing reads it: `migrate.js` pins each applied file by
--    checksum and refuses to let an applied migration be edited, so a premature DROP
--    could not be walked back. `api/_utils/products.js::productList` reads the array and
--    falls back to the scalar, so rows written before this migration stay correct.
--
-- 2. LEAD SOURCE becomes per-journey.
--
--    It was a module-load constant (`ZOHO_LEAD_SOURCE`, default 'Website') stamped on
--    every Lead and Contact. The internal /admin-form route needs to record a different
--    one per booking. NULL means "use the configured default", which is every public
--    booking, so no backfill is needed or wanted.
--
-- Neither column is touched by `bj_guard()` (0001_init.sql:538-623) — that trigger
-- enforces monotonicity on step/status/timestamps and names neither of these — so no
-- trigger change is required.

ALTER TABLE booking_journeys
  ADD COLUMN IF NOT EXISTS product_interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lead_source       text   NULL;

-- Backfill from the scalar. Idempotent: only rows still holding the column default are
-- touched, so re-running cannot duplicate or overwrite a real selection.
UPDATE booking_journeys
   SET product_interests = ARRAY[btrim(product_interest)]
 WHERE product_interests = '{}'
   AND product_interest IS NOT NULL
   AND btrim(product_interest) <> '';

-- Structural guarantees, so that even a direct SQL write cannot produce a shape the
-- Zoho payload builder would send and Zoho would reject with INVALID_DATA.
--
-- ORDER IS DELIBERATELY NOT NORMALISED. The first element is the product that resolves
-- the single Deal a Meeting links to (`What_Id` holds one record), and the form records
-- the order the visitor ticked. Sorting here would silently make that choice
-- alphabetical — `Jurnii 360` would win every time.
-- The distinctness test needs `unnest`, and Postgres rejects a subquery inside a CHECK
-- outright ("cannot use subquery in check constraint") — so the whole ALTER failed and
-- this migration could never apply. A CHECK may call a function, so the subquery moves
-- into an IMMUTABLE one. The guarantee is unchanged: cardinality equals the number of
-- DISTINCT elements, i.e. no duplicates.
CREATE OR REPLACE FUNCTION bj_array_is_distinct(arr text[]) RETURNS boolean
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$ SELECT cardinality(arr) = (SELECT count(DISTINCT x) FROM unnest(arr) AS x) $$;

ALTER TABLE booking_journeys
  ADD CONSTRAINT bj_product_interests_clean CHECK (
    array_position(product_interests, NULL) IS NULL
    AND array_position(product_interests, '') IS NULL
    AND cardinality(product_interests) <= 8
    AND bj_array_is_distinct(product_interests)
  );

COMMENT ON COLUMN booking_journeys.product_interests IS
  'Canonical Zoho Product_Interest values, in the order the visitor selected them. '
  'The first element resolves the product Deal. Supersedes product_interest, which is '
  'retained unwritten until a later migration drops it.';

COMMENT ON COLUMN booking_journeys.lead_source IS
  'Exact active Leads.Lead_Source picklist value for this journey, or NULL to use the '
  'configured ZOHO_LEAD_SOURCE default. Only set for internal-booking placements.';
