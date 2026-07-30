import { ContentItem, EntityPageModel, EntityType, TocItem } from '../types';
import { getByPath, getContentByRef } from './markdown';

export function processHeadings(html: string = ''): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const headingRegex = /<h([1-3])([^>]*)>([\s\S]*?)<\/h\d>/gi;

  const processedHtml = html.replace(headingRegex, (match, levelStr, attrs, text) => {
    const level = parseInt(levelStr, 10);
    const plainText = text.replace(/<[^>]+>/g, '').trim();
    const id = plainText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    toc.push({ id, text: plainText, level });

    if (attrs.includes('id=')) {
      return match;
    }
    return `<h${level}${attrs} id="${id}">${text}</h${level}>`;
  });

  return { html: processedHtml, toc };
}

export function estimateReadTime(textOrHtml: string = ''): number {
  const plainText = textOrHtml.replace(/<[^>]+>/g, ' ').trim();
  const words = plainText ? plainText.split(/\s+/).length : 0;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

export function buildOgUrl(title: string, subtitle: string = '', type: string = 'article'): string {
  const params = new URLSearchParams({ title, subtitle, type });
  return `/api/og?${params.toString()}`;
}

export const ENTITY_REF_MAP: Record<string, 'productRefs' | 'featureRefs' | 'solutionRefs' | 'useCaseValueRefs'> = {
  products: 'productRefs',
  features: 'featureRefs',
  solutions: 'solutionRefs',
  'use-cases': 'useCaseValueRefs',
};

export const ENTITY_LABEL_MAP: Record<string, string> = {
  products: 'Content Types',
  features: 'Domains',
  solutions: 'Topics',
  'use-cases': 'Audiences',
};

export function resolveRichPageData(
  item: ContentItem,
  section: EntityType
): EntityPageModel {
  const meta = item.meta;
  const { html: bodyHtml, toc } = processHeadings(item.bodyHtml || '');

  // 1. Direct relationship resolution
  const relatedItems: { title: string; description: string; href: string; icon?: string }[] = [];

  const refSources = [
    { refs: meta.productRefs || [], sec: 'products' },
    { refs: meta.featureRefs || [], sec: 'features' },
    { refs: meta.solutionRefs || [], sec: 'solutions' },
    { refs: meta.useCaseValueRefs || [], sec: 'use-cases' },
  ];

  for (const { refs, sec } of refSources) {
    for (const refSlug of refs) {
      if (refSlug === item.slug) continue;
      const targetItem = getByPath(['www', sec, refSlug]);
      if (targetItem) {
        relatedItems.push({
          title: targetItem.meta.title,
          description: targetItem.meta.excerpt || targetItem.meta.description || '',
          href: `/${sec}/${refSlug}`,
          icon: targetItem.meta.icon,
        });
      }
    }
  }

  // 2. Reverse editorial lookup
  const refField = ENTITY_REF_MAP[section];
  const rawEditorial = refField ? getContentByRef(refField, item.slug, ['library']) : [];

  const reverseEditorialItems = rawEditorial.map((ed) => ({
    title: ed.meta.title,
    date: ed.meta.date || '',
    excerpt: ed.meta.excerpt || ed.meta.description || '',
    href: `/library/${ed.slug}`,
  }));

  return {
    slug: item.slug,
    section,
    title: meta.title,
    description: meta.description || '',
    category: meta.category,
    icon: meta.icon,
    order: meta.order,
    eyebrow: meta.eyebrow,
    kicker: meta.kicker,
    accentClass: meta.accentClass,
    primaryCta: meta.primaryCta,
    secondaryCta: meta.secondaryCta,
    features: meta.features,
    heroFeatures: meta.heroFeatures,
    deepWorkFeatures: meta.deepWorkFeatures,
    pullQuote: meta.pullQuote,
    pullQuoteAttribution: meta.pullQuoteAttribution,
    bodyHtml,
    tableOfContents: toc,
    relatedItems,
    reverseEditorialItems,
    sections: meta.sections,
  };
}
