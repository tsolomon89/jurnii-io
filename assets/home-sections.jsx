// Homepage sections
const { useState: uS, useEffect: uE } = React;

// ---------- Hero ----------
const Hero = () => {
  const graphRef = React.useRef(null);
  uE(() => {window.lucide && window.lucide.createIcons();});
  React.useEffect(() => {
    const el = graphRef.current;
    if (!el) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = null;
    const update = () => {
      raf = null;
      const y = window.scrollY || 0;
      el.style.transform = 'translate3d(0, ' + (-(y * 0.02)).toFixed(1) + 'px, 0)';
    };
    const onScroll = () => {if (raf == null) raf = requestAnimationFrame(update);};
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {window.removeEventListener('scroll', onScroll);if (raf) cancelAnimationFrame(raf);};
  }, []);
  return (
    <section className="hero" data-variant="stack" data-screen-label="Home hero">
      <div className="hero-stack-graph" ref={graphRef} aria-hidden="true">
        <svg viewBox="0 0 560 640" preserveAspectRatio="none" fill="none">
          <defs>
            <linearGradient id="hs-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgb(var(--brand-glow))" stopOpacity="0.10" />
              <stop offset="1" stopColor="rgb(var(--brand-glow))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="hs-fill-a" d="M0 500 C70 480 120 510 180 452 C240 394 300 402 360 340 C420 278 480 250 560 176 L560 640 L0 640 Z" fill="url(#hs-fill)" />
          <path className="hs-draw" pathLength="1" d="M0 500 C70 480 120 510 180 452 C240 394 300 402 360 340 C420 278 480 250 560 176" stroke="rgb(var(--brand-glow))" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />
          <path className="hs-draw hs-2" pathLength="1" d="M0 560 C90 552 150 566 230 528 C310 490 380 500 450 452 C500 418 530 408 560 384" stroke="currentColor" strokeOpacity="0.16" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="eyebrow"><span className="dot" />Commercial intelligence · Built for iGaming</p>
          <h1 className="display" data-no-split="1" style={{ width: '100%', fontWeight: 600, fontSize: '52px' }}>Compete on <span className="ink-muted">experience.</span><br />win on <span className="ink-green">intelligence.</span></h1>
          <p className="lede">Jurnii automates UX benchmarking and competitor proposition tracking at scale — turning manual research and reactive analytics into structured, near-real-time intelligence for iGaming operators.</p>
          <div className="hero-ctas">
            <a href="contact-us.html" className="btn primary lg">Book a demo <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" /></a>
            <a href="#products" className="btn ghost lg">See the platform</a>
          </div>
          <div className="hero-stats">
            <div><div className="n">850+</div><div className="l">Promotions tracked at Cheltenham 2026 across 20+ operators</div></div>
            <div><div className="n">70+</div><div className="l">Ranked UX recommendations per audit, commercially weighted</div></div>
            <div><div className="n">2.3m+</div><div className="l">Total press reach across iGaming Business, SiGMA, Next.io</div></div>
          </div>
        </div>
        <div className="hero-visual" style={{ position: 'relative' }}>
          <HeroStack />
          <HeroDashboard />
          <HeroOrbit />
          <HeroTicker />
        </div>
      </div>
    </section>);

};

// ---------- Stack variant — layered platform components + trend-line backdrop ----------
const HeroThreadCard = () => {
  const ref = React.useRef(null);
  const [inView, setInView] = uS(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setInView(true); return; }
    if (!('IntersectionObserver' in window)) { setInView(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setInView(true); io.disconnect(); } });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
  <div className={"hero-thread" + (inView ? " is-in" : "")} ref={ref}>
    <div className="hero-thread-head">
      <span className="hero-thread-av">TD</span>
      <b>Tristan Dexter</b>
      <span className="time">35m ago</span>
      <span className="hero-thread-acts">
        <i data-lucide="check" />
        <i data-lucide="smile" />
        <i data-lucide="ellipsis" />
      </span>
    </div>
    <p className="hero-thread-msg">Check this recommendation <span className="mention">@Joe</span> we should add this to our roadmap</p>
    <div className="hero-thread-reply">
      <span className="ph">Reply to thread…</span>
      <span className="tools"><i data-lucide="at-sign" /><i data-lucide="smile" /><i data-lucide="paperclip" /></span>
      <span className="hero-thread-send"><i data-lucide="send" /></span>
    </div>
  </div>);
};


