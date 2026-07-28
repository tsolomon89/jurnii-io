import React from 'react';
import { ContentItem } from '../content-engine/types';

interface EntityDirectoryTemplateProps {
  title: string;
  description?: string;
  items: ContentItem[];
  sectionPath: string;
}

export const EntityDirectoryTemplate: React.FC<EntityDirectoryTemplateProps> = ({
  title,
  description,
  items,
  sectionPath,
}) => {
  return (
    <div className="min-h-screen bg-[#030712] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="border-b border-white/10 pb-8 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-slate-100">{title}</h1>
          {description && (
            <p className="text-xl text-slate-400 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <a
              key={item.slug}
              href={`/${sectionPath}/${item.slug}`}
              className="group block p-6 bg-slate-900/50 hover:bg-slate-800/80 border border-white/10 hover:border-sky-500/50 rounded-xl transition duration-200 shadow-lg space-y-3"
            >
              {item.meta.category && (
                <span className="text-xs uppercase tracking-wider font-semibold text-sky-400">
                  {item.meta.category}
                </span>
              )}
              <h2 className="text-xl font-bold text-slate-100 group-hover:text-sky-300">
                {item.meta.title}
              </h2>
              <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">
                {item.meta.excerpt || item.meta.description || ''}
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
