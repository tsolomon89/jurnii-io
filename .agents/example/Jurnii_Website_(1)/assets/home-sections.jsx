// Homepage sections
const { useState: uS, useEffect: uE } = React;

// ---------- Hero ----------
const Hero = () => {
  uE(() => { window.lucide && window.lucide.createIcons(); });
  return (
    <section className="hero" data-variant="dashboard">
      <div className="container hero-grid">
        <div className="hero-copy reveal">
          <span className="pill"><span className="dot"/>Commercial intelligence · Built for iGaming</span>
          <h1 className="display">Compete on experience.<br/>Win on <span style={{ color: 'var(--jurnii-700)' }}>intelligence</span>.</h1>
          <p className="lede">Jurnii automates UX benchmarking and competitor proposition tracking at scale — turning manual research and reactive analytics into structured, near-real-time intelligence for iGaming operators.</p>
          <div className="hero-ctas">
            <a href="contact.html" className="btn accent lg">Book a demo <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow"/></a>
            <a href="#products" className="btn ghost lg">See the platform</a>
          </div>
          <div className="hero-trust">
            <div className="hero-trust-avatars" aria-hidden="true">
              <span>FE</span><span>EN</span><span>KG</span><span>BS</span>
            </div>
            <div className="hero-trust-text">Trusted by <b>Flutter Entertainment</b> and 16 other operators across UK, Nordics &amp; CEE</div>
          </div>
          <div className="hero-stats">
            <div><div className="n">850+</div><div className="l">Promotions tracked at Cheltenham 2026 across 20+ operators</div></div>
            <div><div className="n">70+</div><div className="l">Ranked UX recommendations per audit, commercially weighted</div></div>
            <div><div className="n">2.3m+</div><div className="l">Total press reach across iGaming Business, SiGMA, Next.io</div></div>
          </div>
        </div>
        <div className="hero-visual reveal" style={{ position: 'relative' }}>
          <HeroDashboard />
          <HeroOrbit />
          <HeroTicker />
        </div>
      </div>
    </section>
  );
};

const HeroDashboard = () => (
  <div className="hero-visual--dashboard" style={{ position: 'relative' }}>
    <div className="hero-dashboard">
      <div className="hero-dash-head">
        <div className="left">
          <div className="dots"><span/><span/><span/></div>
          <span className="url">jurnii.io / 360 / overview</span>
        </div>
        <span className="live"><i/>Live</span>
      </div>
      <div className="hero-dash-body">
        <div className="hero-dash-stats">
          <div className="hero-dash-stat"><span className="lbl">Promo richness</span><span className="val">82<small>/100</small></span><span className="delta">+4.1</span></div>
          <div className="hero-dash-stat"><span className="lbl">Rank</span><span className="val">2<small>/7</small></span></div>
          <div className="hero-dash-stat"><span className="lbl">New offers · 7d</span><span className="val">142</span><span className="delta">+18</span></div>
        </div>
        <div className="hero-dash-chart">
          <div className="hero-dash-chart-head"><b>Competitor offer cadence</b><span>Last 30 days</span></div>
          <svg viewBox="0 0 320 86" preserveAspectRatio="none">
            <path d="M0 70 L40 62 L80 56 L120 58 L160 42 L200 36 L240 28 L280 22 L320 14" fill="none" stroke="#34F741" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M0 78 L40 74 L80 70 L120 72 L160 66 L200 64 L240 58 L280 54 L320 50" fill="none" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 4"/>
          </svg>
          <div className="hero-dash-legend"><span><i style={{ background: '#34F741' }}/>You</span><span><i style={{ background: '#C084FC' }}/>Market median</span></div>
        </div>
        <div className="hero-dash-list">
          <div className="hero-dash-li"><span className="hero-dash-chip warn">Cheltenham</span>Bet365 launched £30 free bet bundle<b>+3.4</b></div>
          <div className="hero-dash-li"><span className="hero-dash-chip good">Reactivation</span>Paddy Power 100% reload, segment-targeted<b>+2.1</b></div>
          <div className="hero-dash-li"><span className="hero-dash-chip perf">Acquisition</span>William Hill cut deposit min to £5<b>+0.9</b></div>
        </div>
      </div>
    </div>
    <div className="hero-float hero-float-1">
      <i data-lucide="sparkles" style={{ width: 14, height: 14, color: 'var(--jurnii-600)' }}/>
      <div><b>18 new offers tracked</b><span>Refreshed 4 hrs ago</span></div>
    </div>
    <div className="hero-float hero-float-2">
      <div className="hero-ring"><i>82</i></div>
      <div><b>Promo richness</b><span>You vs 6 competitors</span></div>
    </div>
  </div>
);

