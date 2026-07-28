export type ContentKind =
  | 'product'
  | 'feature'
  | 'solution'
  | 'use-case'
  | 'article'
  | 'paper'
  | 'page'
  | 'case-study';

export type EntityType = 'products' | 'features' | 'solutions' | 'use-cases';

export interface FolderMeta {
  type: 'collection' | 'page' | 'section';
  title?: string;
  description?: string;
  layout?: 'grid' | 'list' | 'prose' | 'hero' | 'network';
  sort?: 'date' | 'alphabetical' | 'manual';
}

export interface ContentMeta {
  title: string;
  date?: string;
  medium?: string;
  excerpt?: string;
  description?: string;
  author?: string;
  category?: string;
  tags?: string[];
  subtitle?: string;
  coverImage?: string;
  icon?: string;
  order?: number;
  heroFeatures?: { title: string; description: string }[];
  deepWorkFeatures?: { icon: string; title: string; description: string }[];
  pullQuote?: string;
  pullQuoteAttribution?: string;
  productRefs?: string[];
  featureRefs?: string[];
  solutionRefs?: string[];
  useCaseValueRefs?: string[];
  useCaseFieldRefs?: string[];
  isIndexable?: boolean;
  noindex?: boolean;
  contentKind?: ContentKind;
  format?: 'article' | 'paper' | 'page';
  [key: string]: any;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface ContentItem {
  type: 'file' | 'folder';
  path: string;
  slug: string;
  meta: ContentMeta;
  bodyHtml?: string;
  rawContent?: string;
  toc?: TocItem[];
  children?: ContentItem[];
  folderMeta?: FolderMeta;
}

export interface EntityPageModel {
  slug: string;
  section: EntityType;
  title: string;
  description: string;
  category?: string;
  icon?: string;
  order?: number;
  heroFeatures?: { title: string; description: string }[];
  deepWorkFeatures?: { icon: string; title: string; description: string }[];
  pullQuote?: string;
  pullQuoteAttribution?: string;
  bodyHtml: string;
  tableOfContents: TocItem[];
  relatedItems: { title: string; description: string; href: string; icon?: string }[];
  reverseEditorialItems: { title: string; date: string; excerpt: string; href: string }[];
}

export interface EditorialPageModel {
  slug: string;
  format: 'article' | 'paper';
  title: string;
  date?: string;
  author: string;
  category?: string;
  tags: string[];
  excerpt?: string;
  description?: string;
  subtitle?: string;
  coverImage?: string;
  bodyHtml: string;
  tableOfContents: TocItem[];
  readingTimeMinutes: number;
  pdfUrl: string | null;
}

export interface GeneralPageModel {
  slug: string;
  title: string;
  description?: string;
  excerpt?: string;
  category?: string;
  bodyHtml: string;
  tableOfContents?: TocItem[];
}
