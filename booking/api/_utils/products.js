// Pure product-, title- and lead-source-mapping helpers shared by the Zoho util and
// the page-2 endpoint. Kept dependency-free (bar the generated picklist snapshot) so
// it is trivially unit-testable offline.

const PICKLISTS = require('../../config/zoho-picklists');

// Normalizes a product name to the canonical key form used by the Deluge
// automation (lowercase; runs of non-alphanumerics -> single underscore).
// e.g. "Jurnii UX" -> "jurnii_ux". Read-side matching only — never used to
// create Deals (that is owned by Deluge).
function normalizeProductKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Form value -> canonical Zoho Product name. Unknown values and "Not sure yet"
// resolve to null (never fabricate a product).
const PRODUCT_CANONICAL = {
  'jurnii ux': 'Jurnii UX',
  'jurnii 360': 'Jurnii 360',
  'cortex / growth': 'Jurnii Cortex',
  'jurnii cortex': 'Jurnii Cortex',
  'partnership': 'Partnership'
};

function canonicalProduct(v) {
  if (!v) return null;
  const key = String(v).trim().toLowerCase();
  if (key === '' || key === 'not sure yet') return null;
  return PRODUCT_CANONICAL[key] || null;
}

/**
 * Canonicalize the page-2 product selection.
 *
 * Accepts the array the current form sends OR a bare scalar, so a browser holding a
 * snapshot from the previous single-select build still succeeds. Blanks are stripped,
 * values are deduplicated on the CANONICAL form (so `jurnii ux` and `Jurnii UX` collapse
 * to one), and anything unrecognised is collected rather than silently dropped — a
 * label like "Jurnii UX — User Experience Benchmarking" is not a canonical key, so it
 * lands in `rejected` and the endpoint 400s instead of writing marketing copy to the CRM.
 *
 * `Not sure yet` is the previous build's "no product" sentinel and resolves to no
 * product rather than to an error, because that is what the visitor meant.
 */
function canonicalProductList(input) {
  const raw = Array.isArray(input)
    ? input
    : (input === undefined || input === null || input === '' ? [] : [input]);

  const products = [];
  const rejected = [];
  const seen = new Set();

  for (const v of raw) {
    // A null/undefined entry is a blank, not a wrong answer — a checkbox group can
    // legitimately serialise holes. An object, array or boolean is a malformed body
    // and is rejected rather than coerced into a plausible-looking string.
    if (v === null || v === undefined) continue;
    if (typeof v !== 'string' && typeof v !== 'number') { rejected.push(v); continue; }
    const s = String(v).trim();
    if (!s) continue;                                     // blanks are not an error
    if (s.toLowerCase() === 'not sure yet') continue;      // explicit "no product"
    const c = canonicalProduct(s);
    if (c === null) { rejected.push(s); continue; }
    if (seen.has(c)) continue;
    seen.add(c);
    products.push(c);
  }
  return { ok: rejected.length === 0, products, rejected };
}

/**
 * The product list of a journey row, tolerating both column shapes.
 *
 * Migration 0004 added `product_interests text[]` and retained the legacy scalar
 * `product_interest`, which is no longer written. Rows persisted before the migration
 * carry only the scalar, so both are read here and nowhere else.
 */
function productList(journey) {
  const j = journey || {};
  if (Array.isArray(j.product_interests) && j.product_interests.length) {
    return j.product_interests.filter(Boolean);
  }
  return j.product_interest ? [j.product_interest] : [];
}

/**
 * The ONE product used where a scalar is structurally required — resolving the single
 * product Deal a Meeting is linked to (`What_Id` holds one record).
 *
 * First-selected, which is why the form preserves tick order. With one product this is
 * identical to the pre-multi-select behaviour, so Deal resolution is unchanged; with
 * several it is a case that could not previously arise.
 */
function primaryProduct(journey) {
  return productList(journey)[0] || null;
}

/**
 * The authored PRESENTATION and ANCHOR order.
 *
 * This is NOT a sort of `product_interests`. Migration 0004 states the case plainly:
 * the stored order is the order the visitor ticked, sorting it would silently make
 * that choice alphabetical, and `product_interests[0]` is load-bearing for
 * `primaryProduct`. This constant lives entirely in the presentation layer.
 *
 * Partnership is LAST, and that placement IS the "prefer a B2B Deal over a Partnership
 * Deal" rule — `anchorProduct` takes the first entry, so there is no second predicate
 * to keep in sync with this one.
 */
