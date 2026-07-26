// Account resolution for the Contact path.
//
// Contacts carry company only via the Account_Name lookup (there is no Company
// field), so the website must resolve/link the correct Account BEFORE firing
// reconciliation — otherwise processContact would create an Account named after
// the person (processContact.deluge:106,119). This mirrors the canonical
// precedence in processLead.deluge:259-354 (Account_Key -> Website domain ->
// Account_Name=company -> create) and ADDS the multi-candidate Manual Review
// guard that no existing Deluge resolver implements. Deluge stays the sole owner
// of Deals / Quotes / rollup — this only resolves Account *identity*.

const zoho = require('./zoho');
const { businessDomain } = require('./email');

// Strip the characters the Deluge account-key normalizer removes, then lowercase.
function normalizeCompanyKey(company) {
  return String(company || '').replace(/[()\:,]/g, '').trim().toLowerCase();
}

// The bare domain of an Account's Website (scheme + www stripped, path removed).
function websiteDomain(website) {
  const w = String(website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  const cut = w.indexOf('/');
  return (cut >= 0 ? w.slice(0, cut) : w).trim();
}

function uniqueIds(records) {
  const ids = [];
  const seen = new Set();
  for (const r of (records || [])) {
    if (r && r.id && !seen.has(r.id)) { seen.add(r.id); ids.push(r.id); }
  }
  return ids;
}

/**
 * Resolves the canonical Account for a Contact-path enrichment.
 *
 * Returns exactly one of:
 *   { status: 'reuse',    accountId }   // an existing Account (established or resolved)
 *   { status: 'created',  accountId }   // a new Account, named after the COMPANY
 *   { status: 'conflict' }              // established Account_Name conflicts with submitted company/domain
 *   { status: 'ambiguous' }             // >1 distinct candidate on the Website/name fallback tiers
 *
 * `contactAccountId` is the Contact's existing Account_Name lookup id (or null).
 * `deps` is injectable for tests (defaults to the live zoho helpers).
 */
async function resolveAccountForContact({ contactId, contactAccountId, email, company }, deps = zoho) {
  const domain = businessDomain(email);            // '' for free/personal domains
  const companyKey = normalizeCompanyKey(company);

  // 1) An established Account is authoritative — but check for a material conflict.
  if (contactAccountId) {
    if (!domain) return { status: 'reuse', accountId: contactAccountId };
    const acct = await deps.getAccount(contactAccountId);
    if (!acct) return { status: 'reuse', accountId: contactAccountId };
    const keyMatch = acct.Account_Key && String(acct.Account_Key).toLowerCase() === domain;
    const siteMatch = websiteDomain(acct.Website) === domain;
    const nameMatch = companyKey && normalizeCompanyKey(acct.Account_Name) === companyKey;
    if (keyMatch || siteMatch || nameMatch) return { status: 'reuse', accountId: contactAccountId };
    return { status: 'conflict' };
  }

  // 2) No Account on the Contact — resolve a unique canonical, else create.
  const accountKey = domain || companyKey || `unknown::${contactId || ''}`;

  // Tier 1: Account_Key (UNIQUE -> 0 or 1).
  const byKey = await deps.searchAccountsByKey(accountKey);
  if (byKey.length >= 1) return { status: 'reuse', accountId: byKey[0].id };

  // Tiers 2-3: Website domain, then Account_Name = company. >1 distinct -> Manual Review.
  const fallback = [];
  if (domain) fallback.push(...(await deps.searchAccountsByWebsite(domain)));
  if (company) fallback.push(...(await deps.searchAccountsByName(company)));
  const ids = uniqueIds(fallback);
  if (ids.length > 1) return { status: 'ambiguous' };
  if (ids.length === 1) return { status: 'reuse', accountId: ids[0] };

  // None exist -> create with the submitted COMPANY as the name (never the person).
  const data = { Account_Key: accountKey, Account_Name: company };
  if (domain) data.Website = domain;
  const accountId = await deps.createAccount(data);
  return { status: 'created', accountId };
}

module.exports = { resolveAccountForContact, normalizeCompanyKey, websiteDomain };
