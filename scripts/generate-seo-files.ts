/**
 * Writes robots.txt and sitemap.xml into the Vite output directory.
 * Without these files, Vercel's SPA fallback serves index.html for both URLs and
 * crawlers / Lighthouse report dozens of robots.txt syntax errors.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getDynamicSitemapEntries } from '../src/content-engine/utils/sitemap.ts';

const cwd = process.cwd();
const outDir = path.resolve(cwd, process.argv[2] || 'dist');
const baseUrl = (process.env.SITE_URL || process.env.PUBLIC_BASE_URL || 'https://jurnii.io').replace(
  /\/$/,
  ''
);

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSitemapXml(): string {
  const entries = getDynamicSitemapEntries(baseUrl);
  const hasHome = entries.some((e) => {
    try {
      return new URL(e.url).pathname === '/';
    } catch {
      return false;
    }
  });
  if (!hasHome) {
    entries.unshift({
      url: `${baseUrl}/`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 1,
    });
  }

  const body = entries
    .map((entry) => {
      const lines = [
        '  <url>',
        `    <loc>${escapeXml(entry.url)}</loc>`,
        `    <lastmod>${entry.lastModified.split('T')[0]}</lastmod>`,
      ];
      if (entry.changeFrequency) {
        lines.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
      }
      if (entry.priority != null) {
        lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      }
      lines.push('  </url>');
      return lines.join('\n');
    })
    .join('\n');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${body}\n` +
    '</urlset>\n'
  );
}

function buildRobotsTxt(): string {
  return `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

Disallow: /admin-form
Disallow: /manage.html
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
}

if (!fs.existsSync(outDir)) {
  console.error(`generate-seo-files: output directory missing: ${outDir}`);
  process.exit(1);
}

fs.writeFileSync(path.join(outDir, 'robots.txt'), buildRobotsTxt(), 'utf-8');
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), buildSitemapXml(), 'utf-8');
console.log(`Wrote robots.txt and sitemap.xml (${getDynamicSitemapEntries(baseUrl).length + 1} URLs) → ${outDir}`);
