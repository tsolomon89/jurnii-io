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

  // Collect unique categories across library items
  const categories = Array.from(
    new Set(libraryItems.map((item) => item.meta.category).filter(Boolean) as string[])
  );

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-950 border-b border-white/10">
        <a href={getHomeHref()} className="flex items-center space-x-2">
          <span className="text-sky-400 font-mono font-bold text-lg">Jurnii</span>
          <span className="text-xs uppercase tracking-wider text-slate-300 bg-sky-950 px-2 py-0.5 rounded border border-sky-800/40 font-mono">
            Library
          </span>
        </a>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-400 hover:text-white focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar navigation */}
      <aside
        className={`${
          mobileOpen ? 'block' : 'hidden'
        } md:block w-full md:w-80 bg-slate-950 border-r border-white/10 p-6 flex-shrink-0 space-y-8`}
      >
        <div className="space-y-2">
          <a href={getHomeHref()} className="text-2xl font-bold text-slate-100 flex items-center space-x-2.5">
            <span className="text-sky-400 font-mono">Jurnii</span>
            <span className="text-xs uppercase tracking-widest text-sky-300 bg-sky-950/80 px-2.5 py-1 rounded border border-sky-800/40 font-mono font-semibold">
              Library
            </span>
          </a>
          <p className="text-xs text-slate-400 leading-relaxed">
            Monographs, benchmarking frameworks, and research papers for iGaming operators.
          </p>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-500 font-semibold">
              Research Domains
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSelectCategory && onSelectCategory(undefined)}
                className={`text-xs px-3 py-1 rounded-full border transition ${
                  !activeCategory
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-medium'
                    : 'bg-slate-900 text-slate-400 border-white/10 hover:text-slate-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onSelectCategory && onSelectCategory(cat)}
                  className={`text-xs px-3 py-1 rounded-full border transition ${
                    activeCategory === cat
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-medium'
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Publications Archive */}
        <nav className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-500 font-semibold flex items-center justify-between">
            <span>Publications</span>
            <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full font-mono">
              {libraryItems.length}
            </span>
          </div>
          <ul className="space-y-2 text-sm">
            {libraryItems.map((item) => {
              const isActive = item.slug === currentSlug;
              return (
                <li key={item.slug}>
                  <a
                    href={getItemHref(item.slug)}
                    className={`block py-2.5 px-3.5 rounded-xl transition ${
                      isActive
                        ? 'bg-sky-500/20 text-sky-200 font-semibold border border-sky-500/30 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between space-x-2">
                      <span className="truncate font-medium">{item.meta.title}</span>
                      {item.meta.medium && (
                        <span className="text-[9px] text-sky-400 uppercase font-mono bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/30 flex-shrink-0">
                          {item.meta.medium}
                        </span>
                      )}
                    </div>
                    {item.meta.date && (
                      <div className="text-[11px] text-slate-400 mt-1 font-mono">{item.meta.date}</div>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 p-6 sm:p-8 lg:p-12 max-w-6xl">{children}</main>
    </div>
  );
};
