// Pure product-mapping helpers shared by the Zoho util and the page-2 endpoint.
// Kept dependency-free so it is trivially unit-testable offline.

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

// Given a list of Deal records for an Account and a canonical product name,
// pick the single open Deal for that product. Pure — the network fetch lives in
// zoho.resolveProductDeal. Returns { status: 'one'|'none'|'many', deal, count }.
function pickProductDeal(deals, canonicalProductName) {
  if (!Array.isArray(deals) || !canonicalProductName) return { status: 'none', deal: null, count: 0 };
  const wantKey = normalizeProductKey(canonicalProductName);
  const matches = deals.filter(d => {
    if ((d.Opportunity_State || '') === 'Lost') return false;
    const dpName = (d.Deal_Product && d.Deal_Product.name) ? d.Deal_Product.name : '';
    const dpKey = d.Deal_Product_Key || '';
    return normalizeProductKey(dpName) === wantKey || (dpKey && normalizeProductKey(dpKey) === wantKey);
  });
  if (matches.length === 1) return { status: 'one', deal: matches[0], count: 1 };
  if (matches.length === 0) return { status: 'none', deal: null, count: 0 };
  return { status: 'many', deal: null, count: matches.length };
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
 * `Job_Title`: the visitor's raw free-text title is written to a dedicated text
 *   field (`rawTitleField`, default `Job_Title_Raw`) — NOT the `Job_Title`
 *   picklist (which would pollute the governed 155-value list). A governed
 *   Deluge mapping populates the canonical `Job_Title` picklist + Contact role
 *   from `Job_Title_Raw`. An unknown title therefore never blocks conversion.
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
  mergeMultiSelect,
  pickProductDeal,
  validateLeadEnrichment,
  KNOWN_COUNTRIES,
  PRODUCT_CANONICAL
};
