// Who it's for / ICP page sections
const { useEffect: whoE, useState: whoS } = React;

const ICPS = [
  {
    slug: 'operators',
    role: 'Operators',
    sub: 'CEO, MD, CCO',
    icon: 'building-2',
    accent: 'accent-360',
    headline: 'Defend NGR. Cut promo waste. Catch competitor moves before Monday.',
    pain: 'You\'re running a P&L where every basis point of margin is being negotiated against three other operators and a regulator. Your team brings you screenshots in a deck. You want a system.',
    outcomes: [
      { stat: '−23%', label: 'Avg promo waste reduction, year one' },
      { stat: '4.2×', label: 'Faster competitor reaction vs manual' },
      { stat: '£4.2m', label: 'Annualised saving (Tier 1 case study)' },
    ],
    products: ['Jurnii 360', 'Cortex'],
    callouts: [
      'Daily competitor capture, structured — not screenshots.',
      'Quarterly board-ready intelligence packs.',
      'Direct API into your warehouse and BI stack.',
    ],
    quote: { body: '"We replaced two analysts and a quarterly agency engagement. The signal is daily, the cost is a fraction, and the team finally trusts the data."', who: 'Group Director, Tier 1 European operator' },
  },
  {
    slug: 'marketing',
    role: 'Marketing leaders',
    sub: 'CMO, Group Marketing Director, VP Acquisition',
    icon: 'megaphone',
    accent: 'accent-mmm',
    headline: 'Defend the marketing budget. Prove channel ROI. Know what your competitors are paying for.',
    pain: 'The board asks if paid social is saturated. The data team says "we need 18 months to model it." The agency says "trust us." You want a model that answers the question, and a competitive read on whether your CPA is structural or self-inflicted.',
    outcomes: [
      { stat: '+11%', label: 'Avg NGR uplift (year one MMM)' },
      { stat: '4–6 wks', label: 'To first defensible model' },
      { stat: '20+', label: 'Competitor brands tracked daily' },
    ],
    products: ['Cortex', 'Jurnii 360'],
    callouts: [
      'iGaming-native MMM with bonus mechanics, calendar, and regulation as first-class inputs.',
      'Competitor pressure variable wired into the model.',
      'Quarterly refresh, not annual deck.',
    ],
    quote: { body: '"We finally have an answer to \'should we cut TV during the Six Nations\' that isn\'t a vibe. Coefficients we can defend in a board meeting."', who: 'CMO, multi-market operator' },
  },
  {
    slug: 'crm-promo',
    role: 'CRM & promotions',
    sub: 'Head of CRM, Head of Promotions, Trading',
    icon: 'gift',
    accent: 'accent-360',
    headline: 'Run promotions you can defend. Cut the ones nobody else is running. Catch launches the day they happen.',
    pain: 'Every offer you propose to cut, the CRM team flags churn risk. Every offer you propose to launch, the trading desk wants competitive evidence. You\'re between two teams with different opinions and no shared source of truth.',
    outcomes: [
      { stat: 'Daily', label: 'Structured competitor capture' },
      { stat: '<2h', label: 'Median alert latency on launches' },
      { stat: '60+', label: 'Schema fields per offer' },
    ],
    products: ['Jurnii 360'],
    callouts: [
      'Bonus mechanics as structured fields — not free text.',
      'Composite richness index for cross-mechanic comparison.',
      'Slack and email alerts when key competitors move.',
    ],
    quote: { body: '"We cut three reload offers in 90 days. The CRM team had structured market evidence. The conversation took 20 minutes instead of three weeks."', who: 'Head of Promotions, Tier 1 European operator' },
  },
  {
    slug: 'product',
    role: 'Product teams',
    sub: 'CPO, Head of Product, Design leads',
    icon: 'layout-grid',
    accent: 'accent-ux',
    headline: 'Prioritise the UX work that moves NGR. Stop debating subjective audits. Show the board where you stand against five peers.',
    pain: 'Your roadmap is full. Every team has an audit. Every audit prioritises differently. The CFO wants the NGR impact of the next sprint, and "design intuition" isn\'t an answer.',
    outcomes: [
      { stat: '60+', label: 'Criteria per journey, weighted by NGR' },
      { stat: '5 peers', label: 'Same-rubric benchmarking, every quarter' },
      { stat: '+8.4pp', label: 'Sign-up→FTD lift after first audit' },
    ],
    products: ['Jurnii UX'],
    callouts: [
      'Quarterly re-scoring on the same rubric — see actual improvement.',
      'NGR-weighted prioritisation built in.',
      'iOS, Android, mobile web, desktop — all four, every time.',
    ],
    quote: { body: '"The roadmap conversation changed in one quarter. We stopped debating which audit findings to believe and started shipping against a single ranked list."', who: 'CPO, sportsbook + casino operator' },
  },
  {
    slug: 'platforms',
    role: 'Platform & B2B providers',
    sub: 'Aggregators, sportsbook tech, casino content',
    icon: 'server',
    accent: 'accent-mmm',
    headline: 'Arm your operator clients. Differentiate beyond uptime. Become the source of competitive truth in your stack.',
    pain: 'Your operators want intelligence, not just plumbing. Your sales team is competing on commercial terms instead of strategic value. You want a partner-facing intelligence layer that travels with your platform.',
    outcomes: [
      { stat: 'White-label', label: 'Branded as your intelligence layer' },
      { stat: 'API-first', label: 'Drop straight into your operator UI' },
      { stat: 'Multi-op', label: 'Tenant-aware deployment' },
    ],
    products: ['Jurnii 360', 'Partnership / OEM'],
    callouts: [
      'White-label or co-branded delivery.',
      'Multi-tenant deployment for operator clients.',
      'Revenue-share or wholesale licensing models.',
    ],
    quote: { body: '"It moved us from \'reliable platform\' to \'strategic partner\' in board conversations with three operator clients. That\'s rare."', who: 'Chief Commercial Officer, B2B platform' },
  },
  {
    slug: 'data',
    role: 'Data & analytics',
    sub: 'Head of Data, VP Analytics, BI leads',
    icon: 'database',
    accent: 'accent-ux',
    headline: 'Stop maintaining the screenshot scraper. Get structured competitive data straight into your warehouse.',
    pain: 'Two of your analysts spend half their time captioning competitor screenshots and chasing taxonomy drift. You want them on revenue modelling. You\'d also like the data in a schema you didn\'t invent.',
    outcomes: [
      { stat: 'REST + SDKs', label: 'Snowflake, BigQuery, Databricks' },
      { stat: '4+ years', label: 'Historical depth' },
      { stat: 'SOC 2', label: 'Type II, in audit' },
    ],
    products: ['Jurnii 360', 'Cortex'],
    callouts: [
      'Documented schema. Versioned. Backfilled.',
      'Warehouse-native delivery — not a CSV every Friday.',
      'Direct ingestion into your existing pipelines.',
    ],
    quote: { body: '"We got two analysts back. The intelligence layer is now part of our stack, not a side-project. The savings paid for the contract in eight months."', who: 'VP Data & Analytics' },
  },
];
window.ICPS = ICPS;

