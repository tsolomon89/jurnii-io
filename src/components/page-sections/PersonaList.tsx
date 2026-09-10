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
            <div key={i} className="persona-cell">
              <h3>{p.role}</h3>
              <p className="persona-q">"{p.question}"</p>
              <p>{p.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
