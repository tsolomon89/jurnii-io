/**
 * Marks a link as "opens the booking form", for the delegated handler in assets/site.jsx.
 *
 * WHY THE TEMPLATES STAMP THIS AND THE CONTENT DOES NOT
 *
 * Around three dozen calls-to-action come from markdown `primaryCta: {label, href}`
 * frontmatter. Their labels vary — `Book a Demo` with a capital D, `Book a scoping call`,
 * `Book a 45-min demo` — and the old handler matched on the exact string
 * `startsWith('Book a demo')`, so every one of them missed and navigated to /contact-us,
 * a page with no booking form on it. Stamping in the template fixes all of them at once
 * and keeps content files free of tagging concerns.
 *
 * `id` names the SLOT, not the page. Which page a click happened on is already carried by
 * page_location, so `entity-hero-primary` across 94 entity pages stays one low-cardinality
 * value that can still be crossed with the page when a report needs to be specific.
 */
export function ctaAttrs(
  href: string | undefined | null,
  id: string
): Record<string, string> {
  // Only /contact-us links are booking intent. A primaryCta pointing anywhere else is
  // real navigation and must not have its click swallowed.
  if (!href || href.replace(/\/+$/, '') !== '/contact-us') return {};
  return { 'data-cta-action': 'demo', 'data-cta-id': id };
}
