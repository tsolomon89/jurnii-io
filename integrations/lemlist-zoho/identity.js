'use strict';

/**
 * Canonicalisation and identity primitives. PURE — no network, no environment,
 * no I/O of any kind, so the whole identity contract is testable offline against
 * fixtures and against real values pulled from the live org.
 *
 * Everything here exists because the live CRM data is NOT canonical. Real stored
 * `Contacts.Personal_Linkedin` values in this org include:
 *
 *   http://www.linkedin.com/in/alexandrakorzhova
 *   https://www.linkedin.com/in/claus-retschitzegger-1ab0221a/
 *   https://www.linkedin.com/in/alan-evans-250850309/?skipRedirect=true
 *
 * Scheme, `www.`, trailing slash and query string all vary, so an exact-string
 * search would miss almost every time. Matching therefore always has two steps:
 * a broad COQL `like` probe to GENERATE candidates, then an exact comparison of
 * canonical forms here in Node to DECIDE. The decision never happens in the
 * query, because `like` cannot distinguish `john-smith` from
 * `john-smith-4a92b117` — and the live data proves that suffixed shape is the
 * common one.
 */

/** Lemlist activity ids. Validated before the value reaches any query or Subject. */
const ACTIVITY_ID = /^act_[A-Za-z0-9]{6,64}$/;

/**
 * Local-parts that identify a mailbox, not a person. A LinkedIn message logged
 * against a shared inbox would attribute outreach to whoever happens to own that
 * Contact record, so these are never identity.
 */
const ROLE_MAILBOXES = new Set([
  'info', 'sales', 'contact', 'contacts', 'hello', 'hi', 'admin', 'support',
  'office', 'team', 'marketing', 'press', 'media', 'jobs', 'careers', 'hr',
  'billing', 'accounts', 'accounting', 'invoices', 'finance', 'noreply',
  'no-reply', 'donotreply', 'help', 'helpdesk', 'enquiries', 'inquiries',
  'mail', 'post', 'general', 'partners', 'partnerships', 'legal', 'privacy',
  'security', 'abuse', 'webmaster', 'postmaster',
]);

/**
 * The ONLY `lead.variables` keys that are read, by exact name.
 *
 * That bag is an open key/value store filled in by whoever built the campaign.
 * Lemlist's own API documentation contains the example `"Company name": "John
 * Doe"` — a person's name under a company-shaped key — so iterating it, or
 * fuzzy-matching key names, would actively invite mis-attribution. Reading a
 * fixed allow-list by exact name is the whole defence.
 */
const LEAD_VARIABLE_KEYS = [
  'firstName', 'lastName', 'email', 'companyName', 'companyDomain',
  'jobTitle', 'industry', 'linkedinUrl', 'companyLinkedinUrl',
];

/** Read one allow-listed variable. Anything else in the bag is invisible here. */
function leadVariable(bag, key) {
  if (!bag || typeof bag !== 'object') return '';
  if (!LEAD_VARIABLE_KEYS.includes(key)) return '';
  if (!Object.prototype.hasOwnProperty.call(bag, key)) return '';
  const v = bag[key];
  if (typeof v !== 'string') return '';
  return v.trim();
}

// ---------------------------------------------------------------------------
// COQL value guards — reject, never escape
// ---------------------------------------------------------------------------

/**
 * A COQL string literal, or a throw.
 *
 * There is no COQL anywhere else in this repo and therefore no escaping
 * convention to inherit. Rather than invent one, this REJECTS: every value
 * interpolated into a query here is the output of a canonicaliser above, so a
 * value carrying a quote, a backslash or a control character is a
 * canonicaliser bug. Escaping it would hide the bug and put attacker-adjacent
 * third-party text into a query; refusing it surfaces the bug and skips the
 * activity, which tomorrow's run retries.
 */
