import React from 'react';

interface FeatureSolutionProps {
  para: string;
  foot?: string;
  implication?: string;
}

export const FeatureSolution = ({ para, foot, implication }: FeatureSolutionProps) => {
  return (
    <div className="uc-solution-card">
      <div className="uc-solution-ico"><i data-lucide="shield-check" style={{ width: 20, height: 20 }} /></div>
      <h3>How Jurnii Solves This</h3>
      <p>{para}</p>
      {implication && (
        <div className="uc-implication">
          <div className="uc-implication-head"><i data-lucide="trending-up" style={{ width: 13, height: 13 }} /> Commercial Implication</div>
          <p dangerouslySetInnerHTML={{ __html: implication }} />
        </div>
      )}
      {foot && <div className="uc-solution-foot">{foot}</div>}
    </div>
  );
};
