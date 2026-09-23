import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import { validateContentSchema } from '../src/content-engine/utils/markdown';
import { resolveAuthorImage, resolveAuthorRole } from '../src/content-engine/authors';

marked.use(
  { gfm: true, breaks: true },
  markedKatex({
    throwOnError: false,
    // Standard delimiter rules only. `nonStandard` also treats a `$` with whitespace
    // beside it as a delimiter, which turned every pair of currency figures in the
    // market reports into math: "$350m to its Brazil position ... above $90m" rendered
    // as "350mtoitsBrazilposition…". The papers' real `$…$` and `$$…$$` are unaffected.
    nonStandard: false,
  }),
  {
    renderer: {
      table(token: any) {
        const headerHtml = token.header
          .map((cell: any) => `<th>${cell.tokens ? marked.parseInline(cell.text) : cell.text}</th>`)
          .join('');
        const rowsHtml = token.rows
          .map((row: any) => {
            const cells = row
              .map((cell: any) => `<td>${cell.tokens ? marked.parseInline(cell.text) : cell.text}</td>`)
              .join('');
            return `<tr>${cells}</tr>`;
          })
          .join('\n');

        return `<div class="article-table-wrap"><table class="article-table">\n<thead>\n<tr>${headerHtml}</tr>\n</thead>\n<tbody>\n${rowsHtml}\n</tbody>\n</table></div>\n`;
      },
    },
  }
);

const cwd = process.cwd();
const contentRoot = path.join(cwd, 'content');

/** Drop cover paths that would 404. A missing file plus an <img> is the
 *  broken-image icon on the resources grid; the card already has a
 *  placeholder for articles with no artwork. */
function existingPublicAsset(url: unknown, slug: string): string | undefined {
  if (typeof url !== 'string' || !url) return undefined;
  if (!url.startsWith('/')) return url;
  const abs = path.join(cwd, url.slice(1));
  if (fs.existsSync(abs)) return url;
  console.warn(`Missing cover for ${slug}: ${url}`);
  return undefined;
}

console.log('Compiling content manifest for browser bundle...');

export function isFuturePublishDate(rawDate: any): boolean {
  if (!rawDate) return false;
  let dateStr: string;
  if (rawDate instanceof Date) {
    dateStr = rawDate.toISOString().split('T')[0];
  } else {
    dateStr = String(rawDate).trim();
  }
  const match = dateStr.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) {
    const pubDay = match[0];
    const today = new Date().toISOString().split('T')[0];
    return pubDay > today;
  }
  const parsedTime = Date.parse(dateStr);
  if (!isNaN(parsedTime)) {
    return parsedTime > Date.now();
  }
  return false;
}

