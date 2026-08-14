/**
 * Public URL aliases, and the one path-resolution rule the site runs on.
 *
 * This used to live inside ContentEngineApp. It was lifted out because the analytics
 * layer has to answer "which page is this?" exactly the way the router answers it — if
 * the two ever disagree, GA4 reports a page the visitor was never on. One
 * implementation, two consumers.
 *
 * Plain ESM with no imports, so `booking/tests` can require() it directly under Node's
 * require(esm) support.
 */

export const ALIAS_MAP = {
  '360': 'products/jurnii-360',
  'jurnii-360': 'products/jurnii-360',
  'ux': 'products/jurnii-ux',
  'jurnii-ux': 'products/jurnii-ux',
  'mmm': 'products/jurnii-mmm',
  'jurnii-mmm': 'products/jurnii-mmm',
  'contact': 'contact-us',
  'book': 'contact-us',
  'resources': 'library',
  'resources.html': 'library',
  'resource': 'library',
};

/**
 * Normalise a raw pathname to the content path the router will actually render.
 *
 * Two quirks are preserved deliberately, because the router has them and analytics must
 * agree with the router rather than with an idealised version of it:
 *
 *   · `.html` is stripped BEFORE lookup, so the 'resources.html' key is unreachable —
 *     `/resources.html` normalises to `resources` and hits that entry instead.
 *   · the last-segment fallback matches at any depth, so `/anything/ux` and
 *     `/a/b/360` resolve to real product pages. That is what makes normalising for
 *     analytics necessary in the first place: without it, every one of those infinitely
 *     many URLs would be its own row in a page report.
 *
 * @param {string} rawPath a pathname, with or without a leading slash
 * @returns {string} the resolved path, no leading or trailing slash ('' for the root)
 */
export function resolveAliasPath(rawPath) {
  const cleanPath = String(rawPath || '')
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/\.html$/, '');
  const lastSeg = cleanPath.split('/').pop() || '';
  return ALIAS_MAP[cleanPath] || ALIAS_MAP[lastSeg] || cleanPath;
}
