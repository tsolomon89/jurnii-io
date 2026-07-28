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

export const ContentEngineApp: React.FC<ContentEngineAppProps> = ({ initialPath }) => {
  const [loading, setLoading] = useState(true);
  const [renderState, setRenderState] = useState<{
    type: 'entity' | 'directory' | 'article' | 'paper' | 'page' | 'library-index' | 'not-found';
    data?: any;
  }>({ type: 'not-found' });

  useEffect(() => {
    const rawPath = initialPath || window.location.pathname;
    const cleanPath = rawPath.replace(/^\//, '').replace(/\/$/, '').replace(/\.html$/, '');
    const resolvedPath = ALIAS_MAP[cleanPath] || cleanPath;
    const parts = resolvedPath.split('/').filter(Boolean);

    // 1. Root / homepage or default
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

    // 2. Library surface / /library/[slug]
    if (parts[0] === 'library') {
      const slug = parts[parts.length - 1];
      const libraryItems = getAllContent('library');

      if (parts.length === 1 || slug === 'library') {
        setRenderState({ type: 'library-index', data: { items: libraryItems } });
        setLoading(false);
        return;
      }

      const item = getContentBySlug(slug, ['library']);
      if (item) {
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
      } else {
        setRenderState({ type: 'not-found' });
      }
      setLoading(false);
      return;
    }

    // 3. Entity family routes (/products, /features, /solutions, /use-cases)
    const entitySections = ['products', 'features', 'solutions', 'use-cases'];
    if (entitySections.includes(parts[0])) {
      const section = parts[0] as EntityType;
      const isDirectory = parts.length === 1;

      if (isDirectory) {
        // Directory collection view
        const dirItem = getByPath(['www', section]);
        const items = dirItem && dirItem.children ? dirItem.children : [];
        setRenderState({
          type: 'directory',
          data: {
            title: dirItem?.meta.title || section.toUpperCase(),
            description: dirItem?.meta.description,
            items,
            sectionPath: section,
          },
        });
      } else {
        // Entity detail view (last segment handles nested routes like /use-cases/company-sizes/enterprise)
        const targetSlug = parts[parts.length - 1];
        const item = getByPath(['www', section, targetSlug]);
        if (item) {
          const richData: EntityPageModel = resolveRichPageData(item, section);
          setRenderState({ type: 'entity', data: richData });
        } else {
          setRenderState({ type: 'not-found' });
        }
      }
      setLoading(false);
      return;
    }

    // 4. General pages (/about, /privacy, /terms, /contact-us, /compare)
    const pageSlug = parts[parts.length - 1];
    const pageItem = getByPath(['www', 'pages', pageSlug]) || getByPath(['www', pageSlug]);
    if (pageItem) {
      const genModel: GeneralPageModel = {
        slug: pageItem.slug,
        title: pageItem.meta.title,
        description: pageItem.meta.description,
        excerpt: pageItem.meta.excerpt,
        category: pageItem.meta.category,
        bodyHtml: pageItem.bodyHtml || '',
      };
      setRenderState({ type: 'page', data: genModel });
    } else {
      setRenderState({ type: 'not-found' });
    }

    setLoading(false);
  }, [initialPath]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-400 flex items-center justify-center font-mono text-sm">
        Loading Jurnii Content...
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-slate-100">Library Publications & Research</h1>
              <p className="text-slate-400 text-sm mt-1">
                Monographs, formal proofs, and technical essays.
              </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderState.data.items.map((item: ContentItem) => (
                <a
                  key={item.slug}
                  href={`/library/${item.slug}`}
                  className="block p-6 bg-slate-900/50 hover:bg-slate-800/80 border border-white/10 rounded-xl transition space-y-2"
                >
                  <span className="text-xs uppercase font-mono text-sky-400">
                    {item.meta.medium || 'Article'}
                  </span>
                  <h3 className="text-xl font-bold text-slate-100">{item.meta.title}</h3>
                  <p className="text-sm text-slate-400 line-clamp-3">
                    {item.meta.excerpt || item.meta.description || ''}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </SharedSubdomainLayout>
      );

    case 'not-found':
    default:
      return (
        <div className="min-h-screen bg-[#030712] text-slate-300 flex flex-col items-center justify-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-100">404 — Page Not Found</h1>
          <p className="text-sm text-slate-400">The requested content route does not exist.</p>
          <a href="/" className="px-4 py-2 bg-sky-500 text-slate-950 font-bold rounded-lg text-sm">
            Return Home
          </a>
        </div>
      );
  }
};
