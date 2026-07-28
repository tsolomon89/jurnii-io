import React from 'react';
import { EditorialPageModel } from '../content-engine/types';
import { Prose } from '../components/Prose';

interface PaperTemplateProps {
  data: EditorialPageModel;
}

export const PaperTemplate: React.FC<PaperTemplateProps> = ({ data }) => {
  return (
    <article className="min-h-screen bg-[#030712] text-white py-12 px-4 sm:px-6 lg:px-8 font-serif">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="border-b border-white/10 pb-8 space-y-4">
          <div className="flex items-center space-x-3 text-xs font-mono text-slate-400 uppercase tracking-widest">
            <span>Research Monograph</span>
            {data.category && <span>• {data.category}</span>}
            {data.date && <span>• {data.date}</span>}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-100 font-sans">
            {data.title}
          </h1>
          {data.subtitle && (
            <h2 className="text-2xl text-slate-300 italic">{data.subtitle}</h2>
          )}
          <div className="pt-2 text-sm font-sans text-slate-400">
            Author: <span className="text-slate-200 font-semibold">{data.author}</span>
          </div>
          {data.pdfUrl && (
            <div className="pt-4">
              <a
                href={data.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold font-sans rounded-lg transition"
              >
                <span>Download PDF Paper</span>
              </a>
            </div>
          )}
        </header>

        {data.excerpt && (
          <section className="bg-slate-900/80 p-6 rounded-xl border border-sky-800/30 space-y-2">
            <h3 className="text-xs uppercase font-mono font-bold text-sky-400 tracking-wider">
              Abstract
            </h3>
            <p className="text-base text-slate-200 leading-relaxed italic">
              {data.excerpt}
            </p>
          </section>
        )}

        {data.tableOfContents && data.tableOfContents.length > 0 && (
          <nav className="bg-slate-900/40 p-6 rounded-xl border border-white/10 space-y-3 font-sans">
            <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-bold">
              Contents & Structure
            </h3>
            <ul className="space-y-1 text-sm">
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

        <main className="bg-slate-900/20 p-8 rounded-2xl border border-white/5 space-y-6">
          <Prose html={data.bodyHtml} />
        </main>
      </div>
    </article>
  );
};
