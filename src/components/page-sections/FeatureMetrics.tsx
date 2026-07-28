import React from 'react';

export const FeatureMetrics = ({ metrics }: { metrics: { num: string; label: string }[] }) => {
  if (!metrics || metrics.length === 0) return null;
  return (
    <section className="section bg-light">
      <div className="container">
        <div className="metrics-grid">
          {metrics.map((m, i) => (
            <div key={i} className="metric">
              <div className="metric-num">{m.num}</div>
              <div className="metric-label">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