function coqlLiteral(value) {
  const s = String(value == null ? '' : value);
  if (!s) throw new Error('coql_value_empty');
  if (s.length > 200) throw new Error('coql_value_too_long');
  // `'` closes the literal; `\` could escape the closing quote; control
  // characters and the COQL structural characters have no business in a
  // canonicalised value.
  if (/['"\\\r\n\t\0()]/.test(s)) throw new Error('coql_value_unsafe');
  return s;
}

/**
 * The fragment interpolated into a `like '%…%'` probe, or a throw.
 *
 * Stricter than `coqlLiteral` for two reasons: `%` and `_` are LIKE wildcards,
 * so allowing them would silently widen the probe; and a probe only has to be
 * *sufficient to generate candidates*, since the decision is the canonical
 * comparison in Node. So it is restricted to the characters a LinkedIn slug is
 * actually built from.
 */
function coqlLikeFragment(value) {
  const s = String(value == null ? '' : value);
  if (!/^[a-z0-9-]{3,120}$/.test(s)) throw new Error('coql_fragment_unsafe');
  return s;
}

/**
 * The ASCII-safe leading run of a slug, for use as a `like` probe fragment.
 *
 * Internationalised slugs exist in this org — one stored value is
 * `richard-nebesk%c3%bd-8b545310b`, which decodes to a non-ASCII slug. Sending
 * that through a query would either be rejected by `coqlLikeFragment` (skipping
 * a Contact we could have matched) or require escaping rules for unicode in
 * COQL that are not documented. Probing on the ASCII prefix instead returns a
 * superset of candidates, and the exact canonical comparison in Node then picks
 * the right one — so accuracy is unchanged and the query stays trivially safe.
 *
 * Returns `null` when the prefix is too short to be a usefully selective probe.
 */
function slugProbeFragment(slug) {
  if (!slug) return null;
  const m = /^[a-z0-9-]{3,120}/.exec(slug);
  return m ? m[0] : null;
}

// ---------------------------------------------------------------------------
// LinkedIn URLs
// ---------------------------------------------------------------------------

/** Parse a possibly scheme-less URL without throwing. */
function parseUrl(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme);
  } catch (_) {
    return null;
  }
}

/** Is this host LinkedIn, allowing country subdomains such as `uk.linkedin.com`? */
function isLinkedinHost(host) {
  const h = String(host || '').toLowerCase().replace(/^www\./, '');
  return h === 'linkedin.com' || h.endsWith('.linkedin.com');
}

/**
 * Extract the Nth path segment after a marker, decoded once and lowercased.
 * Returns '' when the marker is absent or the segment is empty.
 */
function segmentAfter(pathname, marker) {
  const parts = String(pathname || '').split('/').filter(Boolean);
  const at = parts.findIndex((p) => p.toLowerCase() === marker);
  if (at < 0 || at + 1 >= parts.length) return '';
  let seg = parts[at + 1];
  try { seg = decodeURIComponent(seg); } catch (_) { /* keep the raw form */ }
  return seg.trim().toLowerCase();
}

/**
 * The canonical personal LinkedIn slug, or `null`.
 *
 *   https://www.linkedin.com/in/tuf-gavaz/            -> 'tuf-gavaz'
 *   http://www.linkedin.com/in/alexandrakorzhova      -> 'alexandrakorzhova'
 *   .../in/alan-evans-250850309/?skipRedirect=true    -> 'alan-evans-250850309'
 *   https://www.linkedin.com/company/acme/            -> null
 *   https://www.linkedin.com/sales/lead/ABC,NAME,xyz  -> null
 *
 * A Sales Navigator id is deliberately rejected rather than salvaged: it is not
 * a public profile slug, so it can never equal a stored `/in/` value, and
 * accepting it would only produce confident non-matches.
 */
function canonicalPersonalSlug(value) {
  const url = parseUrl(value);
  if (!url || !isLinkedinHost(url.hostname)) return null;
  const path = url.pathname.toLowerCase();
  // Sales Navigator and non-person profile spaces are not personal slugs.
  if (path.startsWith('/sales/')) return null;
  const slug = segmentAfter(url.pathname, 'in');
  if (!slug) return null;
  // A slug is one segment. Anything with a separator left in it is a parse miss.
  if (slug.includes('/') || slug.includes('?')) return null;
  return slug;
}

/**
 * The canonical company LinkedIn slug, or `null`.
 *
 *   https://www.linkedin.com/company/dafabet-web/ -> 'dafabet-web'
 *   https://www.linkedin.com/in/tuf-gavaz/        -> null
 */
