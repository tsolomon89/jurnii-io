import React from 'react';

export const FeatureChallenge = ({ eyebrow, title, para }: { eyebrow: string; title: string; para: string }) => {
  return (
    <section className="section bg-dark text-white">
      <div className="container container-narrow">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="h2-section">{title}</h2>
        <p className="article-body">{para}</p>
      </div>
    </section>
  );
};
