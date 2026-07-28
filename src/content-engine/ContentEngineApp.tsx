import React, { useEffect, useState } from 'react';
import {
  ContentItem,
  EntityPageModel,
  EditorialPageModel,
  GeneralPageModel,
  EntityType,
} from './types';
import { getByPath, getContentBySlug, getAllContent } from './utils/markdown';
import { resolveRichPageData, estimateReadTime } from './utils/rich-page-data';
import { resolveMediumPresentation } from '../routing/medium-presentation';
import { getPdfUrl } from './utils/markdown';

import { EntityPageTemplate } from '../templates/EntityPageTemplate';
import { EntityDirectoryTemplate } from '../templates/EntityDirectoryTemplate';
import { ArticleTemplate } from '../templates/ArticleTemplate';
import { PaperTemplate } from '../templates/PaperTemplate';
import { GeneralPageTemplate } from '../templates/GeneralPageTemplate';
import { SharedSubdomainLayout } from '../templates/SharedSubdomainLayout';

import { processHeadings } from './utils/rich-page-data';
import { resolveSurface } from '../routing/surface-utils';

interface ContentEngineAppProps {
  initialPath?: string;
}

const ALIAS_MAP: Record<string, string> = {
  '360': 'products/jurnii-360',
  'jurnii-360': 'products/jurnii-360',
  'ux': 'products/jurnii-ux',
  'jurnii-ux': 'products/jurnii-ux',
  'mmm': 'products/jurnii-mmm',
  'jurnii-mmm': 'products/jurnii-mmm',
  'contact': 'contact-us',
  'book': 'contact-us',
  'resources': 'library',
  'resources.html': 'library',
  'resource': 'library',
};


const PageChromeWrapper: React.FC<{ active?: string; children: React.ReactNode }> = ({ active = 'home', children }) => {
  const PageChrome = (window as any).PageChrome;
  if (typeof PageChrome === 'function') {
    return <PageChrome active={active}>{children}</PageChrome>;
  }
  return <div className="site-wrapper min-h-screen bg-[#030712] text-slate-100">{children}</div>;
};