function canonicalCompanySlug(value) {
  const url = parseUrl(value);
  if (!url || !isLinkedinHost(url.hostname)) return null;
  if (url.pathname.toLowerCase().startsWith('/sales/')) return null;
  const slug = segmentAfter(url.pathname, 'company');
  if (!slug || slug.includes('/') || slug.includes('?')) return null;
  return slug;
}

// ---------------------------------------------------------------------------
// Company domain and name
// ---------------------------------------------------------------------------

/**
 * A bare, lowercased company domain, or `null`.
 *
 *   https://www.example.com/path -> 'example.com'
 *   WWW.EXAMPLE.COM              -> 'example.com'
 *   example.com:8443             -> 'example.com'
 *
 * This mirrors STEP 1 ONLY of `zoho-functions/v6/activity/_util_deriveAccountKey.deluge`
 * (website -> domain). The divergence from the rest of that function is
 * deliberate and load-bearing:
 *
 *   step 2 (corporate email domain)  -> supplied by `businessDomain()` in
 *                                       booking/api/_utils/email.js
 *   step 3 (normalised company name) -> NEVER used to identify an Account here,
 *                                       only to VETO a create
 *   step 4 (`unknown::<id>`)         -> never; it would mint a speculative key
 *
 * Node's job is to MATCH an existing Account_Key, not to invent a new namespace.
 */
function canonicalCompanyDomain(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return null;
  const url = parseUrl(raw);
  if (!url) return null;
  let host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  if (!host || !host.includes('.')) return null;
  // A bare label with no dot is a hostname, not a company domain.
  if (/[^a-z0-9.-]/.test(host)) return null;
  return host;
}

/**
 * The normalised company-name form of an Account key.
 *
 * Mirrors step 3 of `_util_deriveAccountKey.deluge` exactly — strip `( ) : ,`,
 * trim, lowercase, truncate — because live Accounts created without a Website
 * carry precisely this shape (`"finnish monopoly"`, `"ferrara solutions"`,
 * `"xcaliber gaming limited"`).
 *
 * ⚠ This value may be used to *forbid* an Account create and to *write*
 * `Account_Key` on a Website-less create. It is NEVER used to select an
 * existing Account. See `zoho.js`.
 */
function normalisedCompanyName(value) {
  const s = String(value == null ? '' : value).replace(/[()\:,]/g, '').trim().toLowerCase();
  return s.length > 200 ? s.slice(0, 200) : s;
}

