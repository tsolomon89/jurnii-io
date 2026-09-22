import fs from 'node:fs';
import { getAllContent } from './markdown';
import { contentRoute, isIndexable } from './content-route';

export interface SitemapEntry {
  url: string;
  lastModified: string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function resolveLastModified(filePath: string, dateStr?: string): string {
  if (dateStr && !isNaN(Date.parse(dateStr))) {
    return new Date(dateStr).toISOString();
  }
  try {
    const stat = fs.statSync(filePath);
    return stat.mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export function getDynamicSitemapEntries(
  baseUrl: string = 'https://jurnii.io'
): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  const wwwItems = getAllContent('www');
  for (const item of wwwItems) {
    if (!isIndexable(item)) continue;
    const route = contentRoute(item);
    if (!route) continue;
    entries.push({
      url: `${baseUrl}${route}`,
      lastModified: resolveLastModified(item.path, item.meta.date),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  const libraryItems = getAllContent('library');
  for (const item of libraryItems) {
    if (!isIndexable(item)) continue;
    const route = contentRoute(item);
    if (!route) continue;
    entries.push({
      url: `${baseUrl}${route}`,
      lastModified: resolveLastModified(item.path, item.meta.date),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  return entries;
}
