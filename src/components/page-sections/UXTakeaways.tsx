import React, { useEffect } from 'react';
import { RecommendationModal } from './RecommendationModal';

const TAKEAWAY_CATS = [
  { icon: 'map', title: 'Roadmap items', body: 'Severity-ranked fixes, ready to slot straight into your delivery roadmap with the commercial impact attached.' },
  { icon: 'flask-conical', title: 'Experimentation hypotheses', body: 'Framed as testable hypotheses with an expected lift, so they drop into your A/B backlog as-is.' },
  { icon: 'wrench', title: 'Technical improvements', body: 'Performance and implementation gaps your engineers can scope, ticket, and resolve directly.' },
];

const UXTakeaways = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }, []);

  return (
    <section className="section reveal">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" />Actionable take-aways</p>
          <h2 className="h2-section">Every finding becomes a decision your team can act on.</h2>
          <p className="section-lede">Recommendations are categorised so they move straight into your workflow — roadmap items, experimentation hypotheses, and technical improvements. Each one is a living thread: comment, up-vote, down-vote, and push to Jira without losing the commercial context.</p>
        </div>
        <div className="takeaways-cats">
          {TAKEAWAY_CATS.map((c, i) =>
            <div key={i} className="takeaways-cat">
              <div className="takeaways-cat-ico"><i data-lucide={c.icon} style={{ width: 18, height: 18 }} /></div>
              <div className="takeaways-cat-body">
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            </div>
          )}
        </div>
        <div className="takeaways-demo">
          <p className="takeaways-demo-cap"><span className="dot" />Live recommendation · Registration journey</p>
          <RecommendationModal />
        </div>
      </div>
    </section>
  );
};

export { UXTakeaways };
