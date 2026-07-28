import React from 'react';

export const BeforeAfter = ({ heading, before, after }: { heading?: string; before: string[]; after: string[] }) => {
  if (!before?.length && !after?.length) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" />Transformation</p>
          <h2 className="h2-section">{heading || 'Operational Transformation'}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-8, 2rem)' }}>
          <div className="ba-col">
            <h3 style={{ fontSize: 'var(--text-sm, 14px)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 'var(--spacing-4, 1rem)' }}>
              Before Jurnii
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3, 0.75rem)' }}>
              {before.map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: 'var(--text-sm, 14px)', lineHeight: 1.6 }}>
                  <span style={{ color: '#ef4444', flexShrink: 0 }}>✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="ba-col">
            <h3 style={{ fontSize: 'var(--text-sm, 14px)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 'var(--spacing-4, 1rem)' }}>
              After Jurnii
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3, 0.75rem)' }}>
              {after.map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: 'var(--text-sm, 14px)', lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--brand-primary, #10B981)', flexShrink: 0 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
