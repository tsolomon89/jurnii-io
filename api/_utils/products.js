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
 * Builds the ONE page-2 Lead enrichment payload. Picklist fields are validated
 * BEFORE the terminal (conversion-triggering) update — there is no reduced second
 * write. `Job_Title` is written only if it exactly matches an approved allowlist
 * (env-provided, no fuzzy matching); otherwise it is left blank and processLead's
 * title dictionaries drive Contact_Role1. `Country` is written only if it is a
 * known deterministic value. `Product_Interest` carries the canonical product.
 */
function buildLeadEnrichment({ company, jobTitle, phone, country, product, allowedTitles }) {
  const rec = { Company: company };
  if (phone) rec.Phone = phone;
  if (product) rec.Product_Interest = [product];
  if (country && KNOWN_COUNTRIES.has(country)) rec.Country = country;
  if (jobTitle && Array.isArray(allowedTitles) && allowedTitles.includes(jobTitle)) {
    rec.Job_Title = jobTitle;
  }
  return rec;
}

module.exports = {
  normalizeProductKey,
  canonicalProduct,
  pickProductDeal,
  buildLeadEnrichment,
  KNOWN_COUNTRIES,
  PRODUCT_CANONICAL
};
