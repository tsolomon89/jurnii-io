import React from 'react';

export const FeatureCapabilities = ({ capabilities }: { capabilities: { icon: string; title: string; body: string }[] }) => {
  if (!capabilities || capabilities.length === 0) return null;
  return (
    <section className="uc-capabilities reveal">
      <div className="container">
        <div className="uc-cap-head">
          <h2>Strategic Capabilities</h2>
          <p>Objective tools designed to replace subjective opinion with verified digital and commercial facts.</p>
        </div>
        <div className="uc-cap-grid">
          {capabilities.map((cap, i) => (
            <div key={i} className="uc-cap-card">
              <div className="uc-cap-ico">
                <i data-lucide={cap.icon} style={{ width: 22, height: 22 }} />
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
