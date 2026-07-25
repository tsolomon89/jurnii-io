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
 * result — it never silently drops a submitted value and then lets the terminal
 * update convert the Lead. The page-2 handler must check `.ok` BEFORE `updateLead`.
 *
 *   { ok: true, record }                          -> send this exact record (one update)
 *   { ok: false, field, reason }                  -> do NOT update; Manual Review; Lead unconverted
 *
 * `Job_Title`:
 *   - mode 'text' (default): the submitted value is passed through to the Lead
 *     (the business requirement — page two carries the job title). If the live
 *     field turns out to be a restricted picklist that rejects it, the single
 *     `updateLead` fails and the handler returns Manual Review (Lead unconverted).
 *   - mode 'picklist': the value MUST be an exact member of `allowedTitles`,
 *     otherwise validation fails (Manual Review) — never a silent drop, and the
 *     allowlist is not optional in this mode.
 * `Country`: must be an exact known value; an unrecognized non-empty country
 *   fails validation rather than being omitted. Blank country is allowed (omitted).
 */
function validateLeadEnrichment({ company, jobTitle, phone, country, product, jobTitleMode, allowedTitles, knownCountries } = {}) {
  const mode = jobTitleMode === 'picklist' ? 'picklist' : 'text';
  const titles = Array.isArray(allowedTitles) ? allowedTitles : [];
  const countries = knownCountries || KNOWN_COUNTRIES;

  const record = { Company: company };
  if (phone) record.Phone = phone;
  if (product) record.Product_Interest = [product];

  const jt = jobTitle ? String(jobTitle).trim() : '';
  if (jt) {
    if (mode === 'picklist' && !titles.includes(jt)) {
      return { ok: false, field: 'jobTitle', reason: 'job_title_not_allowed' };
    }
    record.Job_Title = jt; // free-text default, or an allowlisted picklist value
  }

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
  pickProductDeal,
  validateLeadEnrichment,
  KNOWN_COUNTRIES,
  PRODUCT_CANONICAL
};
