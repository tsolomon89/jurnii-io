/**
 * The page-identity half of the tag layer.
 *
 * WHY THIS EXISTS AT ALL
 *
 * One index.html serves all 165 routes and nothing is server-rendered, so at the moment
 * Google Tag Manager boots in <head> the browser knows nothing about which page it is on
 * — not the title, not the section, not the category. A GA4 tag firing on "All Pages"
 * would therefore report every route in the site as the homepage.
 *
 * So no tag fires on All Pages. Each page pushes `page_context_ready` exactly once, when
 * identity is actually known, and the pageview fires on that event. index.html carries a
 * timed failsafe for the case where the SPA never mounts.
 *
 * Because every internal link is a full document load (there is no client-side router),
 * "once per document" is also "once per pageview" — there is no SPA double-count to
 * guard against, only the ordering problem above.
 *
 * WHY IT IS PLAIN ESM WITH NO PROJECT IMPORTS
 *
 * The normalisation rules below are the part most worth testing, and the test suite is
 * CommonJS. Keeping this file dependency-free means `booking/tests` can require() it
 * under Node's require(esm) support. Anything needing app state (the surface, the
 * resolved content item) is passed in by the caller rather than imported.
 */

import { resolveAliasPath } from '../routing/alias.js';

/**
 * Query parameters removed from the reported location.
 *
 *   token, id  — the manage page's signed reschedule/cancel capability. It must never
 *                reach a third party. GA4-side redaction is configured as a second
 *                layer; this is the first.
 *   surface    — switches routing on any host, so leaving it in would fragment a page
 *                into two rows that are the same page.
 *   cat        — the library filter. Carried as its own dimension instead, so the
 *                library index stays one row and the filter stays queryable.
 *
 * Everything else survives on purpose. In particular utm_* and the click ids (gclid,
 * fbclid, msclkid, ttclid, li_fat_id, twclid) MUST pass through untouched — GA4 reads
 * campaign attribution off page_location, and stripping them would silently turn all
 * paid traffic into direct.
 */
export const STRIPPED_PARAMS = ['token', 'id', 'surface', 'cat'];

/**
 * The origin to report a page under.
 *
 * The library surface is folded onto the www host so one article is one row (see
 * canonicalPath). Everything else keeps its real origin — hardcoding `jurnii.io` would
 * make every Vercel preview deploy report as production and quietly contaminate the
 * live property's page reports.
 */
export function reportingOrigin(loc) {
  var source = loc || (typeof window !== 'undefined' ? window.location : null);
  if (!source || !source.origin) return 'https://jurnii.io';
  var host = String(source.hostname || '');
  if (host.indexOf('library.') === 0) {
    return source.origin.replace('://library.', '://');
  }
  return source.origin;
}

/**
 * Resolve a pathname to the one path that identifies this content.
 *
 * The library lives on two hosts: `library.jurnii.io/{slug}` and
 * `jurnii.io/library/{slug}` are the same article. They are reported as the www form.
 *
 * Note this is deliberately NOT `getCanonicalUrl` from routing/surface-utils — that is
 * the SEO canonical, which keeps the two surfaces separate on purpose. For measurement
 * the opposite is wanted: merge them, and keep `surface` as a dimension. You can always
 * split a merged report by a dimension; you cannot merge two rows after collection.
 *
 * @param {string} rawPath
 * @param {'www'|'library'} [surfaceRole]
 * @returns {string} a path with a leading slash
 */
export function canonicalPath(rawPath, surfaceRole) {
  const resolved = resolveAliasPath(rawPath);

  if (!resolved) {
    // The root means different things per host: the library index, or the homepage.
    return surfaceRole === 'library' ? '/library' : '/';
  }
  if (surfaceRole === 'library' && resolved !== 'library' && !resolved.startsWith('library/')) {
    return '/library/' + resolved;
  }
  return '/' + resolved;
}

/**
 * Build the reported page_location: canonical path, canonical origin, surviving query.
 *
 * @param {{pathname?: string, search?: string, surfaceRole?: string}} loc
 * @returns {string}
 */
