import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import { validateContentSchema } from '../src/content-engine/utils/markdown';

marked.use(
  { gfm: true, breaks: true },
  markedKatex({
    throwOnError: false,
    nonStandard: true,
  })
);

const cwd = process.cwd();
const contentRoot = path.join(cwd, 'content');

console.log('Compiling content manifest for browser bundle...');

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

      const meta = {
        title: parsed.data.title || slug,
        date: parsed.data.date || parsed.data.publishedAt || '2026-01-01',
        medium: parsed.data.medium || (section === 'library' ? 'Article' : 'Page'),
        excerpt: parsed.data.excerpt || parsed.data.description || '',
        description: parsed.data.description || '',
        author: parsed.data.author || 'Jurnii Research',
        category: parsed.data.category,
        tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
        subtitle: parsed.data.subtitle,
        coverImage: parsed.data.coverImage || parsed.data.cover_image,
        icon: parsed.data.icon,
        order: typeof parsed.data.order === 'number' ? parsed.data.order : 99,
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
        contentKind: parsed.data.contentKind || section,
        sections: Array.isArray(parsed.data.sections) ? parsed.data.sections : [],
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
