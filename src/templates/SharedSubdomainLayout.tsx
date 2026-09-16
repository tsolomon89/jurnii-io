import React, { useEffect, useRef, useState } from 'react';
import { ContentItem } from '../content-engine/types';
import { resolveSurface } from '../routing/surface-utils';

interface SharedSubdomainLayoutProps {
  children: React.ReactNode;
  libraryItems?: ContentItem[];
  currentSlug?: string;
  activeCategory?: string;
  onSelectCategory?: (category?: string) => void;
}

/**
 * A real link, always. The sidebar renders on article pages too, where there is no
 * list to filter — as a button the pill silently did nothing. With an href it
 * navigates back to the filtered index from anywhere, and stays middle-clickable
 * and shareable. `onSelect` is the enhancement: where a list *is* on screen, the
 * index filters in place and rewrites the URL instead of reloading.
 */
const CategoryPill: React.FC<{ href: string; label: string; active: boolean; onSelect?: () => void }> = ({
  href,
  label,
  active,
  onSelect,
}) => (
  <a
    href={href}
    aria-current={active ? 'true' : undefined}
    onClick={(e) => {
      if (!onSelect || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      onSelect();
    }}
    className={`pill library-domain-pill${active ? ' is-active' : ''}`}
  >
    {label}
  </a>
);

export const SharedSubdomainLayout: React.FC<SharedSubdomainLayoutProps> = ({
  children,
  libraryItems = [],
  currentSlug,
  activeCategory,
  onSelectCategory,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLibrarySubdomain = typeof window !== 'undefined' && resolveSurface(window.location.hostname).role === 'library';
  const layoutRef = useRef<HTMLDivElement>(null);

  /**
   * The pinned sidebar has to stop below the site nav, which is itself sticky —
   * parked at the top of the viewport it would slide under that blurred bar and
   * take the wordmark with it. The nav's height is intrinsic, and some surfaces
   * render the library without one at all, so it is measured rather than written
   * down, and re-measured when it reflows.
   */
  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;

    const nav = document.querySelector('header.nav');
    if (!nav) {
      layout.style.setProperty('--library-sticky-top', '0px');
      return;
    }

    const sync = () => layout.style.setProperty('--library-sticky-top', `${Math.round(nav.getBoundingClientRect().height)}px`);
    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  /**
   * The archive is a scroll box on desktop now, so the entry for the post being
   * read can open below its fold — a highlight the reader cannot see is no signal
   * at all. Centre it in the box, moving that box alone rather than page scroll.
   * The guard covers mobile, where the list still runs at full height.
   */
  useEffect(() => {
    if (!currentSlug) return;
    const list = layoutRef.current?.querySelector<HTMLElement>('.library-nav-list');
    const active = list?.querySelector<HTMLElement>('.library-nav-item.is-active');
    if (!list || !active || list.scrollHeight <= list.clientHeight) return;

    const offset = active.getBoundingClientRect().top - list.getBoundingClientRect().top;
    list.scrollTop += offset - (list.clientHeight - active.getBoundingClientRect().height) / 2;
  }, [currentSlug]);

  const getItemHref = (slug: string) => {
    return isLibrarySubdomain ? `/${slug}` : `/library/${slug}`;
  };

  const getHomeHref = () => {
    return isLibrarySubdomain ? '/' : '/library';
  };

  const categories = Array.from(
    new Set(libraryItems.map((item) => item.meta.category).filter(Boolean) as string[])
  );

  return (
    <div className="library-layout" ref={layoutRef}>
      {/* Mobile top bar */}
      <div className="library-mobile-bar">
        <a href={getHomeHref()} className="library-brand">
          <span className="library-wordmark">Jurnii</span>
          <span className="pill library-badge">Library</span>
        </a>
        <button
          type="button"
          className="library-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close library menu' : 'Open library menu'}
          aria-expanded={mobileOpen}
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar navigation */}
      <aside className={`library-sidebar ${mobileOpen ? '' : 'mobile-hidden'}`}>
        <div className="library-sidebar-head">
          <a href={getHomeHref()} className="library-brand">
            <span className="library-wordmark">Jurnii</span>
            <span className="pill library-badge">Library</span>
          </a>
          <p className="library-sidebar-lede">
            Monographs, benchmarking frameworks, and research papers for iGaming operators.
          </p>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div className="library-sidebar-filters" role="group" aria-label="Research domains">
            <div className="eyebrow">Research Domains</div>
            <div className="library-domain-pills">
              <CategoryPill href={getHomeHref()} label="All" active={!activeCategory} onSelect={onSelectCategory && (() => onSelectCategory(undefined))} />
              {categories.map((cat) => (
                <CategoryPill
                  key={cat}
                  href={`${getHomeHref()}?cat=${encodeURIComponent(cat)}`}
                  label={cat}
                  active={activeCategory === cat}
                  onSelect={onSelectCategory && (() => onSelectCategory(cat))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Publications Archive */}
        <nav className="library-nav" aria-label="Publications">
          <div className="eyebrow library-nav-head">
            <span>Publications</span>
            <span className="library-nav-count">{libraryItems.length}</span>
          </div>
          <ul className="library-nav-list">
            {libraryItems.map((item) => {
              const isActive = item.slug === currentSlug;
              return (
                <li key={item.slug}>
                  <a
                    href={getItemHref(item.slug)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`library-nav-item${isActive ? ' is-active' : ''}`}
                  >
                    <div className="library-nav-item-row">
                      <span className="library-nav-title">{item.meta.title}</span>
                      {item.meta.medium && (
                        <span className="library-nav-medium">{item.meta.medium}</span>
                      )}
                    </div>
                    {item.meta.date && (
                      <div className="library-nav-date">{item.meta.date}</div>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content area */}
      <main className="library-main">
        {children}
      </main>
    </div>
  );
};

