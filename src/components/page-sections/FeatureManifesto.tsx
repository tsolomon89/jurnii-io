import React from 'react';

export const FeatureManifesto = ({ text }: { text: string }) => {
  return (
    <section className="uc-manifesto reveal">
      <div className="container">
        <p>{text}</p>
      </div>
    </section>
  );
};
