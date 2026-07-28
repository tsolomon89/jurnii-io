// Live Telemetry — Interactive Competitor UX Benchmarking Hub
// Used as the second section on the Jurnii UX product page.
const { useState: tS, useEffect: tE, useRef: tR } = React;

// ---------- Data (anonymised — Brand 1..4) ----------
const TELE_BRANDS = [
  { key: 'b1', name: 'Brand 1', short: 'B1', region: 'Chile · Casino',     overall: 66, rating: 'Average', perf: 70, usab: 68, journeys: 61, perception: null,
    lh: { perf: 52, a11y: 100, bp: 85, seo: 90 }, vitals: { fcp: 3.28, tbt: 1.11, tti: 9.8, lcp: 4.09, si: 5.8, cls: 0.057 } },
  { key: 'b2', name: 'Brand 2', short: 'B2', region: 'LatAm · Casino',     overall: 54, rating: 'Poor',    perf: 41, usab: 79, journeys: 59, perception: 40,
    lh: { perf: 41, a11y: 92,  bp: 79, seo: 85 }, vitals: { fcp: 3.90, tbt: 1.62, tti: 11.2, lcp: 4.80, si: 6.4, cls: 0.089 } },
  { key: 'b3', name: 'Brand 3', short: 'B3', region: 'Chile · Sportsbook', overall: 60, rating: 'Poor',    perf: 4,  usab: 82, journeys: 68, perception: 76,
    lh: { perf: 4,  a11y: 88,  bp: 74, seo: 80 }, vitals: { fcp: 6.20, tbt: 3.40, tti: 18.5, lcp: 9.10, si: 11.2, cls: 0.241 } },
  { key: 'b4', name: 'Brand 4', short: 'B4', region: 'Chile · Sportsbook', overall: 62, rating: 'Average', perf: 43, usab: 76, journeys: 65, perception: null,
    lh: { perf: 43, a11y: 96,  bp: 82, seo: 88 }, vitals: { fcp: 3.60, tbt: 1.40, tti: 10.4, lcp: 4.40, si: 6.0, cls: 0.072 } },
];

const TELE_LEGEND = [
  { label: 'Very Poor', range: '0–45',   color: 'var(--very-poor)' },
  { label: 'Poor',      range: '46–60',  color: 'var(--poor)' },
  { label: 'Average',   range: '61–75',  color: 'var(--average)' },
  { label: 'Good',      range: '76–90',  color: 'var(--good)' },
  { label: 'Excellent', range: '91–100', color: 'var(--excellent)' },
];

const TELE_JOURNEYS = [
  ['01. Entry & Homepage', 87, 55, 68, 70, 70.0],
  ['02. Registration', 62, 68, 72, 65, 66.8],
  ['03. Signing-in', 64, 60, 70, 68, 65.5],
  ['04. Finding Games', 60, 62, 64, 62, 62.0],
  ['05. Playing Games', 65, 58, 66, 64, 63.3],
  ['06. Finding Bets', 58, 52, 60, 60, 57.5],
  ['07. Placing Bets', 69, 56, 62, 66, 63.3],
  ['08. Bonuses & Promotions', 63, 70, 80, 74, 71.8],
  ['09. Getting Help', 58, 48, 75, 58, 59.8],
  ['10. Account Management', 62, 62, 65, 63, 63.0],
];

const TELE_HEURISTICS = [
  { n: '01', title: 'System Feedback', desc: 'Frictionless transitions, loader cues, and visual response latencies across core checkout and login funnels.', scores: { b1: 72, b2: 66, b3: 79, b4: 61 } },
  { n: '02', title: 'Match System & Real World', desc: 'Natural terminology, intuitive sports betting slippage controls, and familiar payment/payout layouts.', scores: { b1: 91, b2: 100, b3: 84, b4: 71 } },
  { n: '03', title: 'Recognition Ease', desc: 'Minimizing cognitive load by making objects, actions, and options visible. Intuitive odds displays and betting slip persistence.', scores: { b1: 74, b2: 78, b3: 94, b4: 92 } },
  { n: '04', title: 'Consistency & Standards', desc: 'Adherence to established patterns in game categorization, sports lobby headers, and wallet locations.', scores: { b1: 83, b2: 87, b3: 84, b4: 83 } },
  { n: '05', title: 'Error Prevention', desc: 'Proactive alerts for invalid card inputs, mismatched registration details, or bet limits before execution.', scores: { b1: 73, b2: 71, b3: 53, b4: 57 } },
  { n: '06', title: 'Flexibility & Efficiency', desc: 'Accelerators for returning players, favorites lobbies, and streamlined quick-bet modules on live sports.', scores: { b1: 52, b2: 61, b3: 74, b4: 63 } },
  { n: '07', title: 'Aesthetic & Design', desc: 'Visual hierarchy, typography legibility, and brand coherence across key acquisition and retention touchpoints.', scores: { b1: 68, b2: 74, b3: 81, b4: 55 } },
  { n: '08', title: 'Simplicity & IA', desc: 'Clarity of information architecture, navigation depth, and discoverability of core betting and casino surfaces.', scores: { b1: 79, b2: 63, b3: 88, b4: 70 } },
  { n: '09', title: 'User Control & Freedom', desc: 'Ease of undoing actions, exiting flows, and managing account preferences without friction or dead ends.', scores: { b1: 61, b2: 85, b3: 76, b4: 58 } },
];

