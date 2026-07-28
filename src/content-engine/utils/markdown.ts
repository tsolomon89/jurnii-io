import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import {
  ContentItem,
  ContentMeta,
  ContentKind,
  FolderMeta,
} from '../types';
import {
  ProductEntitySchema,
  FeatureEntitySchema,
  SolutionEntitySchema,
  UseCaseEntitySchema,
  PostSchema,
  PageSchema,
} from '../schemas';

// Configure marked with GFM, line breaks, and KaTeX math extension
marked.use(
  { gfm: true, breaks: true },
  markedKatex({
    throwOnError: false,
    nonStandard: true,
  })
);

export const ENTITY_SECTIONS = ['products', 'features', 'solutions', 'use-cases'];

export function inferKindFromSection(section: string): ContentKind {
  switch (section.toLowerCase()) {
    case 'products':
      return 'product';
    case 'features':
      return 'feature';
    case 'solutions':
      return 'solution';
    case 'use-cases':
      return 'use-case';
    case 'library':
      return 'article';
    case 'pages':
      return 'page';
    default:
      return 'article';
  }
}

export function inferContentMeta(
  filePath: string,
  data: Record<string, any>
): ContentMeta {
  const normPath = filePath.replace(/\\/g, '/');
  const pathParts = normPath.split('/');
  const section = pathParts.length > 2 ? pathParts[pathParts.length - 2] : '';

  const inferredKind = data.contentKind || inferKindFromSection(section);
  const medium = data.medium || (inferredKind === 'paper' ? 'Paper' : 'Article');
  const format = data.format || (medium.toLowerCase() === 'paper' ? 'paper' : 'article');
  const isIndexable = data.isIndexable !== undefined ? Boolean(data.isIndexable) : data.noindex !== true;

  return {
    title: data.title || path.basename(filePath, '.md'),
    date: data.date || data.publishedAt || new Date().toISOString().split('T')[0],
    medium,
    format,
    excerpt: data.excerpt || data.description,
    description: data.description,
    author: data.author || 'Timothy Solomon',
    category: data.category,
    tags: Array.isArray(data.tags) ? data.tags : [],
    subtitle: data.subtitle,
    coverImage: data.coverImage || data.cover_image,
    icon: data.icon,
    order: typeof data.order === 'number' ? data.order : 99,
    heroFeatures: data.heroFeatures,
    deepWorkFeatures: data.deepWorkFeatures,
    pullQuote: data.pullQuote,
    pullQuoteAttribution: data.pullQuoteAttribution,
    productRefs: Array.isArray(data.productRefs) ? data.productRefs : [],
    featureRefs: Array.isArray(data.featureRefs) ? data.featureRefs : [],
    solutionRefs: Array.isArray(data.solutionRefs) ? data.solutionRefs : [],
    useCaseValueRefs: Array.isArray(data.useCaseValueRefs) ? data.useCaseValueRefs : (Array.isArray(data.forUseCases) ? data.forUseCases : []),
    useCaseFieldRefs: Array.isArray(data.useCaseFieldRefs) ? data.useCaseFieldRefs : [],
    isIndexable,
    contentKind: inferredKind,
  };
}

export function validateContentSchema(filePath: string, meta: ContentMeta): void {
  const kind = meta.contentKind;
  let result;
  if (kind === 'product') {
    result = ProductEntitySchema.safeParse(meta);
  } else if (kind === 'feature') {
    result = FeatureEntitySchema.safeParse(meta);
  } else if (kind === 'solution') {
    result = SolutionEntitySchema.safeParse(meta);
  } else if (kind === 'use-case') {
    result = UseCaseEntitySchema.safeParse(meta);
  } else if (kind === 'article' || kind === 'paper') {
    result = PostSchema.safeParse(meta);
  } else if (kind === 'page') {
    result = PageSchema.safeParse(meta);
  }

  if (result && !result.success) {
    const errorMsg = `[Content Validation Error] File "${filePath}" failed ${kind} schema validation: ${JSON.stringify(result.error.format())}`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg);
    } else {
      console.warn(errorMsg);
    }
  }
}

export function getPdfUrl(slug: string, cwd: string = process.cwd()): string | null {
  const pdfRel = path.join('public', 'papers', `${slug}.pdf`);
  const absPath = path.join(cwd, pdfRel);
  if (fs.existsSync(absPath)) {
    return `/papers/${slug}.pdf`;
  }
  return null;
}