const ICPNav = ({ active, setActive }) => {
  whoE(() => { window.lucide && window.lucide.createIcons(); }, [active]);
  return (
    <nav className="icp-nav" aria-label="Roles">
      {ICPS.map(i => (
        <button key={i.slug} className={`icp-nav-pill ${active === i.slug ? 'is-active' : ''}`} onClick={() => setActive(i.slug)}>
          <i data-lucide={i.icon} style={{width:14,height:14}}/>
          <span>{i.role}</span>
        </button>
      ))}
    </nav>
  );
};

const ICPDetail = ({ icp }) => {
  whoE(() => { window.lucide && window.lucide.createIcons(); }, [icp]);
  return (
    <article className={`icp-detail reveal ${icp.accent || ''}`} key={icp.slug}>
      <header className="icp-detail-head">
        <div className="icp-detail-icon"><i data-lucide={icp.icon} style={{width:24,height:24}}/></div>
        <div>
          <p className="icp-detail-sub">{icp.sub}</p>
          <h2>{icp.role}</h2>
        </div>
      </header>

      <h3 className="icp-headline">{icp.headline}</h3>
      <p className="icp-pain">{icp.pain}</p>

      <div className="icp-stats">
        {icp.outcomes.map((o,i) => (
          <div key={i} className="icp-stat">
            <div className="icp-stat-num">{o.stat}</div>
            <div className="icp-stat-label">{o.label}</div>
          </div>
        ))}
      </div>

      <div className="icp-grid">
        <div className="icp-section">
          <h4>What you get</h4>
          <ul className="icp-list">
            {icp.callouts.map((c,i) => <li key={i}><i data-lucide="check" style={{width:14,height:14}}/><span>{c}</span></li>)}
          </ul>
        </div>
        <div className="icp-section">
          <h4>Which Jurnii products fit</h4>
          <div className="icp-products">
            {icp.products.map((p,i) => <span key={i} className="icp-product-pill">{p}</span>)}
          </div>
          <a className="btn primary" href="/contact-us" style={{marginTop:20, justifyContent:'center'}}>Book a demo <i data-lucide="arrow-right" style={{width:14,height:14}} className="arrow"/></a>
        </div>
      </div>

      <figure className="icp-quote">
        <blockquote>{icp.quote.body}</blockquote>
        <figcaption>— {icp.quote.who}</figcaption>
      </figure>
    </article>
  );
};

const ICPSwitcher = () => {
  const [active, setActive] = whoS(ICPS[0].slug);
  const icp = ICPS.find(i => i.slug === active);
  return (
    <div className="icp-switcher">
      <ICPNav active={active} setActive={setActive}/>
      <ICPDetail icp={icp}/>
    </div>
  );
};
window.ICPSwitcher = ICPSwitcher;