export const ContentEngineApp: React.FC<ContentEngineAppProps> = ({ initialPath }) => {
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [renderState, setRenderState] = useState<{
    type: 'entity' | 'directory' | 'article' | 'paper' | 'page' | 'library-index' | 'not-found';
    data?: any;
  }>({ type: 'not-found' });

  useEffect(() => {
    const rawPath = initialPath || window.location.pathname;
    const cleanPath = rawPath.replace(/^\//, '').replace(/\/$/, '').replace(/\.html$/, '');
    const lastSeg = cleanPath.split('/').pop() || '';
    const resolvedPath = ALIAS_MAP[cleanPath] || ALIAS_MAP[lastSeg] || cleanPath;
    const parts = resolvedPath.split('/').filter(Boolean);
    const hostSurface = resolveSurface(typeof window !== 'undefined' ? window.location.hostname : '');
    const isLibrarySubdomain = hostSurface.role === 'library';

    // 1. Root / homepage
    if (parts.length === 0) {
      if (isLibrarySubdomain) {
        const libraryItems = getAllContent('library');
        setRenderState({ type: 'library-index', data: { items: libraryItems } });
      } else {
        const item = getByPath(['www', 'pages', 'about']);
        if (item) {
          const genModel: GeneralPageModel = {
            slug: item.slug,
            title: item.meta.title,
            description: item.meta.description,
            excerpt: item.meta.excerpt,
            category: item.meta.category,
            bodyHtml: item.bodyHtml || '',
          };
          setRenderState({ type: 'page', data: genModel });
        }
      }
      setLoading(false);
      return;
    }

    // 2. Library index surface (/library)
    if (parts.length === 1 && parts[0] === 'library') {
      const libraryItems = getAllContent('library');
      setRenderState({ type: 'library-index', data: { items: libraryItems } });
      setLoading(false);
      return;
    }

    // 3. Resolve item or directory using getByPath
    const searchParts = isLibrarySubdomain && parts[0] !== 'library' ? ['library', ...parts] : parts;
    const item = getByPath(searchParts) || getByPath(parts);

    if (item) {
      if (item.type === 'folder') {
        const items = item.children || [];
        setRenderState({
          type: 'directory',
          data: {
            title: item.meta.title || item.slug.toUpperCase(),
            description: item.meta.description,
            items,
            sectionPath: item.slug,
          },
        });
      } else {
        const p = item.path.replace(/\\/g, '/');
        if (p.includes('/content/library/')) {
          const libraryItems = getAllContent('library');
          const pres = resolveMediumPresentation(item.meta);
          const { html: processedHtml, toc } = processHeadings(item.bodyHtml || '');
          const edModel: EditorialPageModel = {
            slug: item.slug,
            format: pres.format as 'article' | 'paper',
            title: item.meta.title,
            date: item.meta.date,
            author: item.meta.author || 'Timothy Solomon',
            category: item.meta.category,
            tags: item.meta.tags || [],
            excerpt: item.meta.excerpt,
            description: item.meta.description,
            subtitle: item.meta.subtitle,
            coverImage: item.meta.coverImage,
            bodyHtml: processedHtml,
            tableOfContents: toc,
            readingTimeMinutes: estimateReadTime(item.bodyHtml || ''),
            pdfUrl: getPdfUrl(item.slug),
          };
          setRenderState({
            type: pres.format === 'paper' ? 'paper' : 'article',
            data: { model: edModel, libraryItems },
          });
        } else if (p.includes('/content/www/pages/')) {
          const genModel: GeneralPageModel = {
            slug: item.slug,
            title: item.meta.title,
            description: item.meta.description,
            excerpt: item.meta.excerpt,
            category: item.meta.category,
            bodyHtml: item.bodyHtml || '',
          };
          setRenderState({ type: 'page', data: genModel });
        } else {
          // Entity page (product, feature, solution, use-case)
          const matchedSection = (item.section || [...parts].reverse().find((seg) => ['products', 'features', 'solutions', 'use-cases'].includes(seg)) || 'features') as EntityType;
          const richData: EntityPageModel = resolveRichPageData(item, matchedSection);
          setRenderState({ type: 'entity', data: richData });
        }
      }
      setLoading(false);
      return;
    }

    setRenderState({ type: 'not-found' });
    setLoading(false);
  }, [initialPath]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-400 flex items-center justify-center font-mono text-sm">
        Loading Jurnii Content...
      </div>
    );
  }

  let activeNav = 'home';
  if (renderState.type === 'entity' || renderState.type === 'directory') {
    activeNav = renderState.data.section || renderState.data.sectionPath || 'products';
  } else if (renderState.type === 'article' || renderState.type === 'paper' || renderState.type === 'library-index') {
    activeNav = 'resources';
  }

  const renderInnerContent = () => {
    switch (renderState.type) {
      case 'entity':
        return <EntityPageTemplate data={renderState.data} />;

      case 'directory':
        return (
          <EntityDirectoryTemplate
            title={renderState.data.title}
            description={renderState.data.description}
            items={renderState.data.items}
            sectionPath={renderState.data.sectionPath}
          />
        );

      case 'article':
        return (
          <SharedSubdomainLayout
            libraryItems={renderState.data.libraryItems}
            currentSlug={renderState.data.model.slug}
            activeCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          >
            <ArticleTemplate data={renderState.data.model} />
          </SharedSubdomainLayout>
        );

      case 'paper':
        return (
          <SharedSubdomainLayout
            libraryItems={renderState.data.libraryItems}
            currentSlug={renderState.data.model.slug}
            activeCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          >
            <PaperTemplate data={renderState.data.model} />
          </SharedSubdomainLayout>
        );

      case 'page':
        return <GeneralPageTemplate data={renderState.data} />;

      case 'library-index': {
        const filteredItems = selectedCategory
          ? renderState.data.items.filter((item: ContentItem) => item.meta.category === selectedCategory)
          : renderState.data.items;
        const isLibrarySubdomain = typeof window !== 'undefined' && resolveSurface(window.location.hostname).role === 'library';

        return (
          <SharedSubdomainLayout
            libraryItems={renderState.data.items}
            activeCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          >
            <div className="space-y-8">
              <header className="border-b border-white/10 pb-6">
                <div className="flex items-center space-x-3 text-xs font-mono uppercase tracking-widest text-sky-400">
                  <span>Jurnii Intelligence Infrastructure</span>
                  <span>•</span>
                  <span>Research & Publications</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mt-3">
                  Library & Monograph Archive
                </h1>
                <p className="text-slate-400 mt-2 max-w-2xl text-base leading-relaxed">
                  Peer-reviewed whitepapers, quantitative benchmarking frameworks, and analytical essays on iGaming commercial performance.
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredItems.map((item: ContentItem) => {
                  const href = isLibrarySubdomain ? `/${item.slug}` : `/library/${item.slug}`;
                  return (
                    <a
                      key={item.slug}
                      href={href}
                      className="p-6 bg-slate-900/50 hover:bg-slate-800/80 border border-white/10 hover:border-sky-500/40 rounded-2xl block space-y-4 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase font-semibold text-sky-400 bg-sky-950/60 px-2.5 py-1 rounded-full border border-sky-800/30">
                          {item.meta.category || 'Paper'}
                        </span>
                        {item.meta.medium && (
                          <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                            {item.meta.medium}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-slate-100 group-hover:text-sky-300 transition">
                        {item.meta.title}
                      </h2>
                      <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                        {item.meta.description || item.meta.excerpt}
                      </p>
                      {item.meta.date && (
                        <div className="text-xs text-slate-400 font-mono pt-2 border-t border-white/5 flex items-center justify-between">
                          <span>Published {item.meta.date}</span>
                          <span className="text-sky-400 font-sans font-medium group-hover:translate-x-1 transition-transform inline-flex items-center">
                            Read Monograph &rarr;
                          </span>
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          </SharedSubdomainLayout>
        );
      }

      case 'not-found':
      default:
        return (
          <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
            <h1 className="text-4xl font-bold text-slate-100">404 - Page Not Found</h1>
            <p className="text-slate-400">The requested intelligence resource could not be found.</p>
            <a href="/" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium rounded-lg transition">
              Return to Platform Overview
            </a>
          </div>
        );
    }
  };

  return <PageChromeWrapper active={activeNav}>{renderInnerContent()}</PageChromeWrapper>;
};

