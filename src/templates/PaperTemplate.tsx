import React from 'react';
import { EditorialPageModel } from '../content-engine/types';
import { Prose } from '../components/Prose';

interface PaperTemplateProps {
  data: EditorialPageModel;
}

export const PaperTemplate: React.FC<PaperTemplateProps> = ({ data }) => {
  return (
    <article>
      <header className="article-header">
        <div className="article-header-meta">
          <span>Research Monograph</span>
          {data.category && <span>• {data.category}</span>}
          {data.date && <span>• {data.date}</span>}
        </div>
        <h1>
          {data.title}
        </h1>
        {data.subtitle && (
          <h2 style={{ fontSize: 'var(--text-2xl)', color: 'var(--muted-foreground)', fontStyle: 'italic', marginTop: 'var(--spacing-2)' }}>{data.subtitle}</h2>
        )}
        <div style={{ marginTop: 'var(--spacing-4)', fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' }}>
          Author: <span style={{ color: 'var(--foreground)', fontWeight: 'var(--fw-semibold)' }}>{data.author}</span>
        </div>
        {data.pdfUrl && (
          <div style={{ marginTop: 'var(--spacing-4)' }}>
            <a href={data.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn accent lg">
              Download PDF Paper
            </a>
          </div>
        )}
      </header>

      {data.excerpt && (
        <section className="article-toc" style={{ borderColor: 'var(--jurnii-500)' }}>
          <h3 className="eyebrow" style={{ color: 'var(--jurnii-500)', marginBottom: 'var(--spacing-2)' }}>
            Abstract
          </h3>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
            {data.excerpt}
          </p>
        </section>
      )}

      {data.tableOfContents && data.tableOfContents.length > 0 && (
        <nav className="article-toc">
          <h2>
            Contents & Structure
          </h2>
          <ul>
            {data.tableOfContents.map((toc) => (
              <li
                key={toc.id}
                style={{ paddingLeft: `${(toc.level - 1) * 1}rem` }}
              >
                <a href={`#${toc.id}`}>
                  {toc.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main>
        <Prose html={data.bodyHtml} />
      </main>
    </article>
  );
};
