import React, { useEffect } from 'react';
import { ctaAttrs } from '../../analytics/cta';

export const CTABand = ({ heading, sub, primary, secondary }: any) => {
  useEffect(() => {
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }, []);

  return (
    <section className="section reveal cta-band-wrap">
      <div className="container">
        <div className="cta-band">
          <div className="cta-band-content">
            <h2>{heading}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <div className="cta-band-actions">
            {primary && (
              <a
                href={primary.href}
                className="btn accent lg"
                {...ctaAttrs(primary.href, 'cta-band-primary')}
              >
                {primary.label} <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" />
              </a>
            )}
            {secondary && (
              <a
                href={secondary.href}
                className="btn ghost lg"
                {...ctaAttrs(secondary.href, 'cta-band-secondary')}
              >
                {secondary.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