const HeroStack = () => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layers = Array.from(root.querySelectorAll('[data-depth]'));
    let raf = null;
    const update = () => {
      raf = null;
      const y = window.scrollY || 0;
      layers.forEach((el) => {
        el.style.transform = 'translate3d(0, ' + (-(y * parseFloat(el.dataset.depth))).toFixed(1) + 'px, 0)';
      });
    };
    const onScroll = () => {if (raf == null) raf = requestAnimationFrame(update);};
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {window.removeEventListener('scroll', onScroll);if (raf) cancelAnimationFrame(raf);};
  }, []);
  return (
    <div className="hero-visual--stack hero-stack" ref={ref}>
      <div className="hero-stack-layer sc" data-depth="0.04"><div className="hero-stack-tilt"><UXScorecard /></div></div>
      <div className="hero-stack-layer pb" data-depth="0.08"><div className="hero-stack-tilt"><PriceBoostCard /></div></div>
      <div className="hero-stack-layer cm" data-depth="0.12"><div className="hero-stack-tilt"><HeroThreadCard /></div></div>
      <span className="hero-stack-pin p1" data-depth="0.06"><span className="hero-stack-pin-b"><i data-lucide="message-circle" /></span></span>
      <span className="hero-stack-pin p2" data-depth="0.10"><span className="hero-stack-pin-b"><i data-lucide="message-circle" /></span></span>
    </div>);

};

const HeroDashboard = () =>
<div className="hero-visual--dashboard" style={{ position: 'relative' }}>
    <div className="hero-dashboard">
      <div className="hero-dash-head">
        <div className="left">
          <div className="dots"><span /><span /><span /></div>
          <span className="url">jurnii.io / 360 / overview</span>
        </div>
        <span className="live"><i />Live</span>
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
            <path d="M0 70 L40 62 L80 56 L120 58 L160 42 L200 36 L240 28 L280 22 L320 14" fill="none" stroke="var(--jurnii-400)" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M0 78 L40 74 L80 70 L120 72 L160 66 L200 64 L240 58 L280 54 L320 50" fill="none" stroke="var(--performance)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 4" />
          </svg>
          <div className="hero-dash-legend"><span><i style={{ background: 'var(--jurnii-400)' }} />You</span><span><i style={{ background: 'var(--performance)' }} />Market median</span></div>
        </div>
        <div className="hero-dash-list">
          <div className="hero-dash-li"><span className="hero-dash-chip warn">Cheltenham</span>Bet365 launched £30 free bet bundle<b>+3.4</b></div>
          <div className="hero-dash-li"><span className="hero-dash-chip good">Reactivation</span>Paddy Power 100% reload, segment-targeted<b>+2.1</b></div>
          <div className="hero-dash-li"><span className="hero-dash-chip perf">Acquisition</span>William Hill cut deposit min to £5<b>+0.9</b></div>
        </div>
      </div>
    </div>
    <div className="hero-float hero-float-1">
      <i data-lucide="sparkles" style={{ width: 14, height: 14, color: 'var(--jurnii-600)' }} />
      <div><b>18 new offers tracked</b><span>Refreshed 4 hrs ago</span></div>
    </div>
    <div className="hero-float hero-float-2">
      <div className="hero-ring"><i>82</i></div>
      <div><b>Promo richness</b><span>You vs 6 competitors</span></div>
    </div>
  </div>;


const HeroOrbit = () =>
<div className="hero-visual--orbit hero-orbit">
    <svg viewBox="0 0 500 500">
      <circle cx="250" cy="250" r="220" fill="none" stroke="var(--border)" strokeDasharray="3 5" />
      <circle cx="250" cy="250" r="160" fill="none" stroke="var(--border)" strokeDasharray="3 5" />
      <circle cx="250" cy="250" r="100" fill="none" stroke="var(--border)" />
      <defs>
        <linearGradient id="sweep" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(87,255,96,0.5)" />
          <stop offset="100%" stopColor="rgba(87,255,96,0)" />
        </linearGradient>
      </defs>
      <circle cx="250" cy="250" r="220" fill="none" stroke="url(#sweep)" strokeWidth="2" strokeLinecap="round" strokeDasharray="80 600" transform="rotate(0 250 250)">
        <animateTransform attributeName="transform" type="rotate" from="0 250 250" to="360 250 250" dur="8s" repeatCount="indefinite" />
      </circle>
    </svg>
    <div className="hero-orbit-center">
      <b>Jurnii<br />Intelligence</b>
      <small>Live · 24/7</small>
    </div>
    <span className="orbit-chip" style={{ top: '8%', left: '38%' }}>UX</span>
    <span className="orbit-chip" style={{ top: '22%', right: '6%' }}>360</span>
    <span className="orbit-chip" style={{ bottom: '24%', right: '10%' }}>MMM</span>
    <span className="orbit-chip" style={{ bottom: '6%', left: '40%' }}>CX</span>
    <span className="orbit-chip" style={{ bottom: '24%', left: '6%' }}>AI</span>
    <span className="orbit-chip" style={{ top: '24%', left: '6%' }}>ROI</span>
  </div>;


