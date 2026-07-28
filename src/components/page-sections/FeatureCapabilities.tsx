import React from 'react';

export const FeatureCapabilities = ({ capabilities }: { capabilities: { icon: string; title: string; body: string }[] }) => {
  if (!capabilities || capabilities.length === 0) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2 className="h2-section">Operational Capabilities</h2>
        </div>
        <div className="feature-grid">
          {capabilities.map((cap, i) => (
            <div key={i} className="feature-cell">
              <div className="feature-icon">
                <i data-lucide={cap.icon} style={{ width: 18, height: 18 }} />
              </div>
              <h3>{cap.title}</h3>
              <p>{cap.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
