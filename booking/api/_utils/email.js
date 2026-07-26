// Work-email-only intake gate. Rejects free / personal email domains so the
// booking form captures business leads (and reduces spam). The core set mirrors
// the free-mail domains the Deluge automation already treats specially
// (processLead.deluge / processContact.deluge), extended with common consumer
// providers. Extend at runtime via BLOCKED_EMAIL_DOMAINS (comma-separated).

const BASE_BLOCKED = [
  // Deluge free-mail set (keep in sync):
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com',
  // Common consumer variants:
  'googlemail.com', 'live.com', 'live.co.uk', 'msn.com', 'ymail.com',
  'yahoo.co.uk', 'yahoo.co.in', 'yahoo.fr', 'yahoo.de', 'yahoo.es', 'yahoo.it',
  'hotmail.co.uk', 'hotmail.fr', 'hotmail.it', 'hotmail.es', 'outlook.fr', 'outlook.de',
  'protonmail.com', 'proton.me', 'pm.me',
  'gmx.com', 'gmx.de', 'gmx.net', 'gmx.co.uk',
  'mail.com', 'email.com', 'inbox.com',
  'yandex.com', 'yandex.ru',
  'me.com', 'mac.com',
  'zoho.com',
  'fastmail.com', 'hey.com', 'tutanota.com', 'tuta.io',
  // Disposable / throwaway providers:
  'mailinator.com', 'guerrillamail.com', 'sharklasers.com', '10minutemail.com',
  'temp-mail.org', 'trashmail.com', 'yopmail.com', 'getnada.com', 'dispostable.com'
];

function blockedDomains() {
  const extra = (process.env.BLOCKED_EMAIL_DOMAINS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return new Set(BASE_BLOCKED.concat(extra));
}

function emailDomain(email) {
  if (!email || typeof email !== 'string') return '';
  const at = email.lastIndexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).trim().toLowerCase();
}

/**
 * Canonical full-email normalization (trim + lowercase the whole address).
 * Identity resolution keys on exact email match, so every Contact/Lead search
 * and the JWT must use this single normalized form.
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * The business domain of an email, or '' when the domain is a known
 * free/personal/disposable provider. Mirrors the Deluge Account_Key derivation
 * (email domain, excluding the free-mail set) used for Account resolution.
 */
function businessDomain(email) {
  const domain = emailDomain(email);
  if (!domain || domain.indexOf('.') < 0) return '';
  return blockedDomains().has(domain) ? '' : domain;
}

/**
 * True if the email uses a business domain (not a known free/personal/disposable
 * provider). Matching is exact on the full domain; work subdomains such as
 * `mail.acme.com` are accepted because they are not in the blocklist.
 */
function isBusinessEmail(email) {
  const domain = emailDomain(email);
  if (!domain || domain.indexOf('.') < 0) return false;
  return !blockedDomains().has(domain);
}

module.exports = { isBusinessEmail, emailDomain, normalizeEmail, businessDomain, BASE_BLOCKED };
