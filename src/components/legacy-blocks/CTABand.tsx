import React from 'react';

export const CTABand = ({ heading, sub, primary, secondary }: any) => {
  return (
    <section className="section reveal">
      <div className="container">
        <div className="cta-band">
          <div className="cta-band-content">
            <h2>{heading}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <div className="hero-cta-row">
            {primary && (
              <a href={primary.href} className="btn primary lg">
                {primary.label}
              </a>
            )}
            {secondary && (
              <a href={secondary.href} className="btn ghost lg">
                {secondary.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
