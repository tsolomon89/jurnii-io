import React from 'react';

export const OutcomeStrip = ({ heading, sub, kpis }: { heading: string, sub?: string, kpis: any[] }) => (
  <section className="section reveal section-tight">
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot" />Outcomes</p>
        <h2 className="h2-section">{heading}</h2>
        {sub && <p className="section-lede">{sub}</p>}
      </div>
      <div className="outcome-grid">
        {kpis.map((k, i) => (
          <div key={i} className="outcome-cell">
            <div className="outcome-num">{k.num}</div>
            <div className="outcome-label">{k.label}</div>
            <p className="outcome-desc">{k.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
