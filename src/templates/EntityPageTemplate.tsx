import React from 'react';
import { EntityPageModel } from '../content-engine/types';
import { Prose } from '../components/Prose';

interface EntityPageTemplateProps {
  data: EntityPageModel;
}

export const EntityPageTemplate: React.FC<EntityPageTemplateProps> = ({ data }) => {
  return (
    <article className="min-h-screen bg-[#030712] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* 1. Hero Region */}
        <header className="border-b border-white/10 pb-8 space-y-4">
          {data.category && (
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950/60 rounded-full border border-sky-800/40">
              {data.category}
            </span>
          )}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-100">
            {data.title}
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl leading-relaxed">
            {data.description}
          </p>
        </header>

        {/* 2. Optional Rich Metadata Regions */}
        {data.heroFeatures && data.heroFeatures.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 p-6 rounded-xl border border-white/10">
            {data.heroFeatures.map((feat, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className="text-lg font-semibold text-sky-400">{feat.title}</h3>
                <p className="text-sm text-slate-300">{feat.description}</p>
              </div>
            ))}
          </section>
        )}

        {data.pullQuote && (
          <blockquote className="border-l-4 border-sky-500 pl-6 my-8 italic text-lg text-slate-200 bg-sky-950/20 py-4 pr-4 rounded-r-lg">
            <p>"{data.pullQuote}"</p>
            {data.pullQuoteAttribution && (
              <cite className="block mt-2 text-sm not-italic text-slate-400">
                — {data.pullQuoteAttribution}
              </cite>
            )}
          </blockquote>
        )}

        {data.deepWorkFeatures && data.deepWorkFeatures.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-200">Deep Work Capability</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.deepWorkFeatures.map((dw, idx) => (
                <div key={idx} className="p-4 bg-slate-900/40 border border-white/5 rounded-lg space-y-2">
                  <h4 className="font-semibold text-slate-100">{dw.title}</h4>
                  <p className="text-xs text-slate-400">{dw.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. Mandatory Markdown Body Prose Region */}
        {data.bodyHtml && data.bodyHtml.trim().length > 0 && (
          <section className="bg-slate-900/30 p-8 rounded-2xl border border-white/5 space-y-6">
            <h2 className="text-2xl font-bold text-slate-100 border-b border-white/10 pb-3">Overview & Details</h2>
            <Prose html={data.bodyHtml} />
          </section>
        )}

        {/* 4. Direct Relationships Region */}
        {data.relatedItems && data.relatedItems.length > 0 && (
          <section className="space-y-6 pt-6 border-t border-white/10">
            <h2 className="text-2xl font-bold text-slate-100">Related Platform Capabilities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.relatedItems.map((item, idx) => (
                <a
                  key={idx}
                  href={item.href}
                  className="block p-5 bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 rounded-xl transition duration-150 group"
                >
                  <h3 className="text-lg font-semibold text-sky-400 group-hover:text-sky-300">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 5. Reverse Editorial Content Region */}
        {data.reverseEditorialItems && data.reverseEditorialItems.length > 0 && (
          <section className="space-y-6 pt-6 border-t border-white/10">
            <h2 className="text-2xl font-bold text-slate-100">Featured Publications & Research</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.reverseEditorialItems.map((ed, idx) => (
                <a
                  key={idx}
                  href={ed.href}
                  className="block p-5 bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 rounded-xl transition duration-150"
                >
                  <span className="text-xs text-slate-500 font-mono">{ed.date}</span>
                  <h4 className="text-base font-semibold text-slate-200 mt-1">{ed.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ed.excerpt}</p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 6. Subscribe / CTA Region */}
        <section className="bg-gradient-to-r from-sky-950/60 to-slate-900 p-8 rounded-2xl border border-sky-800/30 text-center space-y-4">
          <h3 className="text-2xl font-bold text-slate-100">Transform Your Commercial Intelligence</h3>
          <p className="text-slate-300 max-w-xl mx-auto text-sm">
            Discover how Jurnii automates operator benchmarking and competitive tracking.
          </p>
          <a
            href="/contact-us"
            className="inline-block px-6 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition duration-150"
          >
            Request Demo
          </a>
        </section>
      </div>
    </article>
  );
};
