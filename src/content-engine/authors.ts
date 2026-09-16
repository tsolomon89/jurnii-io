/** Canonical library byline portraits and job titles, keyed by lowercase name. */

export const AUTHOR_PORTRAITS: Record<string, string> = {
  'fraser dunk': '/assets/library/authors/fraser-dunk.png',
  'tristan dexter': '/assets/library/authors/tristan-dexter.png',
  'mitch vidler': '/assets/library/authors/mitch-vidler.png',
};

export const AUTHOR_ROLES: Record<string, string> = {
  'fraser dunk': 'CEO / Founder',
  'tristan dexter': 'Chief Experience Officer',
  'mitch vidler': 'Chief Operating Officer',
};

export function authorKey(author?: string | null): string {
  return String(author || '')
    .replace(/^["']|["']$/g, '')
    .trim()
    .toLowerCase();
}

export function resolveAuthorImage(author?: string | null, explicit?: string | null): string | undefined {
  if (explicit?.endsWith('/fraser-dunk.jpg')) return AUTHOR_PORTRAITS['fraser dunk'];
  if (explicit) return explicit;
  return AUTHOR_PORTRAITS[authorKey(author)];
}

export function resolveAuthorRole(author?: string | null, explicit?: string | null): string | undefined {
  if (explicit) return explicit;
  return AUTHOR_ROLES[authorKey(author)];
}