export function getByPath(
  segments: string[],
  cwd: string = process.cwd()
): ContentItem | null {
  const contentRoot = path.join(cwd, 'content');
  const targetRel = path.join(...segments);
  const targetAbs = path.join(contentRoot, targetRel);
  const mdCandidate = targetAbs + '.md';

  // File-first resolution
  let fileToRead = mdCandidate;
  if (!fs.existsSync(fileToRead) && segments.length === 2 && segments[0] === 'www') {
    const pagesCandidate = path.join(contentRoot, 'www', 'pages', `${segments[1]}.md`);
    if (fs.existsSync(pagesCandidate)) {
      fileToRead = pagesCandidate;
    }
  }

  if (fs.existsSync(fileToRead) && fs.statSync(fileToRead).isFile()) {
    const raw = fs.readFileSync(fileToRead, 'utf-8');
    const parsed = matter(raw);
    const meta = inferContentMeta(fileToRead, parsed.data);
    validateContentSchema(fileToRead, meta);
    const bodyHtml = marked.parse(parsed.content) as string;
    const slug = path.basename(fileToRead, '.md');

    return {
      type: 'file',
      path: fileToRead,
      slug,
      meta,
      bodyHtml,
      rawContent: parsed.content,
    };
  }

  // Directory resolution
  if (fs.existsSync(targetAbs) && fs.statSync(targetAbs).isDirectory()) {
    let folderMeta: FolderMeta = { type: 'collection' };
    const metaJsonPath = path.join(targetAbs, '_meta.json');
    if (fs.existsSync(metaJsonPath)) {
      try {
        folderMeta = JSON.parse(fs.readFileSync(metaJsonPath, 'utf-8'));
      } catch (err) {
        console.warn(`Failed to parse _meta.json at ${metaJsonPath}:`, err);
      }
    }

    const children: ContentItem[] = [];
    const entries = fs.readdirSync(targetAbs, { withFileTypes: true });

    for (const ent of entries) {
      if (ent.name.startsWith('_') || ent.name.startsWith('.')) continue;

      if (ent.isFile() && ent.name.endsWith('.md')) {
        const childAbs = path.join(targetAbs, ent.name);
        const raw = fs.readFileSync(childAbs, 'utf-8');
        const parsed = matter(raw);
        const meta = inferContentMeta(childAbs, parsed.data);
        validateContentSchema(childAbs, meta);
        const bodyHtml = marked.parse(parsed.content) as string;
        const slug = path.basename(ent.name, '.md');

        children.push({
          type: 'file',
          path: childAbs,
          slug,
          meta,
          bodyHtml,
          rawContent: parsed.content,
        });
      }
    }

    // Sort children
    children.sort((a, b) => {
      if (typeof a.meta.order === 'number' && typeof b.meta.order === 'number') {
        if (a.meta.order !== b.meta.order) return a.meta.order - b.meta.order;
      }
      const dateA = a.meta.date || '';
      const dateB = b.meta.date || '';
      return dateB.localeCompare(dateA);
    });

    return {
      type: 'folder',
      path: targetAbs,
      slug: path.basename(targetAbs),
      meta: {
        title: folderMeta.title || path.basename(targetAbs),
        description: folderMeta.description,
      },
      folderMeta,
      children,
    };
  }

  return null;
}

export function getContent(relativePath: string, cwd: string = process.cwd()): ContentItem | null {
  const parts = relativePath.split('/').filter(Boolean);
  return getByPath(parts, cwd);
}

export function getAllContent(rootFolder: string = 'www', cwd: string = process.cwd()): ContentItem[] {
  const rootAbs = path.join(cwd, 'content', rootFolder);
  if (!fs.existsSync(rootAbs)) return [];

  const results: ContentItem[] = [];

  function walk(d: string) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      if (ent.name.startsWith('_') || ent.name.startsWith('.')) continue;
      const fullPath = path.join(d, ent.name);
      if (ent.isDirectory()) {
        walk(fullPath);
      } else if (ent.name.endsWith('.md')) {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const parsed = matter(raw);
        const meta = inferContentMeta(fullPath, parsed.data);
        validateContentSchema(fullPath, meta);
        const bodyHtml = marked.parse(parsed.content) as string;
        const slug = path.basename(ent.name, '.md');

        results.push({
          type: 'file',
          path: fullPath,
          slug,
          meta,
          bodyHtml,
          rawContent: parsed.content,
        });
      }
    }
  }

  walk(rootAbs);
  return results;
}

export function getContentBySlug(slug: string, searchFolders: string[] = ['www', 'library'], cwd: string = process.cwd()): ContentItem | null {
  for (const folder of searchFolders) {
    const all = getAllContent(folder, cwd);
    const match = all.find((item) => item.slug === slug);
    if (match) return match;
  }
  return null;
}

export function getContentByRef(
  refField: 'productRefs' | 'featureRefs' | 'solutionRefs' | 'useCaseValueRefs' | 'useCaseFieldRefs',
  refValue: string,
  searchFolders: string[] = ['library'],
  cwd: string = process.cwd()
): ContentItem[] {
  const matches: ContentItem[] = [];
  for (const folder of searchFolders) {
    const items = getAllContent(folder, cwd);
    for (const item of items) {
      const arr = item.meta[refField];
      if (Array.isArray(arr) && arr.includes(refValue)) {
        matches.push(item);
      }
    }
  }
  return matches;
}

export function resolveUseCaseValueRefs(refs: string[]): string[] {
  return refs.map((ref) => {
    const lastSlash = ref.lastIndexOf('/');
    return lastSlash !== -1 ? ref.substring(lastSlash + 1) : ref;
  });
}

export function resolveUseCaseFieldRefs(refs: string[]): string[] {
  return refs.map((ref) => {
    const firstSlash = ref.indexOf('/');
    return firstSlash !== -1 ? ref.substring(0, firstSlash) : ref;
  });
}
