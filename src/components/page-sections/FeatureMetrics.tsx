import React from 'react';

export const FeatureMetrics = ({ metrics }: { metrics: { num: string; label: string }[] }) => {
  if (!metrics || metrics.length === 0) return null;
  return (
    <div className="uc-metrics">
      <div className="container">
        <div className="uc-metrics-grid">
          {metrics.map((m, i) => (
            <div key={i} className="uc-metric">
              <span className="uc-metric-num">{m.num}</span>
              <span className="uc-metric-label">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