const TELE_TABS = [
  { id: 'summary', label: 'Score Summary' },
  { id: 'performance', label: 'Performance Audit' },
  { id: 'journeys', label: 'Journey Matrix' },
  { id: 'heuristics', label: 'Usability Heuristics' },
];

// ---------- Helpers ----------
function teleBand(n) {
  if (n == null) return { label: 'No data', color: 'var(--muted-foreground)' };
  if (n <= 45) return { label: 'Very Poor', color: 'var(--very-poor)' };
  if (n <= 60) return { label: 'Poor', color: 'var(--poor)' };
  if (n <= 75) return { label: 'Average', color: 'var(--average)' };
  if (n <= 90) return { label: 'Good', color: 'var(--good)' };
  return { label: 'Excellent', color: 'var(--excellent)' };
}
function lhColor(n) {
  if (n < 50) return 'var(--destructive)';
  if (n < 90) return 'var(--warning)';
  return 'var(--positive)';
}

// Count-up that re-runs when `run` toggles true.
function useTeleCount(target, run, dur = 1100) {
  const [v, setV] = tS(0);
  tE(() => {
    if (!run) { setV(0); return; }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return; }
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target]);
  return v;
}
const TeleNum = ({ value, lit, dur }) => useTeleCount(value, lit, dur);

