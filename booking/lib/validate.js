'use strict';

const { normalizePhone, nameForIso2, byIso2 } = require('../config/countries');

/**
 * Field limits and the attribution whitelist (spec §17).
 *
 * Currently there are zero length caps anywhere in the codebase, so an unbounded
 * string reaches both Postgres and Zoho. These are the one place they are declared.
 */
const LIMITS = {
  first_name: 80,
  last_name: 80,
  email: 254,
  company: 200,
  // 120 because that is the live `Job_Title_Raw` field length on BOTH Leads and
  // Contacts (pinned in tests/fixtures/zoho-fields.json under `lengths`). It was 160,
  // so a long title passed validation here and was truncated or rejected by Zoho.
  job_title_raw: 120,
  phone_national_number: 20,
  product_interest: 120,
  source_page: 128,
  form_placement: 128,
  cta_id: 128,
  form_variant: 128,
  utm: 128,
  landing_url: 2048,
  referrer_url: 2048,
  client_timezone: 64,
  client_locale: 32,
  operator_ref: 120,
};

/** The only keys ever accepted into `attribution_extra`. */
const ATTRIBUTION_EXTRA_WHITELIST = [
  'gclid', 'fbclid', 'msclkid', 'ttclid', 'li_fat_id', 'twclid',
];

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'];

/**
 * Attribution values are stripped of any query string or fragment and must match
 * a conservative character class, or they are nulled (§9). A UTM value is a label,
 * not a URL, and a click id that arrives inside one is a per-user identifier that
 * belongs in `attribution_extra` where retention can purge it.
 */
const SAFE_LABEL = /^[A-Za-z0-9._\-/ ]{0,128}$/;

function str(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function truncate(value, max) {
  const s = str(value);
  if (s === null) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function sanitizeLabel(value, max) {
  let s = str(value);
  if (s === null) return null;
  s = s.split('?')[0].split('#')[0];
  if (s.length > (max || LIMITS.utm)) s = s.slice(0, max || LIMITS.utm);
  return SAFE_LABEL.test(s) ? s : null;
}

function sanitizeUrl(value, max) {
  const s = truncate(value, max || LIMITS.landing_url);
  if (s === null) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

function normalizeEmail(value) {
  const s = str(value);
  return s === null ? null : s.toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function isEmail(value) {
  const s = str(value);
  return s !== null && s.length <= LIMITS.email && EMAIL_RE.test(s);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Zoho record ids are long digit strings; never trust them into a URL unchecked. */
const ZOHO_ID_RE = /^[0-9]{6,25}$/;
function isZohoId(value) {
  return typeof value === 'string' && ZOHO_ID_RE.test(value);
}

/**
 * Validate the Page-2 phone triple and re-derive E.164 server-side.
 *
 * The body carries `{countryIso2, dialCode, nationalNumber}` and the server
 * re-derives `phone_e164`, rejecting a disagreement with
 * `400 {reason:'country_dial_mismatch'}` (§10). The client sends its own derived
 * `e164` too; it is never trusted, only compared.
 */
function validatePhone({ countryIso2, dialCode, nationalNumber }) {
  const country = byIso2(countryIso2);
  if (!country) return { ok: false, reason: 'country_unknown' };
  const national = truncate(nationalNumber, LIMITS.phone_national_number);
  const result = normalizePhone({ iso2: country.iso2, dialCode, nationalNumber: national });
  if (!result.ok) return result;
  return {
    ok: true,
    country_iso2: country.iso2,
    country_name: nameForIso2(country.iso2),
    phone_dial_code: result.dialCode,
    phone_national_number: result.nationalNumber,
    phone_e164: result.e164,
  };
}

/** Collect and sanitise the attribution set. Absent keys become null, never ''. */
function sanitizeAttribution(body) {
  const b = body || {};
  const out = {
    landing_url: sanitizeUrl(b.landing_url || b.landingUrl, LIMITS.landing_url),
    referrer_url: sanitizeUrl(b.referrer_url || b.referrerUrl, LIMITS.referrer_url),
    source_page: sanitizeLabel(b.source_page || b.sourcePage, LIMITS.source_page),
    form_placement: sanitizeLabel(b.form_placement || b.formPlacement, LIMITS.form_placement),
    cta_id: sanitizeLabel(b.cta_id || b.ctaId, LIMITS.cta_id),
    form_variant: sanitizeLabel(b.form_variant || b.formVariant, LIMITS.form_variant),
    client_timezone: sanitizeLabel(b.client_timezone || b.clientTimezone, LIMITS.client_timezone),
    client_locale: sanitizeLabel(b.client_locale || b.clientLocale, LIMITS.client_locale),
  };
  for (const k of UTM_KEYS) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[k] = sanitizeLabel(b[k] !== undefined ? b[k] : b[camel], LIMITS.utm);
  }
  const extra = {};
  const src = b.attribution_extra || b.attributionExtra || b;
  for (const key of ATTRIBUTION_EXTRA_WHITELIST) {
    const v = sanitizeLabel(src[key], LIMITS.utm);
    if (v !== null) extra[key] = v;
  }
  out.attribution_extra = extra;
  return out;
}

module.exports = {
  LIMITS,
  ATTRIBUTION_EXTRA_WHITELIST,
  UTM_KEYS,
  SAFE_LABEL,
  str,
  truncate,
  sanitizeLabel,
  sanitizeUrl,
  normalizeEmail,
  isEmail,
  isUuid,
  isZohoId,
  validatePhone,
  sanitizeAttribution,
};
