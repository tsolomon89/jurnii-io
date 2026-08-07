import React, { useCallback, useEffect, useState } from 'react';
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

  /**
   * The filter lives in the URL, so `?cat=Playbook` is shareable and the browser's
   * back button steps through filters. The sidebar pill is a plain link everywhere
   * else; here it is intercepted so the index filters without a reload.
   */
  const selectCategory = useCallback((category?: string) => {
    setSelectedCategory(category);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (category) url.searchParams.set('cat', category);
    else url.searchParams.delete('cat');
    window.history.pushState({ cat: category ?? null }, '', url);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      setSelectedCategory(new URLSearchParams(window.location.search).get('cat') ?? undefined);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [renderState, setRenderState] = useState<{
    type: 'entity' | 'directory' | 'article' | 'paper' | 'page' | 'library-index' | 'not-found';
    data?: any;
  }>({ type: 'not-found' });

  useEffect(() => {
    const rawPath = initialPath || window.location.pathname;
    
    // Parse query params for category filter
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('cat')) {
        setSelectedCategory(searchParams.get('cat')!);
      }
    }
    
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
            author: item.meta.author || 'Jurnii Research',
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
      <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
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
          >
            <ArticleTemplate data={renderState.data.model} />
          </SharedSubdomainLayout>
        );

      case 'paper':
        return (
          <SharedSubdomainLayout
            libraryItems={renderState.data.libraryItems}
            currentSlug={renderState.data.model.slug}
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
            onSelectCategory={selectCategory}
          >
            <div>
              <header className="library-header">
                <div className="library-header-meta">
                  <span>Jurnii Intelligence Infrastructure</span>
                  <span>•</span>
                  <span>Research & Publications</span>
                </div>
                <h1>
                  Library & Monograph Archive
                </h1>
                <p>
                  Peer-reviewed whitepapers, quantitative benchmarking frameworks, and analytical essays on iGaming commercial performance.
                </p>
              </header>

              <div className="library-card-grid">
                {filteredItems.map((item: ContentItem) => {
                  const href = isLibrarySubdomain ? `/${item.slug}` : `/library/${item.slug}`;
                  return (
                    <a
                      key={item.slug}
                      href={href}
                      className="library-card"
                    >
                      {/* Eleven library articles were written for this site and never
                          had Webflow artwork to migrate. They cluster into whole
                          categories, so without a placeholder a filtered view like
                          ?cat=Playbook renders as an all-text grid that reads as
                          broken rather than as deliberate. */}
                      {item.meta.coverImage ? (
                        <div className="library-card-cover">
                          <img src={item.meta.coverImage} alt="" loading="lazy" />
                        </div>
                      ) : (
                        <div className="library-card-cover is-placeholder" aria-hidden="true" />
                      )}
                      <div className="library-card-meta">
                        <span className="pill solid">
                          {item.meta.category || 'Paper'}
                        </span>
                        {item.meta.medium && (
                          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>
                            {item.meta.medium}
                          </span>
                        )}
                      </div>
                      <h2>
                        {item.meta.title}
                      </h2>
                      <p>
                        {item.meta.description || item.meta.excerpt}
                      </p>
                      {item.meta.date && (
                        <div className="library-card-footer">
                          <span>Published {item.meta.date}</span>
                          <span>
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
          <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-6)', gap: 'var(--spacing-4)' }}>
            <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 'bold', margin: 0 }}>404 - Page Not Found</h1>
            <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>The requested intelligence resource could not be found.</p>
            <a href="/" className="btn primary lg" style={{ marginTop: 'var(--spacing-4)' }}>
              Return to Platform Overview
            </a>
          </div>
        );
    }
  };

  return <PageChromeWrapper active={activeNav}>{renderInnerContent()}</PageChromeWrapper>;
};

