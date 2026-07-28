import React from 'react';

export const PersonaList = ({ heading, sub, personas }: { heading: string, sub?: string, personas: any[] }) => {
  return (
    <section className="section reveal section-tight">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" />Personas</p>
          <h2 className="h2-section">{heading}</h2>
          {sub && <p className="section-lede">{sub}</p>}
        </div>
        <div className="persona-grid">
          {personas.map((p, i) => (
            <div key={i} className="persona-card">
              <div className="pc-role">{p.role}</div>
              <div className="pc-q">"{p.question}"</div>
              <div className="pc-a">{p.answer}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