const HeroOrbit = () => (
  <div className="hero-visual--orbit hero-orbit">
    <svg viewBox="0 0 500 500">
      <circle cx="250" cy="250" r="220" fill="none" stroke="var(--border)" strokeDasharray="3 5"/>
      <circle cx="250" cy="250" r="160" fill="none" stroke="var(--border)" strokeDasharray="3 5"/>
      <circle cx="250" cy="250" r="100" fill="none" stroke="var(--border)"/>
      <defs>
        <linearGradient id="sweep" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(87,255,96,0.5)"/>
          <stop offset="100%" stopColor="rgba(87,255,96,0)"/>
        </linearGradient>
      </defs>
      <circle cx="250" cy="250" r="220" fill="none" stroke="url(#sweep)" strokeWidth="2" strokeLinecap="round" strokeDasharray="80 600" transform="rotate(0 250 250)">
        <animateTransform attributeName="transform" type="rotate" from="0 250 250" to="360 250 250" dur="8s" repeatCount="indefinite"/>
      </circle>
    </svg>
    <div className="hero-orbit-center">
      <b>Jurnii<br/>Intelligence</b>
      <small>Live · 24/7</small>
    </div>
    <span className="orbit-chip" style={{ top: '8%', left: '38%' }}>UX</span>
    <span className="orbit-chip" style={{ top: '22%', right: '6%' }}>360</span>
    <span className="orbit-chip" style={{ bottom: '24%', right: '10%' }}>MMM</span>
    <span className="orbit-chip" style={{ bottom: '6%', left: '40%' }}>CX</span>
    <span className="orbit-chip" style={{ bottom: '24%', left: '6%' }}>AI</span>
    <span className="orbit-chip" style={{ top: '24%', left: '6%' }}>ROI</span>
  </div>
);