// Scroll-into-view trigger — uses a scroll-position sweep (robust in embedded
// frames where IntersectionObserver can be unreliable). Fires once.
function useTeleInView(margin = 0.86) {
  const ref = tR(null);
  const [seen, setSeen] = tS(false);
  tE(() => {
    const el = ref.current;
    if (!el) return;
    let done = false, ticking = false, raf;
    const cleanup = () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    const check = () => {
      if (done || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * margin && r.bottom > 0) { done = true; setSeen(true); cleanup(); }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; check(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    raf = requestAnimationFrame(check);
    return () => { cleanup(); cancelAnimationFrame(raf); };
  }, []);
  return [ref, seen];
}

// ---------- Scorecard atoms (mirror the component-library Rating Card) ----------
const SC_ICON = {
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  navigation: <polygon points="3 11 22 2 13 21 11 13 3 11" />,
  'audio-waveform': <path d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2" />,
  heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
};
const SCIcon = ({ name }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{SC_ICON[name]}</svg>
);
const JurniiMark = ({ size = 42 }) => (
  <svg width={size} height={size} viewBox="0 0 88 88" fill="none" aria-hidden="true">
    <path d="M42.2788 52.8445L68.7087 41.0979C70.6628 40.2294 72.6595 42.2261 71.791 44.1802L60.0444 70.6101C59.0201 72.9149 55.5753 72.1839 55.5753 69.6617V59.6488C55.5753 58.3591 54.5298 57.3136 53.2401 57.3136H43.2272C40.705 57.3136 39.974 53.8688 42.2788 52.8445Z" fill="var(--jurnii-300)" />
    <path d="M45.4314 17.2873C45.8936 15.5709 48.3288 15.5709 48.791 17.2873L50.541 23.7871C50.7022 24.3858 51.1698 24.8534 51.7685 25.0146L58.2683 26.7647C59.9847 27.2268 59.9847 29.6621 58.2683 30.1242L51.7685 31.8743C51.1698 32.0355 50.7022 32.5031 50.541 33.1018L48.791 39.6016C48.3288 41.318 45.8936 41.318 45.4314 39.6016L43.6814 33.1018C43.5202 32.5031 43.0525 32.0355 42.4539 31.8743L35.9541 30.1242C34.2376 29.6621 34.2376 27.2268 35.9541 26.7647L42.4539 25.0146C43.0525 24.8534 43.5202 24.3858 43.6814 23.7871L45.4314 17.2873Z" fill="var(--sc-logo-mark)" />
    <path d="M24.0735 40.2987C24.4201 39.0114 26.2465 39.0114 26.5932 40.2987L27.9057 45.1736C28.0266 45.6226 28.3773 45.9733 28.8263 46.0942L33.7012 47.4068C34.9885 47.7534 34.9885 49.5798 33.7012 49.9264L28.8263 51.239C28.3773 51.3598 28.0266 51.7106 27.9057 52.1596L26.5932 57.0344C26.2465 58.3217 24.4201 58.3217 24.0735 57.0344L22.761 52.1596C22.6401 51.7106 22.2893 51.3598 21.8403 51.239L16.9655 49.9264C15.6782 49.5798 15.6782 47.7534 16.9655 47.4068L21.8403 46.0942C22.2893 45.9733 22.6401 45.6226 22.761 45.1736L24.0735 40.2987Z" fill="var(--sc-logo-mark)" />
  </svg>
);

// ---------- Score Summary (full Rating Card per brand) ----------
const TeleScoreCard = ({ b }) => {
  const [ref, lit] = useTeleInView();
  const band = teleBand(b.overall);
  const R = 140, L = Math.PI * R;
  const frac = Math.max(0, Math.min(1, b.overall / 100));
  const offset = lit ? L * (1 - frac) : L;
  const cats = [
    { label: 'Performance', v: b.perf, icon: 'zap', color: 'var(--performance)' },
    { label: 'Usability', v: b.usab, icon: 'navigation', color: 'var(--usability)' },
    { label: 'Journey', v: b.journeys, icon: 'audio-waveform', color: 'var(--journey)' },
    { label: 'Perception', v: b.perception, icon: 'heart', color: 'var(--perception)' },
  ];
  return (
    <div className="sc-card" ref={ref}>
      <div className="sc-head">
        <div className="sc-logo"><JurniiMark size={42} /></div>
        <div className="sc-head-text">
          <div className="sc-brand">{b.name}</div>
          <div className="sc-region">{b.region}</div>
        </div>
      </div>
      <div className="sc-gauge">
        <svg viewBox="0 0 320 186" className="sc-gauge-svg" aria-hidden="true">
          <path className="sc-gauge-track" d="M20 168 A140 140 0 0 1 300 168" fill="none" strokeWidth="24" strokeLinecap="round" />
          <path className="sc-gauge-value" d="M20 168 A140 140 0 0 1 300 168" fill="none" stroke={band.color} strokeWidth="24" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={offset} />
        </svg>
        <div className="sc-gauge-text">
          <div className="sc-gauge-label">Jurnii Score</div>
          <div className="sc-gauge-score">
            <span className="sc-gauge-num"><TeleNum value={b.overall} lit={lit} dur={1200} /></span>
            <span className="sc-gauge-denom">/ 100</span>
          </div>
          <div className="sc-gauge-rating" style={{ color: band.color }}>{b.rating}</div>
        </div>
      </div>
      <div className="sc-cats">
        {cats.map((c, i) => (
          <div className="sc-cat" key={c.label}>
            <div className="sc-cat-head">
              <div className="sc-cat-label">
                <span className="sc-cat-icon"><SCIcon name={c.icon} /></span>
                <span>{c.label}</span>
              </div>
              <div className="sc-cat-value" style={c.v == null ? { fontSize: 16, color: 'var(--muted-foreground)' } : null}>
                {c.v == null ? 'No reviews' : <TeleNum value={c.v} lit={lit} dur={1100} />}
              </div>
            </div>
            <div className="sc-bar-track">
              <div className="sc-bar-fill" style={{ width: lit && c.v != null ? c.v + '%' : '0%', background: c.color, transitionDelay: (0.15 + i * 0.12) + 's' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TeleSummary = () => (
  <div className="tele-pane">
    <div className="tele-pane-head">
      <h4>Score Summary</h4>
      <p>Comprehensive UX and performance benchmarking analysis across key operational categories — one Jurnii Rating Card per benchmarked brand.</p>
    </div>
    <div className="tele-legend">
      {TELE_LEGEND.map((l) => (
        <span className="tele-leg" key={l.label}>
          <i style={{ background: l.color }} />{l.label} <em>{l.range}</em>
        </span>
      ))}
    </div>
    <div className="tele-scores">
      {TELE_BRANDS.map((b) => <TeleScoreCard key={b.key} b={b} />)}
    </div>
  </div>
);

// ---------- Performance Audit ----------
const VITALS = [
  { k: 'fcp', label: 'First Contentful Paint', short: 'FCP', unit: 's' },
  { k: 'tbt', label: 'Total Blocking Time', short: 'TBT', unit: 's' },
  { k: 'tti', label: 'Time to Interactive', short: 'TTI', unit: 's' },
  { k: 'lcp', label: 'Largest Contentful Paint', short: 'LCP', unit: 's' },
  { k: 'si', label: 'Speed Index', short: 'SI', unit: 's' },
  { k: 'cls', label: 'Cumulative Layout Shift', short: 'CLS', unit: '' },
];

const TeleRing = ({ value, label, lit }) => {
  const R = 30, C = 2 * Math.PI * R;
  const off = lit ? C * (1 - value / 100) : C;
  const color = lhColor(value);
  return (
    <div className="tele-ring">
      <div className="tele-ring-wrap">
        <svg viewBox="0 0 80 80" className="tele-ring-svg" aria-hidden="true">
          <circle cx="40" cy="40" r={R} className="tele-ring-track" fill="none" strokeWidth="7" />
          <circle cx="40" cy="40" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
            stroke={color} strokeDasharray={C} strokeDashoffset={off}
            transform="rotate(-90 40 40)" className="tele-ring-val" />
        </svg>
        <span className="tele-ring-num" style={{ color }}>{value}</span>
      </div>
      <span className="tele-ring-lab">{label}</span>
    </div>
  );
};

const TelePerformance = () => {
  const [device, setDevice] = tS('desktop');
  const [sel, setSel] = tS('b1');
  const [mainRef, lit] = useTeleInView();
  tE(() => { window.lucide && window.lucide.createIcons(); }, [device, sel]);
  const b = TELE_BRANDS.find((x) => x.key === sel);
  const mob = device === 'mobile';
  const adjScore = (n) => mob ? Math.max(1, Math.round(n * 0.72)) : n;
  const lh = {
    perf: adjScore(b.lh.perf),
    a11y: mob ? Math.max(1, b.lh.a11y - 6) : b.lh.a11y,
    bp: mob ? Math.max(1, b.lh.bp - 5) : b.lh.bp,
    seo: mob ? Math.max(1, b.lh.seo - 3) : b.lh.seo,
  };
  const vit = (k) => {
    const raw = b.vitals[k];
    if (k === 'cls') return (mob ? raw * 1.5 : raw).toFixed(3);
    return (mob ? raw * 1.35 : raw).toFixed(2);
  };
  return (
    <div className="tele-pane">
      <div className="tele-pane-head">
        <h4>Performance Audit</h4>
        <p>Front-end speed and quality indices, audited per device profile against Google Lighthouse standards.</p>
      </div>
      <div className="tele-perf">
        <aside className="tele-perf-side">
          <div className="tele-seg-label">Device Profile</div>
          <div className="tele-seg">
            <button className={!mob ? 'on' : ''} onClick={() => setDevice('desktop')}>
              <i data-lucide="monitor" /> Desktop
            </button>
            <button className={mob ? 'on' : ''} onClick={() => setDevice('mobile')}>
              <i data-lucide="smartphone" /> Mobile
            </button>
          </div>
          <div className="tele-brand-list">
            {TELE_BRANDS.map((x) => {
              const sc = adjScore(x.lh.perf);
              return (
                <button key={x.key} className={`tele-brow ${x.key === sel ? 'on' : ''}`} onClick={() => setSel(x.key)}>
                  <span className="tele-avatar sm">{x.short}</span>
                  <span className="tele-brow-id">
                    <b>{x.name}</b>
                    <span>Overall: {x.overall} · Speed: {String(sc).padStart(2, '0')}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
        <div className="tele-perf-main" ref={mainRef}>
          <div className="tele-gauges">
            <TeleRing value={lh.perf} label="Performance" lit={lit} />
            <TeleRing value={lh.a11y} label="Accessibility" lit={lit} />
            <TeleRing value={lh.bp} label="Best Practices" lit={lit} />
            <TeleRing value={lh.seo} label="SEO" lit={lit} />
          </div>
          <div className="tele-vitals">
            {VITALS.map((v) => (
              <div className="tele-vital" key={v.k}>
                <div className="tv-label">{v.label} <em>({v.short})</em></div>
                <div className="tv-value">{vit(v.k)}{v.unit}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- Journey Matrix ----------
const TeleJourneys = () => (
  <div className="tele-pane">
    <div className="tele-pane-head">
      <h4>Journey Matrix</h4>
      <p>Touchpoint-level scoring across ten core player journeys, benchmarked brand-by-brand against the Jurnii market average.</p>
    </div>
    <div className="tele-matrix-wrap">
      <table className="tele-matrix">
        <thead>
          <tr>
            <th>Touchpoint Journey</th>
            {TELE_BRANDS.map((b) => <th key={b.key}>{b.name}</th>)}
            <th className="avg">Jurnii Avg</th>
          </tr>
        </thead>
        <tbody>
          {TELE_JOURNEYS.map((row) => (
            <tr key={row[0]}>
              <td className="jname">{row[0]}</td>
              {row.slice(1, 5).map((v, i) => {
                const band = teleBand(v);
                return (
                  <td key={i}>
                    <span className="tele-pill" style={{ color: band.color, background: `color-mix(in srgb, ${band.color} 14%, transparent)` }}>{v}</span>
                  </td>
                );
              })}
              <td>
                <span className="tele-pill avg" style={{ color: teleBand(Math.round(row[5])).color }}>{row[5].toFixed(1)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ---------- Usability Heuristics ----------
const TeleHeuristics = () => {
  const [ref, lit] = useTeleInView();
  return (
  <div className="tele-pane">
    <div className="tele-pane-head">
      <h4>Usability Heuristics</h4>
      <p>Nielsen-derived heuristic evaluation, scored per brand across the dimensions that govern player trust and flow.</p>
    </div>
    <div className="tele-heur" ref={ref}>
      {TELE_HEURISTICS.map((h) => (
        <div className="tele-heur-card" key={h.n}>
          <div className="tele-heur-top">
            <span className="num">{h.n}</span>
            <h5>{h.title}</h5>
          </div>
          <p>{h.desc}</p>
          <div className="tele-heur-scores">
            {TELE_BRANDS.map((b) => {
              const v = h.scores[b.key];
              const band = teleBand(v);
              return (
                <div className="tele-hs" key={b.key}>
                  <div className="tele-hs-head">
                    <span className="ini">{b.short}</span>
                    <span className="v" style={{ color: band.color }}>{v}</span>
                  </div>
                  <div className="tele-bar sm">
                    <div className="tele-bar-fill" style={{ width: lit ? v + '%' : 0, background: band.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  </div>
  );
};

// ---------- Main hub ----------
const UXTelemetry = () => {
  const [tab, setTab] = tS('summary');
  tE(() => { window.lucide && window.lucide.createIcons(); }, [tab]);
  return (
    <section className="section reveal" id="live-telemetry">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" />Live Telemetry</p>
          <h2 className="h2-section">Interactive Competitor UX Benchmarking Hub.</h2>
          <p className="section-lede">Explore real-world competitor scorecards, mobile vs. desktop audits, and multi-brand journey matrices — compiled directly from Jurnii's live iGaming intelligence platform.</p>
        </div>
        <div className="tele-hub">
          <div className="tele-tabs" role="tablist">
            {TELE_TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id}
                className={`tele-tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="tele-body">
            {tab === 'summary' && <TeleSummary />}
            {tab === 'performance' && <TelePerformance />}
            {tab === 'journeys' && <TeleJourneys />}
            {tab === 'heuristics' && <TeleHeuristics />}
          </div>
          <div className="tele-cta">
            <div>
              <h4>Benchmark your platform against 300+ competitors</h4>
              <p>Get a comprehensive, automated audit mapping your direct user-experience friction and speed indices against market leaders.</p>
            </div>
            <a href="contact-us.html" className="btn accent lg">Explore the full intelligence suite <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" /></a>
          </div>
        </div>
      </div>
    </section>
  );
};
window.UXTelemetry = UXTelemetry;
