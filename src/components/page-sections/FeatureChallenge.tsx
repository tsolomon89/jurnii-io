import React from 'react';

interface FeatureChallengeProps {
  eyebrow: string;
  title: string;
  para: string;
  sharedPara?: string;
}

export const FeatureChallenge = ({ eyebrow, title, para, sharedPara }: FeatureChallengeProps) => {
  return (
    <section className="uc-challenge section reveal">
      <div className="container">
        <div className="uc-challenge-grid">
          <div>
            <p className="eyebrow"><span className="dot" />{eyebrow}</p>
            <h2>{title}</h2>
            <p>{para}</p>
            {sharedPara && <p>{sharedPara}</p>}
          </div>
        </div>
      </div>
    </section>
  );
};