const HeroTicker = () => {
  const rows = [
  { op: 'Bet365', p: 'Cheltenham £30 free bet bundle', s: 'Acquisition · UK', when: '12m ago' },
  { op: 'Paddy', p: '100% reload to dormant 30d+', s: 'Reactivation · UK', when: '1h ago' },
  { op: 'Entain', p: 'Casino spins doubled, weekend only', s: 'Engagement · IE', when: '2h ago' },
  { op: 'Wm Hill', p: 'Deposit minimum cut to £5', s: 'Acquisition · UK', when: '4h ago' },
  { op: 'LeoVegas', p: 'Boosted Champions League prices', s: 'Engagement · SE', when: '6h ago' }];

  return (
    <div className="hero-visual--ticker hero-ticker">
      <div className="hero-ticker-head"><b>Live offer feed</b><span className="live"><i />Updating</span></div>
      <div className="hero-ticker-rows">
        {rows.map((r, i) =>
        <div key={i} className="hero-ticker-row">
            <span className="op">{r.op}</span>
            <div className="promo">{r.p}<span>{r.s}</span></div>
            <span className="when">{r.when}</span>
          </div>
        )}
      </div>
    </div>);

};

// ---------- Logo bar ----------
const LogoBar = () =>
<section className="logo-bar reveal">
    <div className="container">
      <div className="logo-bar-label">Operators we work with</div>
      <div className="logo-bar-row">
        <BrandWordmark name="Flutter" />
        <BrandWordmark name="Entain" />
        <BrandWordmark name="Bet365" />
        <BrandWordmark name="Kindred" />
        <BrandWordmark name="LeoVegas" />
      </div>
    </div>
  </section>;


const PressBar = () =>
<section className="logo-bar press-bar reveal">
    <div className="container">
      <div className="logo-bar-label">Press we appear in</div>
      <div className="logo-bar-row">
        <BrandWordmark name="iGamingBusiness" />
        <BrandWordmark name="SiGMA" />
        <BrandWordmark name="NextIO" />
        <BrandWordmark name="EGR" />
      </div>
    </div>
  </section>;


// ---------- Problem ----------
const ProblemSection = () =>
<section className="section reveal" id="problem">
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot" />The problem</p>
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
  </section>;


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
  'Feeds directly into Cortex as a causal variable'],

  stats: [{ n: '70+', l: 'Recommendations' }, { n: '48h', l: 'Turnaround' }, { n: '20+', l: 'Operators benchmarked' }],
  chips: ['Registration', 'Deposit', 'Bet placement', 'Withdrawal', 'Reactivation', 'KYC', 'Mobile-first'],
  detail: 'product-ux.html'
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
  'Historical database for seasonal trend analysis'],

  stats: [{ n: '850+', l: 'Promos tracked (Cheltenham)' }, { n: 'Daily', l: 'Update frequency' }, { n: '20+', l: 'Operators monitored' }],
  chips: ['Free bets', 'Reload', 'BOG', 'Spins', 'Cashback', 'Tournaments', 'Affiliate'],
  detail: 'product-360.html'
},
{
  id: 'mmm', name: 'Jurnii Cortex', icon: 'line-chart',
  headline: 'Marketing mix modelling, built for iGaming.',
  desc: "Generic MMM tools are built for FMCG. Cortex models bonuses, affiliate CPA vs revshare, competitor promo richness, and UX signals — and compounds every quarter.",
  features: [
  '16 channels modelled: affiliates, TV, sponsorship, promo, social, and more',
  'Bonus, boost, FTP, and reload modelled as separate variables',
  'Competitor promo richness (from Jurnii 360) as a control variable',
  'Cortex data layer for continuous testing and validation',
  'Live scenario planner — not a PowerPoint deck delivered once',
  'Model compounds quarterly: year 2 structurally smarter than year 1'],

  stats: [{ n: '16', l: 'Channels modelled' }, { n: 'Qtrly', l: 'Model refresh' }, { n: 'Weeks', l: 'To first wins' }],
  chips: ['TV', 'Affiliate', 'Sponsorship', 'Bonus', 'FTP', 'Social', 'Display', 'OOH'],
  detail: 'product-mmm.html'
}];


