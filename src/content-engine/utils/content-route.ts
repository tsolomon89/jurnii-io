import { ContentItem } from '../types';

const ENTITY_SECTIONS = ['products', 'features', 'solutions', 'use-cases'] as const;

export function isIndexable(item: ContentItem): boolean {
  return item.meta.isIndexable !== false && item.meta.noindex !== true;
}

/** Canonical public path for a content item, or null if it should not be listed. */
export function contentRoute(item: ContentItem): string | null {
  if (!isIndexable(item)) return null;
  const normPath = item.path.replace(/\\/g, '/');

  if (normPath.includes('/content/www/pages/')) {
    return `/${item.slug}`;
  }

  const section = ENTITY_SECTIONS.find((s) => normPath.includes(`/content/www/${s}/`));
  if (section) {
    if (item.slug === 'index') return `/${section}`;
    return `/${section}/${item.slug}`;
  }

  if (normPath.includes('/content/library/')) {
    return `/library/${item.slug}`;
  }

  return null;
}
