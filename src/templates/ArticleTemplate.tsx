import React from 'react';
import { EditorialPageModel } from '../content-engine/types';
import { Prose } from '../components/Prose';

interface ArticleTemplateProps {
  data: EditorialPageModel;
}

export const ArticleTemplate: React.FC<ArticleTemplateProps> = ({ data }) => {
  return (
    <article className="min-h-screen bg-[#030712] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="border-b border-white/10 pb-8 space-y-4">
          <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
            {data.category && (
              <span className="px-2.5 py-1 uppercase tracking-wider text-sky-400 bg-sky-950/60 rounded-full border border-sky-800/40">
                {data.category}
              </span>
            )}
            {data.date && <span>{data.date}</span>}
            <span>• {data.readingTimeMinutes} min read</span>
            <span>• By {data.author}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-100">
            {data.title}
          </h1>
          {data.excerpt && (
            <p className="text-xl text-slate-300 italic font-serif leading-relaxed">
              {data.excerpt}
            </p>
          )}
        </header>

        {data.tableOfContents && data.tableOfContents.length > 0 && (
          <nav className="bg-slate-900/60 p-6 rounded-xl border border-white/10 space-y-3">
            <h2 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-bold">
              Table of Contents
            </h2>
            <ul className="space-y-1.5 text-sm">
              {data.tableOfContents.map((toc) => (
                <li
                  key={toc.id}
                  style={{ paddingLeft: `${(toc.level - 1) * 1}rem` }}
                >
                  <a
                    href={`#${toc.id}`}
                    className="text-slate-300 hover:text-sky-400 transition"
                  >
                    {toc.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <main className="bg-slate-900/20 p-8 rounded-2xl border border-white/5">
          <Prose html={data.bodyHtml} />
        </main>
      </div>
    </article>
  );
};
