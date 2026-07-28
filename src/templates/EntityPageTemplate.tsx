import React, { useEffect } from 'react';
import { EntityPageModel } from '../content-engine/types';
import { Prose } from '../components/Prose';

interface EntityPageTemplateProps {
  data: EntityPageModel;
}

export const EntityPageTemplate: React.FC<EntityPageTemplateProps> = ({ data }) => {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }, [data]);

  return (
    <article className="min-h-screen bg-[#030712] text-slate-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-slate-950">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* 1. Hero Region */}
        <header className="relative p-8 sm:p-12 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl space-y-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center space-x-3">
            {data.category && (
              <span className="inline-flex items-center px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 rounded-full border border-emerald-500/30">
                {data.category}
              </span>
            )}
            <span className="text-xs uppercase font-mono tracking-widest text-slate-400">
              {data.section}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            {data.title}
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl leading-relaxed">
            {data.description}
          </p>
        </header>

        {/* 2. Optional Hero Features Highlights */}
        {data.heroFeatures && data.heroFeatures.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.heroFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-white/10 hover:border-emerald-500/40 transition duration-200 space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <i data-lucide={feat.icon || 'zap'} className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{feat.title}</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </section>
        )}

        {/* 3. Pull Quote Banner */}
        {data.pullQuote && (
          <blockquote className="relative p-8 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40 border-l-4 border-emerald-500 border-y border-r border-white/10 space-y-4">
            <p className="text-lg sm:text-xl font-medium italic text-slate-100 leading-relaxed">
              "{data.pullQuote}"
            </p>
            {data.pullQuoteAttribution && (
              <cite className="block text-sm font-semibold not-italic text-emerald-400">
                — {data.pullQuoteAttribution}
              </cite>
            )}
          </blockquote>
        )}

        {/* 4. Deep Work Features Grid */}
        {data.deepWorkFeatures && data.deepWorkFeatures.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block" />
              <span>Deep Operational Capabilities</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.deepWorkFeatures.map((dw, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 hover:bg-slate-900/70 transition space-y-3"
                >
                  <h4 className="font-bold text-white text-base">{dw.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{dw.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. Mandatory Markdown Body Prose */}
        {data.bodyHtml && data.bodyHtml.trim().length > 0 && (
          <section className="p-8 sm:p-12 rounded-3xl bg-slate-900/40 backdrop-blur-md border border-white/10 space-y-8 shadow-xl">
            <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 flex items-center space-x-3">
              <span className="w-2 h-6 bg-sky-500 rounded-full inline-block" />
              <span>Overview & Technical Specifications</span>
            </h2>
            <Prose html={data.bodyHtml} />
          </section>
        )}

        {/* 6. Direct Relationships Region */}
        {data.relatedItems && data.relatedItems.length > 0 && (
          <section className="space-y-6 pt-6 border-t border-white/10">
            <h2 className="text-2xl font-bold text-white">Related Platform Capabilities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {data.relatedItems.map((item, idx) => (
                <a
                  key={idx}
                  href={item.href}
                  className="group p-6 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 border border-white/10 hover:border-sky-500/40 transition duration-200 space-y-2 block"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition">
                      {item.title}
                    </h3>
                    <span className="text-xs font-mono text-slate-500 group-hover:text-sky-400">
                      Explore →
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 7. Reverse Editorial Content Region */}
        {data.reverseEditorialItems && data.reverseEditorialItems.length > 0 && (
          <section className="space-y-6 pt-6 border-t border-white/10">
            <h2 className="text-2xl font-bold text-white">Featured Publications & Research</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {data.reverseEditorialItems.map((ed, idx) => (
                <a
                  key={idx}
                  href={ed.href}
                  className="p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-emerald-500/40 transition duration-200 space-y-2 block"
                >
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                    {ed.date}
                  </span>
                  <h4 className="text-lg font-bold text-white">{ed.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {ed.excerpt}
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}

      </div>
    </article>
  );
};
