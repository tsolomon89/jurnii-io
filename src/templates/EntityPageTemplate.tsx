import React, { useEffect } from 'react';
import { EntityPageModel } from '../content-engine/types';
import { Prose } from '../components/Prose';

// Page Sections (formerly Legacy Blocks)
import { OutcomeStrip } from '../components/page-sections/OutcomeStrip';
import { Methodology } from '../components/page-sections/Methodology';
import { Testimonials } from '../components/page-sections/Testimonials';
import { PersonaList } from '../components/page-sections/PersonaList';
import { CTABand } from '../components/page-sections/CTABand';
import { PriceBoostTeaser } from '../components/page-sections/PriceBoostTeaser';
import { PromotionsByVertical } from '../components/page-sections/PromotionsByVertical';
import { UXScorecard } from '../components/page-sections/UXScorecard';
import { UXTelemetry } from '../components/page-sections/UXTelemetry';
import { CanvasComments } from '../components/page-sections/CanvasComments';
import { FeatureMetrics } from '../components/page-sections/FeatureMetrics';
import { FeatureManifesto } from '../components/page-sections/FeatureManifesto';
import { FeatureChallenge } from '../components/page-sections/FeatureChallenge';
import { FeatureSolution } from '../components/page-sections/FeatureSolution';
import { FeatureCapabilities } from '../components/page-sections/FeatureCapabilities';
import { FeatureBenchmark } from '../components/page-sections/FeatureBenchmark';
import { EcosystemGrid } from '../components/page-sections/EcosystemGrid';
import { BeforeAfter } from '../components/page-sections/BeforeAfter';
import { DecisionMap } from '../components/page-sections/DecisionMap';
import { CortexDashboard } from '../components/page-sections/CortexDashboard';
import { TestimonialQuote } from '../components/page-sections/TestimonialQuote';

interface EntityPageTemplateProps {
  data: EntityPageModel;
}

/** Human-readable section labels for breadcrumbs and CTAs. */
const SECTION_LABELS: Record<string, string> = {
  products: 'Products',
  features: 'Features',
  solutions: 'Solutions',
  'use-cases': 'Use Cases',
};

