import fs from 'node:fs';
import path from 'node:path';
import { getAllContent } from './markdown';

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
  baseUrl: string = 'https://jurnii.io',
  cwd: string = process.cwd()
): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  // WWW surface content
  const wwwItems = getAllContent('www', cwd);
  for (const item of wwwItems) {
    if (item.meta.isIndexable === false || item.meta.noindex === true) {
      continue;
    }

    const normPath = item.path.replace(/\\/g, '/');
    let route = '/';
    if (normPath.includes('/content/www/pages/')) {
      route = `/${item.slug}`;
    } else if (normPath.includes('/content/www/products/')) {
      route = `/products/${item.slug}`;
    } else if (normPath.includes('/content/www/features/')) {
      route = `/features/${item.slug}`;
    } else if (normPath.includes('/content/www/solutions/')) {
      route = `/solutions/${item.slug}`;
    } else if (normPath.includes('/content/www/use-cases/')) {
      route = `/use-cases/${item.slug}`;
    }

    entries.push({
      url: `${baseUrl}${route}`,
      lastModified: resolveLastModified(item.path, item.meta.date),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // Library surface content
  const libraryItems = getAllContent('library', cwd);
  for (const item of libraryItems) {
    if (item.meta.isIndexable === false || item.meta.noindex === true) {
      continue;
    }

    entries.push({
      url: `${baseUrl}/library/${item.slug}`,
      lastModified: resolveLastModified(item.path, item.meta.date),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  return entries;
}