/** The `Account_Name`-shaped veto probe: the same character strip, case kept. */
function strippedCompanyName(value) {
  return String(value == null ? '' : value).replace(/[()\:,]/g, '').trim();
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/** True when the local-part names a shared mailbox rather than a person. */
function isRoleMailbox(email) {
  const s = String(email == null ? '' : email).trim().toLowerCase();
  const at = s.lastIndexOf('@');
  if (at <= 0) return false;
  const local = s.slice(0, at).split('+')[0];
  return ROLE_MAILBOXES.has(local);
}

/**
 * The surname to create a Contact with, or `null`.
 *
 * `Last_Name` is the ONLY `system_mandatory` field on Contacts in this org
 * (verified across all 107 fields), so a create without one is refused by Zoho.
 * It is a PRECONDITION, never something to synthesise: deriving a surname from
 * the email local-part, from the company name, by splitting `fullName`, or from
 * a placeholder would write a fabricated person into the system of record. When
 * Lemlist has no surname the activity is skipped and tomorrow's run retries it,
 * which gives a human the chance to fix the Lemlist record instead.
 */
function lastNameFor(lead) {
  const explicit = leadVariable(lead && lead.variables, 'lastName');
  if (explicit) return explicit;
  return null;
}

function firstNameFor(lead) {
  return leadVariable(lead && lead.variables, 'firstName') || null;
}

// ---------------------------------------------------------------------------
// Resolution
//
// These take their queries as INJECTED functions, so this module still performs
// no I/O of its own and the whole decision procedure is testable against plain
// arrays. They return a verdict; they never write anything.
// ---------------------------------------------------------------------------

const { normalizeEmail } = require('../../booking/api/_utils/email');

function uniqueIds(rows) {
  return [...new Set(rows.map((r) => String(r.id)))];
}

/**
 * Resolve the Zoho Contact for a Lemlist person.
 *
 * BOTH available signals are evaluated, then reconciled — the email rung is not
 * skipped just because the LinkedIn rung hit. A short-circuit ladder cannot see
 * the conflict it exists to surface: if LinkedIn resolves to Contact A and the
 * email resolves to Contact B, that is an identity conflict and the only safe
 * outcome is to do nothing. Evaluating both costs one extra COQL query on the
 * activities that need identity work at all, which at this volume is free.
 *
 * Verdicts:
 *   { status: 'one',      contactId, accountId, matchedOn }
 *   { status: 'none' }                              -> a create may be considered
 *   { status: 'conflict', candidateIds, reason }     -> do nothing, log both ids
 *
 * A query that THROWS propagates. An absence must be a proven absence, because
 * absence is what authorises creating a person in the system of record.
 */
async function resolveContact({ linkedinUrl, email }, deps) {
  const emailNorm = normalizeEmail(email || '');
  const slug = canonicalPersonalSlug(linkedinUrl);

  let byLinkedin = [];
  if (slug) {
    const fragment = slugProbeFragment(slug);
    if (fragment) {
      const rows = await deps.findContactsByLinkedinFragment(fragment);
      // The probe is a candidate generator; THIS is the decision.
      byLinkedin = rows.filter((r) => canonicalPersonalSlug(r.Personal_Linkedin) === slug);
    }
  }

  let byEmail = [];
  const emailUsable = Boolean(emailNorm) && !isRoleMailbox(emailNorm);
  if (emailUsable) {
    const rows = await deps.findContactsByEmail(emailNorm);
    // Belt and braces: the query is already an exact `Email =` predicate, but
    // re-checking in Node means `Secondary_Email` can never become identity even
    // if the query is ever changed to a broader one.
    byEmail = rows.filter((r) => normalizeEmail(r.Email || '') === emailNorm);
  }

  const linkedinIds = uniqueIds(byLinkedin);
  const emailIds = uniqueIds(byEmail);

  if (linkedinIds.length > 1) {
    return { status: 'conflict', reason: 'linkedin_matched_multiple', candidateIds: linkedinIds };
  }
  if (emailIds.length > 1) {
    return { status: 'conflict', reason: 'email_matched_multiple', candidateIds: emailIds };
  }
  if (linkedinIds.length === 1 && emailIds.length === 1 && linkedinIds[0] !== emailIds[0]) {
    return {
      status: 'conflict',
      reason: 'linkedin_and_email_disagree',
      candidateIds: [linkedinIds[0], emailIds[0]],
    };
  }

  const row = byLinkedin[0] || byEmail[0] || null;
  if (!row) {
    return {
      status: 'none',
      // Why no match, so the run summary can distinguish "nobody like this in
      // the CRM" from "we had nothing to search with".
      reason: slug || emailUsable ? 'no_match'
        : (emailNorm ? 'role_mailbox_only_no_slug' : 'no_identity_signal'),
      hadSlug: Boolean(slug),
      hadUsableEmail: emailUsable,
    };
  }

  return {
    status: 'one',
    contactId: String(row.id),
    accountId: row.Account_Name && row.Account_Name.id ? String(row.Account_Name.id) : null,
    matchedOn: byLinkedin.length ? 'linkedin' : 'email',
  };
}

/**
 * Resolve the Zoho Account for a company. Only called when a Contact must be
 * created — an existing Contact keeps whatever Account it already has.
 *
 * Identity is exact canonical domain, or exact canonical company slug. NEVER
 * company name.
 *
 * `companyLinkedinUrl` is used only when the Lemlist payload already being
 * processed carries it. There is deliberately no company-object traversal: no
 * `GET /companies` hop, no `companyId` chain, no cache. If it is absent,
 * matching is domain-only for that activity, which can only under-match — and
 * an under-match is caught by the create veto rather than producing a wrong
 * Account.
 */
async function resolveAccount({ companyDomain, companyLinkedinUrl }, deps) {
  const domain = canonicalCompanyDomain(companyDomain);
  const slug = canonicalCompanySlug(companyLinkedinUrl);

  let byDomain = [];
  if (domain) {
    // `Website` holds the bare domain in this org, and `Account_Key` mirrors it.
    // Both are probed because an Account can carry one without the other.
    const [byWebsite, byKey] = await Promise.all([
      deps.findAccountsByWebsite(domain),
      deps.findAccountsByKey(domain),
    ]);
    const seen = new Map();
    for (const r of [...byWebsite, ...byKey]) seen.set(String(r.id), r);
    byDomain = [...seen.values()];
  }

  let bySlug = [];
  if (slug) {
    const fragment = slugProbeFragment(slug);
    if (fragment) {
      const rows = await deps.findAccountsByCompanyLinkedinFragment(fragment);
      bySlug = rows.filter((r) => canonicalCompanySlug(r.Company_Linkedin) === slug);
    }
  }

  const domainIds = uniqueIds(byDomain);
  const slugIds = uniqueIds(bySlug);

  if (domainIds.length > 1) {
    return { status: 'conflict', reason: 'domain_matched_multiple', candidateIds: domainIds };
  }
  if (slugIds.length > 1) {
    return { status: 'conflict', reason: 'company_linkedin_matched_multiple', candidateIds: slugIds };
  }
  if (domainIds.length === 1 && slugIds.length === 1 && domainIds[0] !== slugIds[0]) {
    return {
      status: 'conflict',
      reason: 'domain_and_company_linkedin_disagree',
      candidateIds: [domainIds[0], slugIds[0]],
    };
  }

  const row = byDomain[0] || bySlug[0] || null;
  if (!row) return { status: 'none', domain, slug };

  return {
    status: 'one',
    accountId: String(row.id),
    matchedOn: byDomain.length ? 'company_domain' : 'company_linkedin',
    domain,
    slug,
  };
}

/**
 * May an Account be created for this company? The one guard that survives the
 * simplification, because it is the one place a wrong guess does lasting damage.
 *
 * Company name may only FORBID a create, never choose an Account. Before
 * creating, the two name-shaped forms that Deluge itself would search are
 * probed:
 *
 *   Accounts.Account_Name = <companyName minus ( ) : ,>
 *   Accounts.Account_Key  = <companyName lowercased/normalised>
 *
 * If either hits while the domain and slug rungs did not, the create is
 * refused. Two reasons:
 *
 *  1. `Account_Name` is UNIQUE and system_mandatory in this org, so a colliding
 *     create fails outright anyway.
 *  2. `_util_resolveAccount.deluge` (K5/K6) searches every key form and STOPS
 *     WITH A REVIEW when two Accounts match, performing no dependent writes.
 *     So if a company already exists as a name-keyed Account — live examples
 *     include `"finnish monopoly"` and `"xcaliber gaming limited"` — and we
 *     create a second, domain-keyed one, then every future Lead and Contact for
 *     that company resolves ambiguous, permanently. No Account link, no Deal, no
 *     activation. One bad create can jam the commercial graph for that company,
 *     and no retry undoes it.
 */
async function accountCreateAllowed({ companyName }, deps) {
  const name = strippedCompanyName(companyName);
  const key = normalisedCompanyName(companyName);
  if (!name) return { allowed: false, reason: 'missing_company_name', candidateIds: [] };

  const [byName, byKey] = await Promise.all([
    deps.findAccountsByName(name),
    deps.findAccountsByKey(key),
  ]);

  const candidateIds = uniqueIds([...byName, ...byKey]);
  if (candidateIds.length) {
    return { allowed: false, reason: 'account_create_would_fork', candidateIds };
  }
  return { allowed: true, reason: null, candidateIds: [], accountName: name, accountKey: key };
}

module.exports = {
  resolveContact,
  resolveAccount,
  accountCreateAllowed,
  ACTIVITY_ID,
  LEAD_VARIABLE_KEYS,
  ROLE_MAILBOXES,
  leadVariable,
  coqlLiteral,
  coqlLikeFragment,
  slugProbeFragment,
  canonicalPersonalSlug,
  canonicalCompanySlug,
  canonicalCompanyDomain,
  normalisedCompanyName,
  strippedCompanyName,
  isRoleMailbox,
  lastNameFor,
  firstNameFor,
};
