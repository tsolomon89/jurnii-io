import React, { useState } from 'react';
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
    className={`pill ${active ? 'solid' : ''}`}
    style={{
      cursor: 'pointer',
      textDecoration: 'none',
      background: active ? 'rgba(var(--jurnii-300-rgb), 0.1)' : 'transparent',
      color: active ? 'var(--jurnii-300)' : 'var(--muted-foreground)',
    }}
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
    <div className="library-layout">
      {/* Mobile top bar */}
      <div className="library-mobile-bar">
        <a href={getHomeHref()} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span style={{ color: 'var(--jurnii-400)', fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '18px' }}>Jurnii</span>
          <span className="pill" style={{ background: 'var(--concrete-950)', color: 'var(--concrete-300)', borderColor: 'var(--white-a-10)' }}>
            Library
          </span>
        </a>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'transparent', border: 'none', color: 'var(--concrete-300)', cursor: 'pointer', padding: '8px' }}
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div style={{ marginBottom: '32px' }}>
          <a href={getHomeHref()} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '8px' }}>
            <span style={{ color: 'var(--jurnii-400)', fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '24px' }}>Jurnii</span>
            <span className="pill" style={{ background: 'var(--concrete-950)', color: 'var(--jurnii-200)', borderColor: 'var(--white-a-10)' }}>
              Library
            </span>
          </a>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0 }}>
            Monographs, benchmarking frameworks, and research papers for iGaming operators.
          </p>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div className="eyebrow" style={{ marginBottom: '12px' }}>Research Domains</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
        <nav>
          <div className="eyebrow" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', width: '100%' }}>
            <span>Publications</span>
            <span style={{ background: 'var(--white-a-6)', padding: '2px 8px', borderRadius: '99px', fontSize: '10px' }}>{libraryItems.length}</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {libraryItems.map((item) => {
              const isActive = item.slug === currentSlug;
              return (
                <li key={item.slug}>
                  <a
                    href={getItemHref(item.slug)}
                    style={{
                      display: 'block', padding: '10px 14px', borderRadius: '12px', textDecoration: 'none', transition: 'all 150ms ease',
                      background: isActive ? 'rgba(var(--jurnii-300-rgb), 0.1)' : 'transparent',
                      border: isActive ? '1px solid rgba(var(--jurnii-300-rgb), 0.2)' : '1px solid transparent',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--white-a-6)'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontWeight: isActive ? '600' : '500', color: isActive ? 'var(--jurnii-200)' : 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.meta.title}
                      </span>
                      {item.meta.medium && (
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', background: 'var(--white-a-6)', padding: '2px 6px', borderRadius: '4px', color: 'var(--jurnii-400)', flexShrink: 0 }}>
                          {item.meta.medium}
                        </span>
                      )}
                    </div>
                    {item.meta.date && (
                      <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{item.meta.date}</div>
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

