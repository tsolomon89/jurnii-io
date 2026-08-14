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
import { resolveSurface, SURFACES } from '../routing/surface-utils';
import { resolveAliasPath } from '../routing/alias.js';
import { pushPageContext, pushEvent } from '../analytics/page-context.js';

interface ContentEngineAppProps {
  initialPath?: string;
}


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

    // A filter is not a navigation. GA4's "page changes based on browser history
    // events" must stay OFF for this property, or every pill click would be counted as
    // a second view of the library index. This event is what replaces it.
    pushEvent('filter_apply', {
      filter_scope: 'library',
      filter_value: category ?? '(all)',
    });
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
    
    const resolvedPath = resolveAliasPath(rawPath);
    const parts = resolvedPath.split('/').filter(Boolean);
    const hostSurface = resolveSurface(typeof window !== 'undefined' ? window.location.hostname : '');
    const isLibrarySubdomain = hostSurface.role === 'library';

    /**
     * Announce the page to the tag layer, and give the document its own title.
     *
     * This is the only place the site knows what page it is on, so it is the only place
     * that can answer the question. It runs at each exit of this effect rather than in
     * the render pass, because the pageview must fire once identity is settled — not on
     * every re-render.
     */
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const announce = (ctx: Record<string, unknown>) =>
      pushPageContext({
        pathname: rawPath,
        search,
        surface: hostSurface.role,
        default_title: hostSurface.defaultTitle,
        description: hostSurface.defaultDescription,
        ...ctx,
      });

    // 1. Root / homepage
    if (parts.length === 0) {
      if (isLibrarySubdomain) {
        const libraryItems = getAllContent('library');
        setRenderState({ type: 'library-index', data: { items: libraryItems } });
        announce({
          page_type: 'library-index',
          page_title: hostSurface.defaultTitle,
          description: hostSurface.defaultDescription,
          content_group: 'resources',
        });
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
          announce({
            page_type: 'page',
            page_title: item.meta.title,
            description: item.meta.description,
            content_slug: item.slug,
            content_category: item.meta.category,
            content_group: 'home',
            template: 'GeneralPageTemplate',
          });
        }
      }
      setLoading(false);
      return;
    }

    // 2. Library index surface (/library)
    if (parts.length === 1 && parts[0] === 'library') {
      const libraryItems = getAllContent('library');
      setRenderState({ type: 'library-index', data: { items: libraryItems } });
      announce({
        page_type: 'library-index',
        // Not hostSurface.defaultTitle here: on the www host that is the HOMEPAGE title,
        // which would leave /library reporting as the front page.
        page_title: SURFACES.library.defaultTitle,
        description: SURFACES.library.defaultDescription,
        content_group: 'resources',
        // The filter is reported as a dimension rather than left on page_location, so
        // the index stays one row instead of one row per category.
        content_filter: new URLSearchParams(search).get('cat') || undefined,
      });
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
        announce({
          page_type: 'directory',
          page_title: item.meta.title || item.slug.toUpperCase(),
          description: item.meta.description,
          content_section: item.slug,
          content_group: item.slug,
          template: 'EntityDirectoryTemplate',
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
          announce({
            page_type: pres.format === 'paper' ? 'paper' : 'article',
            page_title: item.meta.title,
            description: item.meta.description || item.meta.excerpt,
            content_section: 'library',
            content_slug: item.slug,
            content_category: item.meta.category,
            content_medium: item.meta.medium,
            content_author: item.meta.author,
            content_group: 'resources',
            template: pres.templateClass,
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
          announce({
            page_type: 'page',
            page_title: item.meta.title,
            description: item.meta.description,
            content_slug: item.slug,
            content_category: item.meta.category,
            content_group: 'home',
            template: 'GeneralPageTemplate',
          });
        } else {
          // Entity page (product, feature, solution, use-case)
          const matchedSection = (item.section || [...parts].reverse().find((seg) => ['products', 'features', 'solutions', 'use-cases'].includes(seg)) || 'features') as EntityType;
          const richData: EntityPageModel = resolveRichPageData(item, matchedSection);
          setRenderState({ type: 'entity', data: richData });
          announce({
            page_type: 'entity',
            page_title: item.meta.title,
            description: item.meta.description,
            content_section: matchedSection,
            content_slug: item.slug,
            content_category: item.meta.category,
            content_group: matchedSection,
            template: 'EntityPageTemplate',
          });
        }
      }
      setLoading(false);
      return;
    }

    setRenderState({ type: 'not-found' });
    // A 404 must still register, or the alias fallback's dead ends are invisible.
    announce({ page_type: 'not-found', page_title: 'Page not found' });
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
            activeCategory={renderState.data.model.category}
          >
            <ArticleTemplate data={renderState.data.model} />
          </SharedSubdomainLayout>
        );

      case 'paper':
        return (
          <SharedSubdomainLayout
            libraryItems={renderState.data.libraryItems}
            currentSlug={renderState.data.model.slug}
            activeCategory={renderState.data.model.category}
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

