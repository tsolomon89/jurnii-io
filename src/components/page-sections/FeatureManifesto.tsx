import React from 'react';

export const FeatureManifesto = ({ text }: { text: string }) => {
  return (
    <section className="section bg-brand-primary text-white">
      <div className="container container-narrow text-center">
        <p className="manifesto-text text-xl font-medium leading-relaxed">
          {text}
        </p>
      </div>
    </section>
  );
};
