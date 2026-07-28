import {
  ContentItem,
  ContentMeta,
  ContentKind,
} from '../types';
import { CONTENT_MANIFEST } from '../generated-content';
import { ProductEntitySchema, FeatureEntitySchema, SolutionEntitySchema, UseCaseEntitySchema, PostSchema, PageSchema } from '../schemas';

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
    console.warn(errorMsg);
  }
}

export function getPdfUrl(slug: string): string | null {
  if (slug === 'marketing-mix-modeling-paper' || slug.endsWith('-paper')) {
    return `/papers/${slug}.pdf`;
  }
  return null;
}

export function getByPath(segments: string[]): ContentItem | null {
  if (segments.length === 0) return null;

  // Handle surface prefixes
  let normSegments = segments[0] === 'www' ? segments.slice(1) : segments;
  const isLibraryPrefix = normSegments[0] === 'library';
  if (isLibraryPrefix) {
    normSegments = normSegments.slice(1);
  }
  if (normSegments.length === 0) return null;

  // 1. Directory collection lookup (/products, /features, /solutions, /use-cases)
  if (normSegments.length === 1 && ENTITY_SECTIONS.includes(normSegments[0])) {
    const section = normSegments[0];
    const children = CONTENT_MANIFEST.filter((item) => {
      const p = item.path.replace(/\\/g, '/');
      return isLibraryPrefix ? p.includes(`/content/library/`) : p.includes(`/content/www/${section}/`);
    });

    children.sort((a, b) => {
      if (typeof a.meta.order === 'number' && typeof b.meta.order === 'number') {
        if (a.meta.order !== b.meta.order) return a.meta.order - b.meta.order;
      }
      return (b.meta.date || '').localeCompare(a.meta.date || '');
    });

    return {
      type: 'folder',
      path: isLibraryPrefix ? `/content/library` : `/content/www/${section}`,
      slug: section,
      meta: {
        title: section.toUpperCase(),
        description: `Explore ${section}`,
      },
      children,
    };
  }

  // Extract clean target slug (last segment)
  const targetSlug = normSegments[normSegments.length - 1].replace(/\.html$/, '');

  // 2. Section-specific matching if a known section exists in the URL segments
  const matchedSection = [...normSegments].reverse().find((seg) => ENTITY_SECTIONS.includes(seg));
  if (matchedSection) {
    const match = CONTENT_MANIFEST.find((item) => {
      const p = item.path.replace(/\\/g, '/');
      return (p.includes(`/content/www/${matchedSection}/`) || p.includes(`/content/library/`)) && item.slug === targetSlug;
    });
    if (match) return match;
  }

  // 3. Prefer library match if path requested library
  if (isLibraryPrefix) {
    const libraryMatch = CONTENT_MANIFEST.find((item) => {
      const p = item.path.replace(/\\/g, '/');
      return p.includes('/content/library/') && item.slug === targetSlug;
    });
    if (libraryMatch) return libraryMatch;
  }

  // 4. Global fallback lookup by slug across all CONTENT_MANIFEST items
  const globalMatch = CONTENT_MANIFEST.find((item) => item.slug === targetSlug);
  if (globalMatch) return globalMatch;

  return null;
}

export function getContent(relativePath: string): ContentItem | null {
  const parts = relativePath.split('/').filter(Boolean);
  return getByPath(parts);
}

export function getAllContent(rootFolder: string = 'www'): ContentItem[] {
  return CONTENT_MANIFEST.filter((item) => {
    const p = item.path.replace(/\\/g, '/');
    if (rootFolder === 'www') return p.includes('/content/www/');
    if (rootFolder === 'library') return p.includes('/content/library/');
    return p.includes(`/content/${rootFolder}/`);
  });
}

export function getContentBySlug(slug: string, searchFolders: string[] = ['www', 'library']): ContentItem | null {
  const cleanSlug = slug.replace(/\.html$/, '');
  return (
    CONTENT_MANIFEST.find((item) => {
      const p = item.path.replace(/\\/g, '/');
      const matchesFolder = searchFolders.some((f) => p.includes(`/content/${f}/`));
      return matchesFolder && item.slug === cleanSlug;
    }) || null
  );
}

export function getContentByRef(
  refField: 'productRefs' | 'featureRefs' | 'solutionRefs' | 'useCaseValueRefs' | 'useCaseFieldRefs',
  refValue: string,
  searchFolders: string[] = ['library']
): ContentItem[] {
  const cleanVal = refValue.replace(/\.html$/, '');
  return CONTENT_MANIFEST.filter((item) => {
    const p = item.path.replace(/\\/g, '/');
    const inFolder = searchFolders.some((f) => p.includes(`/content/${f}/`));
    if (!inFolder) return false;
    const arr = item.meta[refField];
    return Array.isArray(arr) && arr.includes(cleanVal);
  });
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