const HeroTicker = () => {
  const rows = [
    { op: 'Bet365', p: 'Cheltenham £30 free bet bundle', s: 'Acquisition · UK', when: '12m ago' },
    { op: 'Paddy', p: '100% reload to dormant 30d+', s: 'Reactivation · UK', when: '1h ago' },
    { op: 'Entain', p: 'Casino spins doubled, weekend only', s: 'Engagement · IE', when: '2h ago' },
    { op: 'Wm Hill', p: 'Deposit minimum cut to £5', s: 'Acquisition · UK', when: '4h ago' },
    { op: 'LeoVegas', p: 'Boosted Champions League prices', s: 'Engagement · SE', when: '6h ago' },
  ];
  return (
    <div className="hero-visual--ticker hero-ticker">
      <div className="hero-ticker-head"><b>Live offer feed</b><span className="live"><i/>Updating</span></div>
      <div className="hero-ticker-rows">
        {rows.map((r, i) => (
          <div key={i} className="hero-ticker-row">
            <span className="op">{r.op}</span>
            <div className="promo">{r.p}<span>{r.s}</span></div>
            <span className="when">{r.when}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Logo bar ----------
const LogoBar = () => (
  <section className="logo-bar reveal">
    <div className="container">
      <div className="logo-bar-label">Operators we work with · Press we appear in</div>
      <div className="logo-bar-row">
        <BrandWordmark name="Flutter"/>
        <BrandWordmark name="Entain"/>
        <BrandWordmark name="Bet365"/>
        <BrandWordmark name="Kindred"/>
        <BrandWordmark name="LeoVegas"/>
        <BrandWordmark name="iGamingBusiness"/>
        <BrandWordmark name="SiGMA"/>
        <BrandWordmark name="NextIO"/>
        <BrandWordmark name="EGR"/>
      </div>
    </div>
  </section>
);

// ---------- Problem ----------
const ProblemSection = () => (
  <section className="section reveal" id="problem">
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot"/>The problem</p>
        <h2 className="h2-section">Manual research and reactive analytics are losing operators millions a quarter.</h2>
        <p className="section-lede">By the time a market shift shows up in CRM dashboards, the damage is already booked. Operators need structured intelligence — not more reports.</p>
      </div>
      <div className="problem-grid">
        <div className="problem-card">
          <span className="problem-card-num">01 / Promo waste</span>
          <h3>Bonus spend without competitive context</h3>
          <p>Promo budgets are set on internal targets, not on what the rest of the market is offering. Operators routinely overspend on undifferentiated reload offers a competitor isn't even running.</p>
          <p className="stat">→ £4–8M annual waste in a typical Tier 1 portfolio</p>
        </div>
        <div className="problem-card">
          <span className="problem-card-num">02 / UX blind spots</span>
          <h3>Friction shows up in churn before it shows up in audits</h3>
          <p>Generic UX scores measure usability in the abstract. They don't tell you which specific friction point in your deposit flow is bleeding NGR — or that your competitor fixed it three months ago.</p>
          <p className="stat">→ 70%+ of audit findings have zero commercial weight</p>
        </div>
        <div className="problem-card">
          <span className="problem-card-num">03 / Models built for FMCG</span>
          <h3>Off-the-shelf MMM doesn't see bonuses or boosts</h3>
          <p>Generic MMM tools weren't designed for an industry where the product is the promotion. Bonus, FTP, reload, affiliate revshare and competitor richness are missing variables.</p>
          <p className="stat">→ Year 1 deployments still 12–18 months from value</p>
        </div>
      </div>
    </div>
  </section>
);

// ---------- Product Tabs ----------
const PRODUCT_TABS = [
  {
    id: 'ux', name: 'Jurnii UX', icon: 'sparkles',
    headline: 'AI-powered UX audit. Commercial outcomes.',
    desc: 'Jurnii UX delivers instant, commercially-weighted UX audits of your player journeys. Not generic usability scores — 70+ ranked recommendations tied directly to NGR, conversion, and churn risk.',
    features: [
      '70+ ranked recommendations per audit, weighted by commercial impact',
      'Journey Effectiveness scoring across registration, deposit, betting, withdrawal',
      'Usability, brand trust, and friction-point identification',
      'Benchmarked against 20+ competitor operators in your market',
      'Proactive — issues surfaced before they show up in churn data',
      'Feeds directly into Jurnii MMM as a causal variable',
    ],
    stats: [{ n: '70+', l: 'Recommendations' }, { n: '48h', l: 'Turnaround' }, { n: '20+', l: 'Operators benchmarked' }],
    chips: ['Registration', 'Deposit', 'Bet placement', 'Withdrawal', 'Reactivation', 'KYC', 'Mobile-first'],
    detail: 'product-ux.html',
  },
  {
    id: '360', name: 'Jurnii 360', icon: 'radar',
    headline: 'Real-time competitor intelligence.',
    desc: 'Jurnii 360 automatically tracks the depth, frequency, and structure of competitor promotions across every major operator in your markets — updated daily.',
    features: [
      'Competitor promotion tracking — every live promo, automatically surfaced',
      'Release timing insights — when and how often competitors launch offers',
      'Offer benchmarking — bonus size, mechanic, targeting, and positioning',
      'Market segmentation analysis — which player segments are being targeted',
      'Real-time alerts when a major competitor changes strategy',
      'Historical database for seasonal trend analysis',
    ],
    stats: [{ n: '850+', l: 'Promos tracked (Cheltenham)' }, { n: 'Daily', l: 'Update frequency' }, { n: '20+', l: 'Operators monitored' }],
    chips: ['Free bets', 'Reload', 'BOG', 'Spins', 'Cashback', 'Tournaments', 'Affiliate'],
    detail: 'product-360.html',
  },
  {
    id: 'mmm', name: 'Jurnii MMM', icon: 'line-chart',
    headline: 'Marketing mix modelling, built for iGaming.',
    desc: "Generic MMM tools are built for FMCG. Jurnii MMM models bonuses, affiliate CPA vs revshare, competitor promo richness, and UX signals — and compounds every quarter.",
    features: [
      '16 channels modelled: affiliates, TV, sponsorship, promo, social, and more',
      'Bonus, boost, FTP, and reload modelled as separate variables',
      'Competitor promo richness (from Jurnii 360) as a control variable',
      'Cortex data layer for continuous testing and validation',
      'Live scenario planner — not a PowerPoint deck delivered once',
      'Model compounds quarterly: year 2 structurally smarter than year 1',
    ],
    stats: [{ n: '16', l: 'Channels modelled' }, { n: 'Qtrly', l: 'Model refresh' }, { n: 'Weeks', l: 'To first wins' }],
    chips: ['TV', 'Affiliate', 'Sponsorship', 'Bonus', 'FTP', 'Social', 'Display', 'OOH'],
    detail: 'product-mmm.html',
  },
];

const ProductTabs = () => {
  const [active, setActive] = uS('ux');
  uE(() => { window.lucide && window.lucide.createIcons(); }, [active]);
  const tab = PRODUCT_TABS.find(t => t.id === active);
  return (
    <section className="section reveal" id="products">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow"><span className="dot"/>The platform</p>
          <h2 className="h2-section">Three products. One intelligence layer.</h2>
          <p className="section-lede">Jurnii is built around the three things commercial leadership in iGaming actually decides on: what the player experience feels like, what the market is doing, and where the next pound of marketing goes.</p>
        </div>
        <div className="tabs">
          <div className="tabs-bar" role="tablist">
            {PRODUCT_TABS.map(t => (
              <button key={t.id} role="tab" aria-selected={active === t.id} className={active === t.id ? 'is-active' : ''} onClick={() => setActive(t.id)}>
                <i data-lucide={t.icon} style={{ width: 16, height: 16 }}/>
                {t.name}
              </button>
            ))}
          </div>
          <div className="tab-panel" role="tabpanel">
            <div>
              <span className="pill solid"><span className="dot"/>{tab.name}</span>
              <h3>{tab.headline}</h3>
              <p className="lede">{tab.desc}</p>
              <ul className="feature-list">
                {tab.features.map((f, i) => <li key={i}><i data-lucide="check" style={{ width: 18, height: 18 }}/>{f}</li>)}
              </ul>
              <div className="actions">
                <a className="btn accent" href="contact.html">Book a demo <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow"/></a>
                <a className="btn ghost" href={tab.detail}>Product details</a>
              </div>
            </div>
            <div className="tab-visual">
              <div className="tab-visual-head">
                <span className="tab-visual-name">{tab.name}</span>
                <span className="tab-visual-live"><i/>Live</span>
              </div>
              <div className="tab-visual-stats">
                {tab.stats.map((s, i) => <div key={i} className="tab-visual-stat"><span className="n">{s.n}</span><span className="l">{s.l}</span></div>)}
              </div>
              <div style={{ position: 'relative', zIndex: 1, marginTop: 24 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--concrete-300)', margin: '0 0 10px' }}>What we track</p>
                <div className="tab-visual-chips">
                  {tab.chips.map(c => <span key={c}>{c}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ---------- How it works ----------
const HowItWorks = () => (
  <section className="section reveal" id="how" style={{ background: 'var(--accent)' }}>
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot"/>How it works</p>
        <h2 className="h2-section">From scoping call to first wins, in weeks.</h2>
        <p className="section-lede">Jurnii is structured to deliver value before contracts compound. No 12-month implementations.</p>
      </div>
      <div className="how-grid">
        <div className="how-card"><span className="how-step">01 / Scope</span><div className="how-icon"><i data-lucide="compass" style={{ width: 18, height: 18 }}/></div><h4>Define your competitor set</h4><p>30-min call. We map 5–20 competitor brands, target markets, and the commercial outcomes you care about. Data readiness assessment runs in parallel.</p></div>
        <div className="how-card"><span className="how-step">02 / Calibrate</span><div className="how-icon"><i data-lucide="settings-2" style={{ width: 18, height: 18 }}/></div><h4>Calibrate the intelligence</h4><p>5–10 days. We baseline against your historic data, configure alert thresholds, and validate the first weekly readout against your team's intuition.</p></div>
        <div className="how-card"><span className="how-step">03 / Go live</span><div className="how-icon"><i data-lucide="zap" style={{ width: 18, height: 18 }}/></div><h4>Live intelligence + alerts</h4><p>Daily ingest, weekly readouts, real-time alerts on material competitor moves. Dashboard or direct-to-warehouse delivery — your choice.</p></div>
        <div className="how-card"><span className="how-step">04 / Compound</span><div className="how-icon"><i data-lucide="trending-up" style={{ width: 18, height: 18 }}/></div><h4>Quarterly compounding</h4><p>Models retrain. UX audits feed MMM. 360 feeds MMM. Year 2's decisions are structurally better than year 1's — that's the whole point.</p></div>
      </div>
    </div>
  </section>
);

// ---------- Proof ----------
const ProofSection = () => (
  <section className="section reveal" id="proof">
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot"/>Proof</p>
        <h2 className="h2-section">Outcomes, not engagement metrics.</h2>
      </div>
      <div className="proof-grid">
        <div className="proof-stats">
          <div className="proof-stat"><div className="n">23<span className="small-suffix">%</span></div><div className="l">Promo waste reduction in Q1 — Tier 1 European operator</div></div>
          <div className="proof-stat"><div className="n">£4.2<span className="small-suffix">M</span></div><div className="l">Annualised NGR uplift from one re-prioritised UX audit</div></div>
          <div className="proof-stat"><div className="n">4.8<span className="small-suffix">×</span></div><div className="l">Faster competitor signal vs. internal market intel team</div></div>
        </div>
        <figure className="proof-quote">
          <blockquote>Jurnii became the only intelligence source our trading, CRM, and product teams agreed on. The arguments stopped being about whose data was right — they became about what to do.</blockquote>
          <figcaption>
            <div className="proof-quote-av">JD</div>
            <div><b>Jane Davies</b><span>Chief Commercial Officer · Tier 1 European operator</span></div>
          </figcaption>
        </figure>
        <div className="proof-press">
          <h4>In the press</h4>
          <div className="proof-press-list">
            <div className="proof-press-item"><div><b>"Jurnii's promo intelligence is rewriting Cheltenham strategy"</b><span>March 2026 · Feature</span></div><span className="src">iGaming Biz</span></div>
            <div className="proof-press-item"><div><b>"How AI is finally being used properly in iGaming"</b><span>Feb 2026 · Op-ed</span></div><span className="src">Next.io</span></div>
            <div className="proof-press-item"><div><b>"The intelligence stack of the Tier 1 operator"</b><span>Jan 2026 · Panel</span></div><span className="src">SiGMA</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ---------- Compare ----------
const CompareSection = () => (
  <section className="section reveal" id="compare">
    <div className="container">
      <div className="section-head centered">
        <p className="eyebrow"><span className="dot"/>How we compare</p>
        <h2 className="h2-section">Not a UX agency. Not a generic MMM. Not another dashboard.</h2>
        <p className="section-lede">An honest look at how Jurnii compares to the alternatives operators usually consider first.</p>
      </div>
      <table className="compare-table">
        <thead>
          <tr><th className="compare-cap">Capability</th><th>Generic alternatives</th><th className="us-col">Jurnii</th></tr>
        </thead>
        <tbody>
          <tr><td className="compare-cap">Built for iGaming</td><td className="compare-them">Designed for FMCG, retail, CPG</td><td className="compare-us">Designed for sportsbook, casino, lottery from day one</td></tr>
          <tr><td className="compare-cap">Models bonuses &amp; boosts</td><td className="compare-them">Treated as undifferentiated promo spend</td><td className="compare-us">Bonus, FTP, reload modelled as separate variables</td></tr>
          <tr><td className="compare-cap">Competitor signal</td><td className="compare-them">Manual audits, quarterly reports</td><td className="compare-us">Daily ingest from 20+ competitor brands</td></tr>
          <tr><td className="compare-cap">UX recommendations</td><td className="compare-them">Generic usability scores</td><td className="compare-us">70+ commercially-weighted, NGR-tied recommendations</td></tr>
          <tr><td className="compare-cap">Time to first value</td><td className="compare-them">12–18 months for in-house equivalents</td><td className="compare-us">Weeks, not quarters</td></tr>
          <tr><td className="compare-cap">Compounding effect</td><td className="compare-them">One-off deliverable</td><td className="compare-us">Model strengthens every quarter</td></tr>
          <tr><td className="compare-cap">Cross-product feed</td><td className="compare-them">Siloed tools, manual integration</td><td className="compare-us">UX → MMM, 360 → MMM, baked in</td></tr>
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
        <a className="btn ghost sm" href="compare-ekimetrics.html">vs Ekimetrics</a>
        <a className="btn ghost sm" href="compare-nielsen.html">vs Nielsen</a>
        <a className="btn ghost sm" href="compare-ux-agencies.html">vs UX agencies</a>
        <a className="btn ghost sm" href="compare-manual-tracking.html">vs manual tracking</a>
      </div>
    </div>
  </section>
);

window.HomeHero = Hero;
window.HomeLogoBar = LogoBar;
window.HomeProblem = ProblemSection;
window.HomeProductTabs = ProductTabs;
window.HomeHowItWorks = HowItWorks;
window.HomeProof = ProofSection;
window.HomeCompare = CompareSection;
