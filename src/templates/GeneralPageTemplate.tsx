import React from 'react';
import { GeneralPageModel } from '../content-engine/types';
import { Prose } from '../components/Prose';

interface GeneralPageTemplateProps {
  data: GeneralPageModel;
}

export const GeneralPageTemplate: React.FC<GeneralPageTemplateProps> = ({ data }) => {
  return (
    <article className="min-h-screen bg-[#030712] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="border-b border-white/10 pb-8 space-y-4">
          {data.category && (
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950/60 rounded-full border border-sky-800/40">
              {data.category}
            </span>
          )}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-100">
            {data.title}
          </h1>
          {data.excerpt && (
            <p className="text-xl text-slate-400 leading-relaxed">{data.excerpt}</p>
          )}
        </header>

        <main className="bg-slate-900/30 p-8 rounded-2xl border border-white/5">
          <Prose html={data.bodyHtml} />
        </main>
      </div>
    </article>
  );
};