/** Strip vendor prefix from icon strings (e.g. "lucide:Zap" → "zap"). */
function resolveIcon(raw?: string): string {
  if (!raw) return 'zap';
  const stripped = raw.includes(':') ? raw.split(':').pop()! : raw;
  // Lucide expects lowercase-kebab, e.g. "arrow-right" not "ArrowRight"
  return stripped
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

export const EntityPageTemplate: React.FC<EntityPageTemplateProps> = ({ data }) => {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }, [data]);

  // Sections-driven pages use the legacy uc-* rendering path.
  // Pages WITHOUT sections (some products) use static heroFeatures/pullQuote/deepWork.
  const hasSections = !!(data.sections && data.sections.length > 0);
  const sectionLabel = SECTION_LABELS[data.section] || data.section;
  const iconName = resolveIcon(data.icon);

  const isProduct = data.section === 'products';

  return (
    <article className="entity-page">

      {/* ─── HERO ─── */}
      {isProduct ? (
        /* Product page-hero: eyebrow, title, lede, primary + secondary CTA */
        <section className={`page-hero ${data.accentClass || ''}`}>
          <div className="container">
            {data.kicker && <p className="page-hero-kicker">{data.kicker}</p>}
            <p className="eyebrow"><span className="dot" />{data.eyebrow || data.category || data.title}</p>
            <h1 className="h1-page">{data.title}</h1>
            <p className="page-hero-lede">{data.description}</p>
            <div className="hero-cta-row">
              {data.primaryCta ? (
                <a href={data.primaryCta.href} className="btn primary lg">
                  {data.primaryCta.label} <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" />
                </a>
              ) : (
                <a href="/contact-us" className="btn primary lg">
                  Book a demo <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" />
                </a>
              )}
              {data.secondaryCta && (
                <a href={data.secondaryCta.href} className="btn ghost lg">{data.secondaryCta.label}</a>
              )}
            </div>
          </div>
        </section>
      ) : hasSections ? (
        /* Legacy uc-hero: breadcrumbs, icon, kicker, title, lede, CTA */
        <section className="uc-hero reveal">
          <div className="container">
            <nav className="uc-hero-crumb" aria-label="Breadcrumb">
              <a href={`/${data.section}`}>{sectionLabel}</a>
              {data.category && (
                <>
                  <span className="sep">/</span>
                  <span>{data.category}</span>
                </>
              )}
              <span className="sep">/</span>
              <span>{data.title}</span>
            </nav>
            <div className="uc-hero-head">
              <div className="uc-hero-icon">
                <i data-lucide={iconName} style={{ width: 26, height: 26 }} />
              </div>
              <p className="uc-hero-kicker">{data.category || sectionLabel}</p>
            </div>
            <h1 className="h1-page">{data.title}</h1>
            <p className="page-hero-lede">{data.description}</p>
            <div className="hero-cta-row" style={{ marginTop: 8 }}>
              <a href="/contact-us" className="btn primary lg">
                Book a demo <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" />
              </a>
              <a href={`/${data.section}`} className="btn ghost lg">
                All {sectionLabel.toLowerCase()}
              </a>
            </div>
          </div>
        </section>
      ) : (
        /* Static page-hero for pages without sections */
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
      )}



      {/* ─── STATIC BLOCKS (only for pages WITHOUT sections) ─── */}
      {!hasSections && (
        <>
          {/* Key Operational Capabilities */}
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

          {/* Pull Quote */}
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

          {/* Deep Operational Capabilities */}
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
        </>
      )}

      {/* ─── POLYMORPHIC SECTIONS ─── */}
      {data.sections && data.sections.map((section, index) => {
        switch (section.type) {
          case 'metrics':
            return <FeatureMetrics key={index} metrics={section.data} />;
          case 'manifesto':
            return <FeatureManifesto key={index} text={section.data} />;
          case 'challenge': {
            // Legacy template composed challenge + solution in one uc-challenge-grid.
            // Look ahead for adjacent 'solution' section to compose them together.
            const nextSection = data.sections?.[index + 1];
            const nextIsSolution = nextSection?.type === 'solution';
            return (
              <section key={index} className="uc-challenge section reveal">
                <div className="container">
                  <div className="uc-challenge-grid">
                    <div>
                      <p className="eyebrow"><span className="dot" />{section.data.eyebrow}</p>
                      <h2>{section.data.title}</h2>
                      <p>{section.data.para}</p>
                      {section.data.sharedPara && <p>{section.data.sharedPara}</p>}
                    </div>
                    {nextIsSolution && <FeatureSolution {...nextSection.data} />}
                  </div>
                </div>
              </section>
            );
          }
          case 'solution':
            // Skip if already rendered by preceding challenge block
            if (index > 0 && data.sections?.[index - 1]?.type === 'challenge') return null;
            return <FeatureSolution key={index} {...section.data} />;
          case 'capabilities':
            return <FeatureCapabilities key={index} capabilities={section.data} />;
          case 'features': {
            const featData = section.data || data.features;
            if (!featData) return null;
            return (
              <section key={index} className="section reveal">
                <div className="container">
                  <div className="section-head">
                    <p className="eyebrow"><span className="dot" />Capabilities</p>
                    <h2 className="h2-section">{featData.heading}</h2>
                    {featData.sub && <p className="section-lede">{featData.sub}</p>}
                  </div>
                  <div className="feature-grid">
                    {featData.items.map((it: any, i: number) => (
                      <div key={i} className="feature-cell">
                        <div className="feature-icon">
                          <i data-lucide={resolveIcon(it.icon)} style={{ width: 18, height: 18 }} />
                        </div>
                        <h3>{it.title}</h3>
                        <p>{it.body || it.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'outcomes':
            return <OutcomeStrip key={index} {...section.data} />;
          case 'method':
            return <Methodology key={index} {...section.data} />;
          case 'testimonials':
            return <Testimonials key={index} {...section.data} />;
          case 'testimonial':
            return <TestimonialQuote key={index} {...section.data} />;
          case 'personas':
            return <PersonaList key={index} personas={section.data.list} heading={section.data.heading} sub={section.data.sub} />;
          case 'cta':
            return <CTABand key={index} {...section.data} />;
          case 'benchmark':
            return <FeatureBenchmark key={index} {...(section.data || {})} />;
          case 'cortex':
            return <CortexDashboard key={index} {...section.data} />;
          case 'ecosystem':
            return <EcosystemGrid key={index} {...section.data} />;
          case 'beforeAfter':
            return <BeforeAfter key={index} {...section.data} />;
          case 'decisionMap':
            return <DecisionMap key={index} {...section.data} />;
          case 'renderFlag':
            if (section.data === 'hasPriceBoostTeaser') return <PriceBoostTeaser key={index} />;
            if (section.data === 'hasUXScorecard') return <UXScorecard key={index} />;
            if (section.data === 'hasUXTelemetry') return <UXTelemetry key={index} />;
            if (section.data === 'hasCanvasComments') return (
              <section key={index} className="section reveal collab-canvas-outer">
                <div className="container">
                  <div className="section-head">
                    <p className="eyebrow"><span className="dot" />Collaboration</p>
                    <h2 className="h2-section">Your whole team, on the same page.</h2>
                    <p className="section-lede">Comment on any finding, up-vote or down-vote recommendations, and drop threaded conversations anywhere on the report — so decisions happen in context, not in email chains.</p>
                  </div>
                  <div className="collab-canvas-wrap cc-root">
                    <CanvasComments />
                  </div>
                </div>
              </section>
            );
            if (section.data === 'hasPromotionsByVertical') return (
              <section key={index} className="section reveal">
                <div className="container">
                  <div className="section-head">
                    <p className="eyebrow"><span className="dot" />Live view</p>
                    <h2 className="h2-section">Every competitor promotion, structured by vertical.</h2>
                    <p className="section-lede">See how promotional intensity breaks down across sports and casino — with live offer capture and per-competitor activity, refreshed daily. This is the same panel your trading and CRM teams work from.</p>
                  </div>
                  <PromotionsByVertical />
                </div>
              </section>
            );
            return null;
          default:
            return null;
        }
      })}

      {/* ─── MARKDOWN BODY PROSE ─── */}
      {data.bodyHtml && data.bodyHtml.trim().length > 0 && (
        <section id="overview" className="section">
          <div className="container container-narrow">
            <div className="section-head">
              <p className="eyebrow"><span className="dot" />Overview &amp; Specifications</p>
              <h2 className="h2-section">Detailed Intelligence</h2>
            </div>
            <div className="article-body">
              <Prose html={data.bodyHtml} />
            </div>
          </div>
        </section>
      )}

      {/* ─── RELATED PLATFORM CAPABILITIES ─── */}
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

      {/* ─── FEATURED PUBLICATIONS ─── */}
      {data.reverseEditorialItems && data.reverseEditorialItems.length > 0 && (
        <section className="section section-tight">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow"><span className="dot" />Research &amp; Evidence</p>
              <h2 className="h2-section">Featured Publications &amp; Research</h2>
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
