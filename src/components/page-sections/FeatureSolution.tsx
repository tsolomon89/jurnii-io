import React from 'react';

export const FeatureSolution = ({ para, foot }: { para: string; foot: string }) => {
  return (
    <section className="section bg-light">
      <div className="container container-narrow">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" />The Jurnii Solution</p>
        </div>
        <p className="article-body">{para}</p>
        {foot && (
          <div className="callout-box mt-8">
            <p>{foot}</p>
          </div>
        )}
      </div>
    </section>
  );
};
