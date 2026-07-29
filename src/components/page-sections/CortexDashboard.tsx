import React from 'react';

interface CortexDashboardProps {
  eyebrow: string;
  heading: string;
  paras: string[];
  result: string;
  resultNote: string;
}

export const CortexDashboard: React.FC<CortexDashboardProps> = ({ eyebrow, heading, paras, result, resultNote }) => {
  return (
    <section className="uc-cortex section reveal">
      <div className="container">
        <div className="uc-cortex-grid">
          <div>
            <p className="eyebrow"><span className="dot" />{eyebrow}</p>
            <h2>{heading}</h2>
            {paras.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="uc-dash">
            <div className="uc-dash-head">
              <span className="uc-dash-title"><span className="uc-dash-dot" /> Jurnii Cortex Live Benchmarks</span>
              <span className="uc-dash-live">Active Feed</span>
            </div>
            <div className="uc-dash-grid">
              <div className="uc-dash-card">
                <h4>Promo Richness Index</h4>
                <div className="uc-idx-row">
                  <span className="uc-idx-val">84</span>
                  <span className="uc-idx-cmp">+4.2% vs Market Avg</span>
                </div>
                <div className="uc-minichart">
                  {[35, 48, 60, 84, 72, 68, 80].map((h, i) => (
                    <div key={i} className={`uc-bar ${h >= 80 ? 'on' : ''}`} style={{ height: h + '%' }} />
                  ))}
                </div>
              </div>
              <div className="uc-dash-card">
                <h4>Player Onboarding Funnel</h4>
                <div className="uc-funnel">
                  <div className="uc-funnel-meta"><span>Registration</span><span>98%</span></div>
                  <div className="uc-funnel-track"><div className="uc-funnel-fill" style={{ width: '98%' }} /></div>
                </div>
                <div className="uc-funnel">
                  <div className="uc-funnel-meta"><span>KYC Checkpoint</span><span className="uc-funnel-leak">82% Leak</span></div>
                  <div className="uc-funnel-track"><div className="uc-funnel-fill leak" style={{ width: '82%' }} /></div>
                </div>
                <div className="uc-funnel">
                  <div className="uc-funnel-meta"><span>First Deposit</span><span>64%</span></div>
                  <div className="uc-funnel-track"><div className="uc-funnel-fill" style={{ width: '64%' }} /></div>
                </div>
              </div>
            </div>
            <div className="uc-dash-foot">
              <b>Cortex Attribution Yield Result: {result}</b>
              {' '}{resultNote}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