const PRODUCT_ORDER = Object.freeze(['Jurnii UX', 'Jurnii 360', 'Jurnii Cortex', 'Partnership']);

/**
 * A journey's products, canonicalized and sorted into `PRODUCT_ORDER`.
 *
 * Every value goes through `canonicalProduct`, which maps `Not sure yet` — and any
 * legacy input spelling — to null, so neither can reach a meeting title or a Zoho
 * payload. An unrecognised value is DROPPED rather than rendered: page 2 already 400s
 * on one, so anything else in the column is legacy data, not a product.
 */
function orderedProducts(journey) {
  const seen = new Set();
  for (const raw of productList(journey)) {
    const c = canonicalProduct(raw);
    if (c) seen.add(c);
  }
  return PRODUCT_ORDER.filter((p) => seen.has(p));
}

/**
 * The ONE product that resolves the Deal a Meeting anchors to (`What_Id` holds one
 * record), chosen in canonical order rather than tick order.
 *
 * For a single-product journey this is identical to `primaryProduct` whatever the
 * product is, so single-product bookings are unaffected by construction.
 */
function anchorProduct(journey) {
  return orderedProducts(journey)[0] || null;
}

/**
 * The visitor's title as a GOVERNED `Job_Title` picklist value, or null.
 *
 * The live picklist is a curated 154-value subset of the 415 persona titles, so most
 * titles legitimately have no governed form. Returning null means "send `Job_Title_Raw`
 * only": an unknown value in a picklist field makes the ENTIRE update `INVALID_DATA`,
 * which `classify()` treats as terminal, so one unrecognised title would otherwise void
 * the phone, company and consent travelling in the same map.
 *
 * Matching is case-insensitive and returns ZOHO'S casing, never the visitor's.
 *
 * The comparison list is generated from live metadata by `zoho-field-snapshot.js`. It is
 * never hand-maintained, and nothing here may add a value to it — this codebase creates
 * no Zoho metadata (`booking/docs/implementation-notes.md`).
 */
function governedTitle(raw, module) {
  return PICKLISTS.match(module || 'Leads', 'Job_Title', raw);
}

/**
 * An exact ACTIVE `Lead_Source` picklist value, or null.
 *
 * Case-insensitive so an operator-supplied value still lands, but the DISPLAY label is
 * deliberately not accepted: five live options display differently from their stored
 * value ("Import" is `Advertisement`, "Event" is `Trade Show`, "X (Twitter)" is
 * `Twitter`), and accepting a label would write a value Zoho rejects.
 */
function canonicalLeadSource(value, module) {
  return PICKLISTS.match(module || 'Leads', 'Lead_Source', value);
}

/**
 * Deduplicated union of an existing multi-select value with additional value(s),
 * preserving order (existing first). Accepts arrays or scalars; ignores blanks.
 */
function mergeMultiSelect(existing, add) {
  const out = [];
  const seen = new Set();
  const push = (v) => {
    if (v == null) return;
    const s = String(v).trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };
  (Array.isArray(existing) ? existing : (existing ? [existing] : [])).forEach(push);
  (Array.isArray(add) ? add : (add ? [add] : [])).forEach(push);
  return out;
}

// Given a list of Deal records for an Account, pick the Account's single open Deal.
// Pure — the network fetch lives in zoho.resolveProductDeal.
// Returns { status: 'one'|'none'|'many', deal, count, candidates }.
//
// WORK ITEM 4.1. This used to select by Product identity, matching the canonical product
// name against `Deal_Product.name` or `Deal_Product_Key`. Both of those fields are
// scheduled for retirement and carry no value under the corrected model, where a Product
// is a Quote under the one Deal rather than a Deal of its own. Selecting on a retiring
// field would have started returning 'none' for everything the moment the field was
// cleared — and reading a DELETED api_name is the failure mode that voids a whole
// update map, so the reader has to go before the field does.
//
// Lost Deals are still excluded: a churned relationship is not the Account's live Deal.
// `canonicalProductName` is accepted and ignored, matching zoho.resolveProductDeal.
function pickProductDeal(deals, canonicalProductName) {
  if (!Array.isArray(deals)) return { status: 'none', deal: null, count: 0, candidates: [] };
  const open = deals.filter(d => (d.Opportunity_State || '') !== 'Lost');
  const candidates = open.length ? open : deals;
  const ids = candidates.map(d => d.id).filter(Boolean);
  if (candidates.length === 1) return { status: 'one', deal: candidates[0], count: 1, candidates: ids };
  if (candidates.length === 0) return { status: 'none', deal: null, count: 0, candidates: [] };
  return { status: 'many', deal: null, count: candidates.length, candidates: ids };
}

