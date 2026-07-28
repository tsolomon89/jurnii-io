import React from 'react';

interface EcosystemColumn {
  label: string;
  items: { href: string; title: string; desc: string }[];
}

export const EcosystemGrid = ({ heading, lede, columns }: { heading: string; lede?: string; columns: EcosystemColumn[] }) => {
  if (!columns || columns.length === 0) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" />Ecosystem</p>
          <h2 className="h2-section">{heading}</h2>
          {lede && <p className="section-lede">{lede}</p>}
        </div>
        <div className="ecosystem-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(columns.length, 3)}, 1fr)`, gap: 'var(--spacing-6, 1.5rem)' }}>
          {columns.map((col, ci) => (
            <div key={ci} className="ecosystem-col">
              <h3 className="ecosystem-col-label" style={{ fontSize: 'var(--text-xs, 11px)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 'var(--spacing-4, 1rem)' }}>
                {col.label}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3, 0.75rem)' }}>
                {col.items.map((item, ii) => (
                  <a key={ii} href={item.href} className="feature-cell" style={{ textDecoration: 'none' }}>
                    <h4 style={{ fontSize: 'var(--text-sm, 14px)', fontWeight: 600, margin: 0 }}>{item.title}</h4>
                    <p style={{ fontSize: 'var(--text-xs, 12px)', color: 'var(--muted-foreground)', margin: '4px 0 0' }}>{item.desc}</p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
