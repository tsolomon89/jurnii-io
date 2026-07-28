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
    <article className="entity-page">
      {/* 1. Jurnii Page Hero */}
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">
            <span className="dot" />
            {data.category || data.section}
          </p>
          <h1 className="h1-page">{data.title}</h1>
          <p className="page-hero-lede">{data.description}</p>
          <div className="hero-cta-row">
            <a href="/contact-us" className="btn primary lg">
              Book a demo <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" />
            </a>
            <a href="#overview" className="btn ghost lg">
              Explore specifications
            </a>
          </div>
        </div>
      </section>

      {/* 2. Key Operational Capabilities */}
      {data.heroFeatures && data.heroFeatures.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow"><span className="dot" />Capabilities</p>
              <h2 className="h2-section">Key Operational Capabilities</h2>
            </div>
            <div className="feature-grid">
              {data.heroFeatures.map((feat, idx) => (
                <div key={idx} className="feature-cell">
                  <div className="feature-icon">
                    <i data-lucide={feat.icon || 'zap'} style={{ width: 18, height: 18 }} />
                  </div>
                  <h3>{feat.title}</h3>
                  <p>{feat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Pull Quote */}
      {data.pullQuote && (
        <section className="section section-tight">
          <div className="container">
            <figure className="pull-quote">
              <blockquote>"{data.pullQuote}"</blockquote>
              {data.pullQuoteAttribution && (
                <figcaption>
                  <b>{data.pullQuoteAttribution}</b>
                </figcaption>
              )}
            </figure>
          </div>
        </section>
      )}

      {/* 4. Deep Operational Capabilities */}
      {data.deepWorkFeatures && data.deepWorkFeatures.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow"><span className="dot" />Deep Work</p>
              <h2 className="h2-section">Operational Architecture</h2>
            </div>
            <ol className="method-list">
              {data.deepWorkFeatures.map((dw, idx) => (
                <li key={idx}>
                  <span className="method-num">{String(idx + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{dw.title}</h3>
                    <p>{dw.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* 5. Mandatory Markdown Body Prose */}
      {data.bodyHtml && data.bodyHtml.trim().length > 0 && (
        <section id="overview" className="section">
          <div className="container container-narrow">
            <div className="section-head">
              <p className="eyebrow"><span className="dot" />Overview & Specifications</p>
              <h2 className="h2-section">Detailed Intelligence</h2>
            </div>
            <div className="article-body">
              <Prose html={data.bodyHtml} />
            </div>
          </div>
        </section>
      )}

      {/* 6. Related Platform Capabilities */}
      {data.relatedItems && data.relatedItems.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow"><span className="dot" />Cross-Functional</p>
              <h2 className="h2-section">Related Platform Capabilities</h2>
            </div>
            <div className="feature-grid">
              {data.relatedItems.map((item, idx) => (
                <a key={idx} href={item.href} className="feature-cell" style={{ textDecoration: 'none' }}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. Featured Publications */}
      {data.reverseEditorialItems && data.reverseEditorialItems.length > 0 && (
        <section className="section section-tight">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow"><span className="dot" />Research & Evidence</p>
              <h2 className="h2-section">Featured Publications & Research</h2>
            </div>
            <div className="feature-grid">
              {data.reverseEditorialItems.map((ed, idx) => (
                <a key={idx} href={ed.href} className="feature-cell" style={{ textDecoration: 'none' }}>
                  <span className="eyebrow">{ed.date}</span>
                  <h3>{ed.title}</h3>
                  <p>{ed.excerpt}</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
};
