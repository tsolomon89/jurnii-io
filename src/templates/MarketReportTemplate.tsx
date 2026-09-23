import React, { useEffect, useState } from 'react';
import { MarketReportPageModel } from '../content-engine/types';
import { resolveAuthorImage, resolveAuthorRole } from '../content-engine/authors';
import { Prose } from '../components/Prose';
import { LibraryCoverImg } from '../content-engine/cover-fallback';

interface MarketReportTemplateProps {
  data: MarketReportPageModel;
}

function formatReportDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPeriod(period?: { start: string; end: string }): string | undefined {
  if (!period || !period.start || !period.end) return undefined;
  const d1 = new Date(`${period.start}T00:00:00`);
  const d2 = new Date(`${period.end}T00:00:00`);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) {
    return `${period.start} to ${period.end}`;
  }
  const s1 = d1.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const s2 = d2.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${s1} – ${s2}`;
}

export const MarketReportTemplate: React.FC<MarketReportTemplateProps> = ({ data }) => {
  const dateLabel = formatReportDate(data.date);
  const periodLabel = formatPeriod(data.analysisPeriod);
  const asOfLabel = formatReportDate(data.asOf);

  const lensConfig = {
    'jurnii-ux': {
      label: 'Jurnii UX Intelligence',
      badgeClass: 'badge-lens-ux',
      accentColor: '#38bdf8',
      ctaTitle: 'Benchmark your platform experience',
      ctaText: 'Jurnii UX audits your digital journeys across 70+ commercially weighted heuristics. See where your competitors lead and identify retention hurdles before they hit your NGR.',
      ctaBtnText: 'Request a UX Audit Walkthrough',
      ctaHref: '/contact',
      productHref: '/products/jurnii-ux',
    },
    'jurnii-360': {
      label: 'Jurnii 360 Competitor Radar',
      badgeClass: 'badge-lens-360',
      accentColor: '#fbbf24',
      ctaTitle: 'Track every competitor move in real time',
      ctaText: 'Jurnii 360 captures live promotions, odds boosts, banner creative, and generosity metrics across the market every day. Never again be two weeks behind a competitor campaign.',
      ctaBtnText: 'Request a 360 Intelligence Briefing',
      ctaHref: '/contact',
      productHref: '/products/jurnii-360',
    },
    'combined': {
      label: 'Combined Commercial Intelligence',
      badgeClass: 'badge-lens-combined',
      accentColor: '#34d399',
      ctaTitle: 'Unify acquisition offers with product delivery',
      ctaText: 'Combined Jurnii intelligence aligns what operators launch commercially with how their digital experience performs. Stop subsidising customer acquisition only to leak players at deposit.',
      ctaBtnText: 'Book a Strategic Intelligence Briefing',
      ctaHref: '/contact',
      productHref: '/contact',
    },
  }[data.reportLens || 'jurnii-ux'];

  const formatLabels: Record<string, string> = {
    'full-market': 'Full Market Benchmark',
    'brand-comparison': 'Head-to-Head Comparison',
    'change-detection': 'UX Change Detection',
  };

  const formatLabel = formatLabels[data.reportFormat || 'full-market'] || data.reportFormat;

  return (
    <article className="market-report-page">
      <header className="report-header">
        {/* Taxonomy Pill Bar */}
        <div className="report-taxonomy-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
          <span className="pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: lensConfig.accentColor, border: `1px solid ${lensConfig.accentColor}44`, fontWeight: 600 }}>
            {lensConfig.label}
          </span>
          <span className="pill" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
            {formatLabel}
          </span>
          {asOfLabel && (
            <span className="pill" style={{ background: 'transparent', color: 'var(--muted-foreground)', border: '1px solid var(--border)', fontSize: '0.85em' }}>
              As of: {asOfLabel}
            </span>
          )}
        </div>

        <h1 className="report-title" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '16px', letterSpacing: '-0.02em' }}>
          {data.title}
        </h1>

        {data.subtitle && (
          <p className="report-subtitle" style={{ fontSize: '1.25rem', color: 'var(--muted-foreground)', marginBottom: '20px', lineHeight: 1.5 }}>
            {data.subtitle}
          </p>
        )}

        {data.excerpt && (
          <p className="report-excerpt" style={{ fontSize: '1.1rem', color: 'var(--foreground)', marginBottom: '24px', lineHeight: 1.6, maxWidth: '850px' }}>
            {data.excerpt}
          </p>
        )}

        {/* Metadata & Cohort Scope Strip */}
        <div className="report-cohort-strip" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.9rem' }}>
            {periodLabel && (
              <div>
                <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observation Window</span>
                <strong style={{ color: 'var(--foreground)' }}>{periodLabel}</strong>
              </div>
            )}
            {data.cohort?.markets && data.cohort.markets.length > 0 && (
              <div>
                <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Market Scope</span>
                <strong style={{ color: 'var(--foreground)' }}>{data.cohort.markets.join(', ')}</strong>
              </div>
            )}
            {dateLabel && (
              <div>
                <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Publication Date</span>
                <strong style={{ color: 'var(--foreground)' }}>{dateLabel}</strong>
              </div>
            )}
          </div>

          {data.cohort?.comparisonUnits && data.cohort.comparisonUnits.length > 0 && (
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '8px' }}>
                Comparison Cohort:
              </span>
              <span style={{ color: 'var(--foreground)', fontSize: '0.9rem' }}>
                {data.cohort.comparisonUnits.map((u) => `${u.brand} (${u.market})`).join(' · ')}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Cover Image / Visual Header */}
      {data.coverImage && (
        <figure className="report-cover" style={{ margin: '0 0 40px 0' }}>
          <LibraryCoverImg
            src={data.coverImage}
            alt={data.title}
            className="report-cover-img"
            style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}
          />
        </figure>
      )}

      {/* Data Freshness Note Callout */}
      {data.dataFreshnessNote && (
        <div className="report-freshness-callout" style={{ background: 'rgba(255, 255, 255, 0.02)', borderLeft: `3px solid ${lensConfig.accentColor}`, padding: '12px 18px', marginBottom: '32px', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
          <strong style={{ color: 'var(--foreground)', display: 'block', marginBottom: '4px' }}>Data Freshness & Provenance</strong>
          {data.dataFreshnessNote}
        </div>
      )}

      {/* Main Analytical Body */}
      <section className="report-body">
        <Prose html={data.bodyHtml} />
      </section>

      {/* Lens-Specific CTA Section */}
      <section className="report-cta-card" style={{ marginTop: '60px', padding: '36px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: lensConfig.accentColor, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            {lensConfig.label}
          </p>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '12px' }}>
            {lensConfig.ctaTitle}
          </h3>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '650px', marginBottom: '24px' }}>
            {lensConfig.ctaText}
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href={lensConfig.ctaHref} className="btn btn-primary" style={{ padding: '12px 24px', fontWeight: 700 }}>
              {lensConfig.ctaBtnText}
            </a>
            <a href={lensConfig.productHref} className="btn btn-secondary" style={{ padding: '12px 20px', color: 'var(--muted-foreground)' }}>
              Explore Capabilities →
            </a>
          </div>
        </div>
      </section>
    </article>
  );
};