export function canonicalLocation(loc) {
  const source = loc || {};
  const path = canonicalPath(source.pathname || '/', source.surfaceRole);

  // URLSearchParams rather than a regex: values may be encoded, repeated, or empty, and
  // a half-right regex here is how a token leaks.
  const params = new URLSearchParams(source.search || '');
  for (const name of STRIPPED_PARAMS) params.delete(name);
  const query = params.toString();

  return reportingOrigin(source.origin ? source : null) + path + (query ? '?' + query : '');
}

/**
 * Page titles come from content frontmatter and are bare ("Attribution"), while the
 * static shell title already carries the brand. Suffix only when it is missing, so
 * nothing ends up as "Jurnii · … · Jurnii".
 */
export function pageTitle(title, fallback) {
  const base = String(title || '').trim() || String(fallback || '').trim();
  if (!base) return 'Jurnii';
  return /jurnii/i.test(base) ? base : base + ' · Jurnii';
}

/**
 * Set the document's own identity.
 *
 * Nothing in this codebase ever assigned document.title, so every tab, bookmark, share
 * and screen-reader announcement read the homepage title. Fixing it is a prerequisite
 * for GA4 reporting, but it is a real defect in its own right — hence the meta
 * description alongside it, which has the identical cause and the same one-line fix.
 */
export function setPageIdentity(title, description, doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d) return;

  if (title) d.title = title;

  if (description) {
    let tag = d.querySelector('meta[name="description"]');
    if (!tag) {
      tag = d.createElement('meta');
      tag.setAttribute('name', 'description');
      d.head.appendChild(tag);
    }
    tag.setAttribute('content', description);
  }
}

/** Has this document already announced itself? Reset only by a real page load. */
function alreadyPushed(win) {
  const layer = win.dataLayer || [];
  for (let i = 0; i < layer.length; i++) {
    if (layer[i] && layer[i].event === 'page_context_ready') return true;
  }
  return false;
}

/**
 * Announce the page: set its identity, then push the context the pageview fires on.
 *
 * Idempotent by inspecting dataLayer rather than by a module-scoped flag, so it also
 * de-duplicates against the failsafe push in index.html and against React re-running an
 * effect in development.
 *
 * @returns {boolean} whether a push happened
 */
export function pushPageContext(context, win) {
  const w = win || (typeof window !== 'undefined' ? window : null);
  if (!w) return false;

  const ctx = context || {};
  const title = pageTitle(ctx.page_title, ctx.default_title);

  setPageIdentity(title, ctx.description, w.document);

  w.dataLayer = w.dataLayer || [];
  if (alreadyPushed(w)) return false;

  const payload = {
    event: 'page_context_ready',
    page_type: ctx.page_type || 'unknown',
    page_title: title,
    page_location: canonicalLocation({
      pathname: ctx.pathname,
      search: ctx.search,
      surfaceRole: ctx.surface,
      origin: w.location && w.location.origin,
      hostname: w.location && w.location.hostname,
    }),
    canonical_path: canonicalPath(ctx.pathname || '/', ctx.surface),
    surface: ctx.surface || 'www',
  };

  // Only send what the page actually has. An empty string is a reportable value in GA4
  // and would be indistinguishable from a real one.
  const optional = [
    'content_group',
    'content_section',
    'content_slug',
    'content_category',
    'content_medium',
    'content_author',
    'content_filter',
    'template',
  ];
  for (const key of optional) {
    if (ctx[key] !== undefined && ctx[key] !== null && ctx[key] !== '') payload[key] = ctx[key];
  }

  w.dataLayer.push(payload);
  return true;
}

/**
 * Push a non-pageview event. Kept here so the string 'dataLayer' appears in as few
 * places as possible — the rest of the app talks about pages and bookings, not tags.
 */
export function pushEvent(event, params, win) {
  const w = win || (typeof window !== 'undefined' ? window : null);
  if (!w || !event) return false;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(Object.assign({ event: event }, params || {}));
  return true;
}
