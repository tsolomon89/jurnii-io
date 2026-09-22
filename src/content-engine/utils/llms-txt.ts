import { ContentItem } from '../types';
import { getAllContent } from './markdown';
import { contentRoute } from './content-route';

const COMPANY_SLUGS = new Set(['about', 'contact-us', 'compare']);
const OPTIONAL_PAGE_SLUGS = new Set(['privacy', 'terms']);

function oneLine(text: string, max = 120): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  const cut = compact.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 80 ? cut.slice(0, sp) : cut).replace(/[.,;:]$/, '')}…`;
}

function noteFor(item: ContentItem): string {
  const raw = item.meta.description || item.meta.excerpt || '';
  return raw ? oneLine(raw) : '';
}

function listItem(title: string, url: string, note?: string): string {
  const safeTitle = title.replace(/\[/g, '(').replace(/\]/g, ')');
  return note ? `- [${safeTitle}](${url}): ${note}` : `- [${safeTitle}](${url})`;
}

function sortItems(a: ContentItem, b: ContentItem): number {
  const ao = typeof a.meta.order === 'number' ? a.meta.order : 999;
  const bo = typeof b.meta.order === 'number' ? b.meta.order : 999;
  if (ao !== bo) return ao - bo;
  return (a.meta.title || a.slug).localeCompare(b.meta.title || b.slug);
}

function sectionList(
  items: ContentItem[],
  baseUrl: string,
  sectionPath: string
): string[] {
  return items
    .filter((item) => contentRoute(item)?.startsWith(sectionPath))
    .sort(sortItems)
    .map((item) => {
      const route = contentRoute(item)!;
      return listItem(item.meta.title || item.slug, `${baseUrl}${route}`, noteFor(item));
    });
}

/**
 * Curated Markdown map for AI agents, per https://llmstxt.org
 * H1 is required. Markdown links are required by Lighthouse Agentic Browsing.
 */
export function buildLlmsTxt(baseUrl: string = 'https://jurnii.io'): string {
  const origin = baseUrl.replace(/\/$/, '');
  const www = getAllContent('www');
  const library = getAllContent('library');

  const company = www
    .filter((item) => {
      const route = contentRoute(item);
      return route && COMPANY_SLUGS.has(item.slug);
    })
    .sort(sortItems)
    .map((item) => listItem(item.meta.title || item.slug, `${origin}${contentRoute(item)!}`, noteFor(item)));

  const optionalPages = www
    .filter((item) => contentRoute(item) && OPTIONAL_PAGE_SLUGS.has(item.slug))
    .sort(sortItems)
    .map((item) => listItem(item.meta.title || item.slug, `${origin}${contentRoute(item)!}`, noteFor(item)));

  const optionalLibrary = [...library]
    .filter((item) => contentRoute(item))
    .sort((a, b) => (b.meta.date || '').localeCompare(a.meta.date || ''))
    .map((item) => listItem(item.meta.title || item.slug, `${origin}${contentRoute(item)!}`, noteFor(item)));

  const products = sectionList(www, origin, '/products');
  const features = sectionList(www, origin, '/features');
  const solutions = sectionList(www, origin, '/solutions');
  const useCases = sectionList(www, origin, '/use-cases');

  const body = `# Jurnii

> Commercial intelligence for iGaming operators. Jurnii replaces manual competitor research and subjective UX audits with structured, near-real-time signal across promotions, player experience, and marketing mix.

Jurnii is a commercial intelligence platform for sportsbook and casino operators. The public site covers three products — Jurnii 360, Jurnii UX, and Jurnii Cortex — plus features, solutions, use cases, and the research library. Use the links below as the canonical map of indexable pages. Skip the Optional section when context is limited.

## Site

${listItem('Home', `${origin}/`, 'Commercial intelligence platform for iGaming operators.')}
${listItem('Research library', `${origin}/library`, 'Guides, reports, thought leadership, and case studies.')}
${listItem('Products', `${origin}/products`, 'Jurnii 360, Jurnii UX, and Jurnii Cortex.')}
${listItem('Features', `${origin}/features`, 'Product capabilities across promotions, UX, and attribution.')}
${listItem('Solutions', `${origin}/solutions`, 'How operators use Jurnii for benchmarking, offers, and mix modelling.')}
${listItem('Use cases', `${origin}/use-cases`, 'Roles, departments, company sizes, and sectors.')}

## Products

${products.join('\n')}

## Features

${features.join('\n')}

## Solutions

${solutions.join('\n')}

## Use cases

${useCases.join('\n')}

## Company

${company.join('\n')}

## Optional

${[...optionalPages, ...optionalLibrary].join('\n')}
`;

  if (!body.startsWith('# ')) {
    throw new Error('llms.txt must start with an H1');
  }
  if (!/\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(body)) {
    throw new Error('llms.txt must contain Markdown links');
  }
  if (body.trim().length < 50) {
    throw new Error('llms.txt is too short for agentic browsing');
  }

  return body.endsWith('\n') ? body : `${body}\n`;
}