// Countries the form can produce (from the phone dial-code dropdown). Only these
// deterministic values are written to the Lead's Country picklist.
const KNOWN_COUNTRIES = new Set([
  'United Kingdom', 'United States', 'Malta', 'Gibraltar', 'Sweden', 'Germany',
  'Spain', 'Ireland', 'Australia', 'Curaçao', 'Costa Rica'
]);

/**
 * Validates + builds the ONE page-2 Lead enrichment payload. Returns an EXPLICIT
 * result — never a silent drop. The page-2 handler checks `.ok` BEFORE `updateLead`.
 *
 *   { ok: true, record }           -> send this exact record (one update)
 *   { ok: false, field, reason }   -> do NOT update; Manual Review; Lead unconverted
 *
 * `Job_Title`: the visitor's title is written verbatim to `rawTitleField` (default
 *   `Job_Title_Raw`). The governed picklist is populated separately, and only on an
 *   exact match — see `governedTitle` above and `dataLoadPayload` in
 *   `workflows/zoho-ops.js`. An unrecognised title therefore never blocks conversion.
 *
 *   CORRECTED 2026-08-08: this comment previously claimed "a governed Deluge mapping
 *   populates the canonical Job_Title picklist + Contact role from Job_Title_Raw". No
 *   such mapping existed. `processLead.deluge` gates role resolution on the `Job_Title`
 *   PICKLIST, which nothing here ever wrote, so every booking-sourced Lead was left with
 *   a blank `Contact_Role1`. Fixed on both sides: Node now writes the governed picklist
 *   when the title is a live value, and the Deluge falls back to `Job_Title_Raw` when it
 *   is not.
 * `Country`: only a recognized value is written; an unrecognized non-empty
 *   country fails validation rather than being silently omitted (every value the
 *   form can produce is recognized).
 */
function validateLeadEnrichment({ company, jobTitle, phone, country, product, rawTitleField, knownCountries, includeCompany, existingProducts } = {}) {
  const countries = knownCountries || KNOWN_COUNTRIES;
  const rawField = rawTitleField || 'Job_Title_Raw';
  const withCompany = includeCompany !== false; // default true (Lead path); false on the Contact path

  const record = {};
  // `Company` is a Lead-module text field; Contacts carry company via the
  // Account_Name lookup (resolved separately), so the Contact path omits it.
  if (withCompany) record.Company = company;
  if (phone) record.Phone = phone;
  // Product_Interest is multi-select and REPLACED by default on update — build a
  // deduplicated union with any existing values so a returning record's other
  // product interests are never dropped.
  if (product) record.Product_Interest = mergeMultiSelect(existingProducts, product);

  const jt = jobTitle ? String(jobTitle).trim() : '';
  if (jt && rawField) record[rawField] = jt; // raw text -> Job_Title_Raw, never the picklist

  const co = country ? String(country).trim() : '';
  if (co) {
    if (!countries.has(co)) {
      return { ok: false, field: 'country', reason: 'country_not_recognized' };
    }
    record.Country = co;
  }

  return { ok: true, record };
}

module.exports = {
  normalizeProductKey,
  canonicalProduct,
  canonicalProductList,
  productList,
  primaryProduct,
  orderedProducts,
  anchorProduct,
  governedTitle,
  canonicalLeadSource,
  mergeMultiSelect,
  pickProductDeal,
  validateLeadEnrichment,
  KNOWN_COUNTRIES,
  PRODUCT_CANONICAL,
  PRODUCT_ORDER
};