function processDirectory(dirPath: string, categoryKey: string): any[] {
  const absDir = path.join(contentRoot, dirPath);
  if (!fs.existsSync(absDir)) return [];

  const results = [];
  const entries = fs.readdirSync(absDir, { withFileTypes: true });

  for (const ent of entries) {
    if (ent.name.startsWith('_') || ent.name.startsWith('.')) continue;

    const fullPath = path.join(absDir, ent.name);
    if (ent.isDirectory()) {
      results.push(...processDirectory(path.join(dirPath, ent.name), categoryKey));
    } else if (ent.name.endsWith('.md')) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const parsed = matter(raw);
      const slug = path.basename(ent.name, '.md');
      const bodyHtml = marked.parse(parsed.content);

      // Infer category / section
      const normPath = fullPath.replace(/\\/g, '/');
      let section = 'page';
      if (normPath.includes('/content/www/products/')) section = 'products';
      else if (normPath.includes('/content/www/features/')) section = 'features';
      else if (normPath.includes('/content/www/solutions/')) section = 'solutions';
      else if (normPath.includes('/content/www/use-cases/')) section = 'use-cases';
      else if (normPath.includes('/content/www/pages/')) section = 'pages';
      else if (normPath.includes('/content/library/')) section = 'library';

      // IFF the publish date in the frontmatter is greater than the current date it shouldn't be published on the site.
      if (section === 'library') {
        const rawPublishDate = parsed.data.date || parsed.data.publishDate || parsed.data.publishedAt;
        if (isFuturePublishDate(rawPublishDate)) {
          continue;
        }
      }

      const meta = {
        title: parsed.data.title || slug,
        date: parsed.data.date || parsed.data.publishDate || parsed.data.publishedAt || '2026-01-01',
        medium: parsed.data.medium || (section === 'library' ? 'Article' : 'Page'),
        excerpt: parsed.data.excerpt || parsed.data.description || '',
        description: parsed.data.description || '',
        author: parsed.data.author || 'Jurnii Research',
        authorImage: resolveAuthorImage(parsed.data.author, parsed.data.authorImage),
        authorRole: resolveAuthorRole(parsed.data.author, parsed.data.authorRole),
        category: parsed.data.category,
        tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
        subtitle: parsed.data.subtitle,
        coverImage: existingPublicAsset(parsed.data.coverImage || parsed.data.cover_image, slug),
        icon: parsed.data.icon,
        order: typeof parsed.data.order === 'number' ? parsed.data.order : 99,
        eyebrow: parsed.data.eyebrow,
        kicker: parsed.data.kicker,
        accentClass: parsed.data.accentClass,
        primaryCta: parsed.data.primaryCta,
        secondaryCta: parsed.data.secondaryCta,
        features: parsed.data.features,
        heroFeatures: parsed.data.heroFeatures,
        deepWorkFeatures: parsed.data.deepWorkFeatures,
        pullQuote: parsed.data.pullQuote,
        pullQuoteAttribution: parsed.data.pullQuoteAttribution,
        productRefs: Array.isArray(parsed.data.productRefs) ? parsed.data.productRefs : [],
        featureRefs: Array.isArray(parsed.data.featureRefs) ? parsed.data.featureRefs : [],
        solutionRefs: Array.isArray(parsed.data.solutionRefs) ? parsed.data.solutionRefs : [],
        useCaseValueRefs: Array.isArray(parsed.data.useCaseValueRefs) ? parsed.data.useCaseValueRefs : [],
        useCaseFieldRefs: Array.isArray(parsed.data.useCaseFieldRefs) ? parsed.data.useCaseFieldRefs : [],
        isIndexable: parsed.data.isIndexable !== false,
        noindex: parsed.data.noindex === true,
        contentKind: parsed.data.contentKind || section,
        sections: Array.isArray(parsed.data.sections) ? parsed.data.sections : [],
        // Market Report specific fields
        reportLens: parsed.data.reportLens,
        reportFormat: parsed.data.reportFormat,
        analysisPeriod: parsed.data.analysisPeriod,
        asOf: parsed.data.asOf,
        sourceCapturedAt: parsed.data.sourceCapturedAt,
        comparisonMode: parsed.data.comparisonMode,
        cohort: parsed.data.cohort,
        evidenceManifest: parsed.data.evidenceManifest,
        socialPackage: parsed.data.socialPackage,
        dataFreshnessNote: parsed.data.dataFreshnessNote,
        publicationStatus: parsed.data.publicationStatus,
        isLegacyRegionalReport: parsed.data.isLegacyRegionalReport === true,
      };

      validateContentSchema(fullPath, meta as any);

      results.push({
        path: normPath,
        slug,
        section,
        meta,
        bodyHtml,
        rawContent: parsed.content,
      });
    }
  }

  return results;
}

const allItems = [
  ...processDirectory('www/products', 'products'),
  ...processDirectory('www/features', 'features'),
  ...processDirectory('www/solutions', 'solutions'),
  ...processDirectory('www/use-cases', 'use-cases'),
  ...processDirectory('www/pages', 'pages'),
  ...processDirectory('library', 'library'),
];

const fileContent = `// Auto-generated content manifest for browser runtime
import { ContentItem } from './types';

export const CONTENT_MANIFEST: ContentItem[] = ${JSON.stringify(allItems, null, 2)};
`;

const targetPath = path.join(cwd, 'src/content-engine/generated-content.ts');
fs.writeFileSync(targetPath, fileContent, 'utf-8');
console.log(`Compiled ${allItems.length} content items into src/content-engine/generated-content.ts`);
