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

    // 1. Root / homepage
    if (parts.length === 0) {
      if (window.location.hostname.startsWith('library.')) {
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

    // 2. Library index surface
    if (parts.length === 1 && parts[0] === 'library') {
      const libraryItems = getAllContent('library');
      setRenderState({ type: 'library-index', data: { items: libraryItems } });
      setLoading(false);
      return;
    }

    // 3. Resolve item or directory using getByPath
    const item = getByPath(parts);
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
            bodyHtml: item.bodyHtml || '',
            tableOfContents: item.toc || [],
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
        return <ArticleTemplate data={renderState.data.model} />;

      case 'paper':
        return <PaperTemplate data={renderState.data.model} />;

      case 'page':
        return <GeneralPageTemplate data={renderState.data} />;

      case 'library-index':
        return (
          <SharedSubdomainLayout libraryItems={renderState.data.items}>
            <div className="space-y-6">
              <header className="border-b border-white/10 pb-6">
                <h1 className="text-3xl font-bold text-slate-100">Library & Research</h1>
                <p className="text-slate-400 mt-2">
                  Whitepapers, benchmarking frameworks, and research papers from Jurnii.
                </p>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderState.data.items.map((item: ContentItem) => (
                  <a
                    key={item.slug}
                    href={`/library/${item.slug}`}
                    className="p-6 bg-slate-900/50 hover:bg-slate-800/80 border border-white/10 rounded-xl block space-y-3"
                  >
                    <span className="text-xs font-mono uppercase text-emerald-400">{item.meta.category || 'Paper'}</span>
                    <h2 className="text-xl font-bold text-slate-100">{item.meta.title}</h2>
                    <p className="text-sm text-slate-400">{item.meta.description || item.meta.excerpt}</p>
                  </a>
                ))}
              </div>
            </div>
          </SharedSubdomainLayout>
        );

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