const ProductTabs = () => {
  const [active, setActive] = uS('ux');
  uE(() => {window.lucide && window.lucide.createIcons();}, [active]);
  const tab = PRODUCT_TABS.find((t) => t.id === active);
  return (
    <section className="section reveal" id="products">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" />The platform</p>
          <h2 className="h2-section">Three products.<br />One intelligence layer.</h2>
          <p className="section-lede">Jurnii is built around the three things commercial leadership in iGaming actually decides on: what the player experience feels like, what the market is doing, and where the next pound of marketing goes.</p>
        </div>
        <div className="tabs">
          <div className="tabs-bar" role="tablist">
            {PRODUCT_TABS.map((t) =>
            <button key={t.id} role="tab" aria-selected={active === t.id} className={active === t.id ? 'is-active' : ''} onClick={() => setActive(t.id)}>
                <i data-lucide={t.icon} style={{ width: 16, height: 16 }} />
                {t.name}
              </button>
            )}
          </div>
          <div className="tab-panel" role="tabpanel">
            <div>
              <span className="eyebrow"><span className="dot" />{tab.name}</span>
              <h3>{tab.headline}</h3>
              <p className="lede">{tab.desc}</p>
              <ul className="feature-list">
                {tab.features.map((f, i) => <li key={i}><i data-lucide="check" style={{ width: 18, height: 18 }} />{f}</li>)}
              </ul>
              <div className="actions">
                <a className="btn primary" href="contact-us.html">Book a demo <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" /></a>
                <a className="btn ghost" href={tab.detail}>Learn More</a>
              </div>
            </div>
            {active === 'ux' ?
            <UXScorecard /> :
            active === '360' ?
            <PriceBoostCard /> :

            <div className="tab-visual">
              <div className="tab-visual-head">
                <span className="tab-visual-name">{tab.name}</span>
                <span className="tab-visual-live"><i />Live</span>
              </div>
              <div className="tab-visual-stats">
                {tab.stats.map((s, i) => <div key={i} className="tab-visual-stat"><span className="n">{s.n}</span><span className="l">{s.l}</span></div>)}
              </div>
              <div style={{ position: 'relative', zIndex: 1, marginTop: 24 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--concrete-300)', margin: '0 0 10px' }}>What we track</p>
                <div className="tab-visual-chips">
                  {tab.chips.map((c) => <span key={c}>{c}</span>)}
                </div>
              </div>
            </div>
            }
          </div>
        </div>
      </div>
    </section>);

};

// ---------- How it works ----------
const HowItWorks = () =>
<section className="section reveal" id="how" style={{ background: 'var(--accent)' }}>
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot" />How it works</p>
        <h2 className="h2-section">From scoping call,<br />to first wins, in weeks.</h2>
        <p className="section-lede">Jurnii is structured to deliver value before contracts compound. No 12-month implementations.</p>
      </div>
      <div className="how-grid">
        <div className="how-card"><span className="how-step">01 / Scope</span><div className="how-icon"><i data-lucide="compass" style={{ width: 18, height: 18 }} /></div><h4>Define your competitor set</h4><p>45-min call. We map 5–20 competitor brands, target markets, and the commercial outcomes you care about. Data readiness assessment runs in parallel.</p></div>
        <div className="how-card"><span className="how-step">02 / Calibrate</span><div className="how-icon"><i data-lucide="settings-2" style={{ width: 18, height: 18 }} /></div><h4>Calibrate the intelligence</h4><p>5–10 days. We baseline against your historic data, configure alert thresholds, and validate the first weekly readout against your team's intuition.</p></div>
        <div className="how-card"><span className="how-step">03 / Go live</span><div className="how-icon"><i data-lucide="zap" style={{ width: 18, height: 18 }} /></div><h4>Live intelligence + alerts</h4><p>Daily ingest, weekly readouts, real-time alerts on material competitor moves. Dashboard or direct-to-warehouse delivery — your choice.</p></div>
        <div className="how-card"><span className="how-step">04 / Compound</span><div className="how-icon"><i data-lucide="trending-up" style={{ width: 18, height: 18 }} /></div><h4>Quarterly compounding</h4><p>Models retrain. UX audits feed MMM. 360 feeds MMM. Year 2's decisions are structurally better than year 1's — that's the whole point.</p></div>
      </div>
    </div>
  </section>;


// ---------- Proof ----------
const ProofSection = () =>
<section className="section reveal" id="proof">
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot" />Proof</p>
        <h2 className="h2-section">Outcomes,<br />not engagement metrics.</h2>
      </div>
      <div className="proof-grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'stretch' }}>
        <div className="proof-stats">
          <div className="proof-stat"><div className="n">23<span className="small-suffix">%</span></div><div className="l">Promo waste reduction in Q1 — Tier 1 European operator</div></div>
          <div className="proof-stat"><div className="n">£4.2<span className="small-suffix">M</span></div><div className="l">Annualised NGR uplift from one re-prioritised UX audit</div></div>
          <div className="proof-stat"><div className="n">4.8<span className="small-suffix">×</span></div><div className="l">Faster competitor signal vs. internal market intel team</div></div>
        </div>
        <article className="tm-card proof-quote" style={{ flex: 'none', width: 'auto' }}>
          <header className="tm-card-head">
            <TmAvatar author="Jane Davies" initials="JD" color="green" />
            <div className="tm-id">
              <b>Jane Davies</b>
              <span>Chief Commercial Officer · Tier 1 European operator</span>
            </div>
          </header>
          <blockquote className="tm-quote">Jurnii became the only intelligence source our trading, CRM, and product teams agreed on. The arguments stopped being about whose data was right — they became about what to do.</blockquote>
        </article>
        <div className="proof-press">
          <h4>In the press</h4>
          <div className="proof-press-list">
            <div className="proof-press-item"><div><b style={{ fontSize: "16px", fontWeight: 500, color: "var(--foreground)" }}>"Jurnii's promo intelligence is rewriting Cheltenham strategy"</b><span style={{ fontSize: "12px" }}>March 2026 · Feature</span></div><span className="src">iGaming Biz</span></div>
            <div className="proof-press-item"><div><b style={{ fontSize: "16px", color: "var(--foreground)" }}>"How AI is finally being used properly in iGaming"</b><span style={{ fontSize: "12px" }}>Feb 2026 · Op-ed</span></div><span className="src">Next.io</span></div>
            <div className="proof-press-item"><div><b style={{ fontSize: "16px", color: "var(--foreground)" }}>"The intelligence stack of the Tier 1 operator"</b><span style={{ fontSize: "12px" }}>Jan 2026 · Panel</span></div><span className="src">SiGMA</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>;


// ---------- Compare ----------
const BENCH_ROWS = [
{ dim: 'Speed to Insight', agencies: 'Weeks or months (manual delivery)', generic: 'Reactive, post-event logs', icon: 'zap', jurnii: 'Near Real-Time' },
{ dim: 'UX Benchmarking', agencies: 'Opinion-led, subjective reports', generic: 'Not supported natively', icon: 'briefcase', jurnii: 'AI-Powered & Heuristic' },
{ dim: 'Competitor Tracking', agencies: 'Manual screenshots, ad-hoc', generic: 'Internal funnel data only', icon: 'eye', jurnii: 'Always-On Automated Radar' },
{ dim: 'Commercial Connection', agencies: 'Dead PDF recommendations', generic: 'Vanity volume metrics', icon: 'trending-up', jurnii: 'NGR, Churn & ROI Tied' },
{ dim: 'Marketing Attribution', agencies: 'Out of scope completely', generic: 'Last-click or basic MTA only', icon: 'git-branch', jurnii: 'Causal MMM Modelling' }];


const CompareSection = () =>
<section className="section reveal" id="compare">
    <div className="container">
      <div className="section-head centered">
        <p className="eyebrow"><span className="dot" />Competitor benchmark</p>
        <h2 className="h2-section">Why Jurnii stands alone in iGaming intelligence.</h2>
      </div>
      <div className="bench-card">
        <div className="bench-scroll">
          <table className="bench-table">
            <thead>
              <tr>
                <th className="bench-dim">Dimension</th>
                <th>Traditional agencies</th>
                <th>Generic analytics</th>
                <th className="bench-jurnii">Jurnii</th>
              </tr>
            </thead>
            <tbody>
              {BENCH_ROWS.map((r) =>
            <tr key={r.dim}>
                  <td className="bench-dim">{r.dim}</td>
                  <td className="bench-them">{r.agencies}</td>
                  <td className="bench-them">{r.generic}</td>
                  <td className="bench-jurnii">
                    <span className="bench-pill"><i data-lucide={r.icon} />{r.jurnii}</span>
                  </td>
                </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
        <a className="btn ghost sm" href="compare-ekimetrics.html">vs Ekimetrics</a>
        <a className="btn ghost sm" href="compare-nielsen.html">vs Nielsen</a>
        <a className="btn ghost sm" href="compare-ux-agencies.html">vs UX agencies</a>
      </div>
    </div>
  </section>;


window.HomeHero = Hero;
window.HomeLogoBar = LogoBar;
window.HomePressBar = PressBar;
window.HomeProblem = ProblemSection;
window.HomeProductTabs = ProductTabs;
window.HomeHowItWorks = HowItWorks;
window.HomeProof = ProofSection;
window.HomeCompare = CompareSection;