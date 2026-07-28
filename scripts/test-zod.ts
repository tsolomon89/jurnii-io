import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  ProductEntitySchema,
  FeatureEntitySchema,
  SolutionEntitySchema,
  UseCaseEntitySchema,
  PostSchema,
  PageSchema,
} from '../src/content-engine/schemas';

const cwd = process.cwd();
const contentRoot = path.join(cwd, 'content');

let failedCount = 0;

function validateFile(filePath, section) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);
  const slug = path.basename(filePath, '.md');

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
  };

  const kind = meta.contentKind;
  let result;
  if (kind === 'product' || kind === 'products') {
    result = ProductEntitySchema.safeParse(meta);
  } else if (kind === 'feature' || kind === 'features') {
    result = FeatureEntitySchema.safeParse(meta);
  } else if (kind === 'solution' || kind === 'solutions') {
    result = SolutionEntitySchema.safeParse(meta);
  } else if (kind === 'use-case' || kind === 'use-cases') {
    result = UseCaseEntitySchema.safeParse(meta);
  } else if (kind === 'article' || kind === 'paper' || kind === 'library') {
    result = PostSchema.safeParse(meta);
  } else if (kind === 'page' || kind === 'pages') {
    result = PageSchema.safeParse(meta);
  }

  if (result && !result.success) {
    console.warn(`[ERROR] ${filePath} (${kind}): ${JSON.stringify(result.error.format())}`);
    failedCount++;
  }
}

function processDir(dir, section) {
  const absDir = path.join(contentRoot, dir);
  if (!fs.existsSync(absDir)) return;
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name.startsWith('_') || ent.name.startsWith('.')) continue;
    const fp = path.join(absDir, ent.name);
    if (ent.isDirectory()) {
      processDir(path.join(dir, ent.name), section);
    } else if (ent.name.endsWith('.md')) {
      validateFile(fp, section);
    }
  }
}

processDir('www/products', 'product');
processDir('www/features', 'feature');
processDir('www/solutions', 'solution');
processDir('www/use-cases', 'use-case');
processDir('www/pages', 'page');
processDir('library', 'article');

console.log(`Failed files: ${failedCount}`);
