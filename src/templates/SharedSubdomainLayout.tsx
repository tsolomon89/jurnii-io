import React from 'react';
import { ContentItem } from '../content-engine/types';

interface SharedSubdomainLayoutProps {
  children: React.ReactNode;
  libraryItems?: ContentItem[];
  currentSlug?: string;
}

export const SharedSubdomainLayout: React.FC<SharedSubdomainLayoutProps> = ({
  children,
  libraryItems = [],
  currentSlug,
}) => {
  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col md:flex-row">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-72 bg-slate-950 border-r border-white/10 p-6 flex-shrink-0 space-y-6">
        <div className="space-y-1">
          <a href="/library" className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <span className="text-sky-400 font-mono">Jurnii</span>
            <span className="text-xs uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Library
            </span>
          </a>
          <p className="text-xs text-slate-400">Research & Publications</p>
        </div>

        <nav className="space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
            Publications Archive
          </div>
          <ul className="space-y-2 text-sm">
            {libraryItems.map((item) => {
              const isActive = item.slug === currentSlug;
              return (
                <li key={item.slug}>
                  <a
                    href={`/library/${item.slug}`}
                    className={`block py-1.5 px-3 rounded-lg transition ${
                      isActive
                        ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                    }`}
                  >
                    <div className="truncate">{item.meta.title}</div>
                    {item.meta.medium && (
                      <div className="text-[10px] text-slate-500 uppercase font-mono">
                        {item.meta.medium}
                      </div>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 p-6 md:p-12">{children}</main>
    </div>
  );
};
