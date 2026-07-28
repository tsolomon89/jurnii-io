import React from 'react';

export const Methodology = ({ heading, sub, steps }: { heading: string, sub?: string, steps: any[] }) => (
  <section className="section reveal">
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot" />Methodology</p>
        <h2 className="h2-section">{heading}</h2>
        {sub && <p className="section-lede">{sub}</p>}
      </div>
      <ol className="method-list">
        {steps.map((s, i) => (
          <li key={i}>
            <span className="method-num">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
