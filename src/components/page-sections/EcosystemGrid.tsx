import React from 'react';

interface EcosystemColumn {
  label: string;
  items: { href: string; title: string; desc: string }[];
}

export const EcosystemGrid = ({ heading, lede, columns }: { heading: string; lede?: string; columns: EcosystemColumn[] }) => {
  if (!columns || columns.length === 0) return null;
  return (
    <section className="uc-eco section reveal">
      <div className="container">
        <div className="section-head">
          <h2 className="h2-section">{heading}</h2>
          {lede && <p className="section-lede">{lede}</p>}
        </div>
        <div className="uc-eco-grid">
          {columns.map((col, ci) => (
            <div key={ci}>
              <h3 className="uc-eco-col-label">{col.label}</h3>
              <div className="uc-eco-links">
                {col.items.map((item, ii) => (
                  <a key={ii} href={item.href} className="uc-eco-card">
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
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
