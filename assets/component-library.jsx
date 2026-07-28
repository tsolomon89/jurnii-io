// Jurnii internal component library — live platform components for website showcase.
// Each component is theme-aware (light <-> jurnii-v1) via the shared site theme tokens.

const { useState, useEffect, useRef } = React;

/* ============================================================
   Theme management — shares the site's localStorage key
   ============================================================ */
const CL_THEME_KEY = 'jurnii-theme';
function clApplyTheme(t) { document.documentElement.setAttribute('data-theme', t); }
function clGetTheme() {
  try {
    const t = localStorage.getItem(CL_THEME_KEY);
    return (t === 'light' || t === 'jurnii-v1') ? t : 'light';
  } catch { return 'light'; }
}
function clSetTheme(t) {
  try { localStorage.setItem(CL_THEME_KEY, t); } catch {}
  clApplyTheme(t);
}
clApplyTheme(clGetTheme());

/* ============================================================
   Small helpers
   ============================================================ */
function useInView(ref) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return seen;
}

function useCountUp(target, run, dur = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setV(target); return;
    }
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setV(Math.round(target * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target]);
  return v;
}

/* ============================================================
   Inline icons (stroke icons matched to Jurnii 360 categories)
   ============================================================ */
const ICON_PATHS = {
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  navigation: <polygon points="3 11 22 2 13 21 11 13 3 11" />,
  'audio-waveform': <path d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2" />,
  heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
};
const SCIcon = ({ name, size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICON_PATHS[name]}
  </svg>
);

// Jurnii brand mark — green arrow + two sparkles. Sparkle fill adapts to theme.
const JurniiMark = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 88 88" fill="none" aria-hidden="true">
    <path d="M42.2788 52.8445L68.7087 41.0979C70.6628 40.2294 72.6595 42.2261 71.791 44.1802L60.0444 70.6101C59.0201 72.9149 55.5753 72.1839 55.5753 69.6617V59.6488C55.5753 58.3591 54.5298 57.3136 53.2401 57.3136H43.2272C40.705 57.3136 39.974 53.8688 42.2788 52.8445Z" fill="#57FF60" />
    <path d="M45.4314 17.2873C45.8936 15.5709 48.3288 15.5709 48.791 17.2873L50.541 23.7871C50.7022 24.3858 51.1698 24.8534 51.7685 25.0146L58.2683 26.7647C59.9847 27.2268 59.9847 29.6621 58.2683 30.1242L51.7685 31.8743C51.1698 32.0355 50.7022 32.5031 50.541 33.1018L48.791 39.6016C48.3288 41.318 45.8936 41.318 45.4314 39.6016L43.6814 33.1018C43.5202 32.5031 43.0525 32.0355 42.4539 31.8743L35.9541 30.1242C34.2376 29.6621 34.2376 27.2268 35.9541 26.7647L42.4539 25.0146C43.0525 24.8534 43.5202 24.3858 43.6814 23.7871L45.4314 17.2873Z" fill="var(--sc-logo-mark)" />
    <path d="M24.0735 40.2987C24.4201 39.0114 26.2465 39.0114 26.5932 40.2987L27.9057 45.1736C28.0266 45.6226 28.3773 45.9733 28.8263 46.0942L33.7012 47.4068C34.9885 47.7534 34.9885 49.5798 33.7012 49.9264L28.8263 51.239C28.3773 51.3598 28.0266 51.7106 27.9057 52.1596L26.5932 57.0344C26.2465 58.3217 24.4201 58.3217 24.0735 57.0344L22.761 52.1596C22.6401 51.7106 22.2893 51.3598 21.8403 51.239L16.9655 49.9264C15.6782 49.5798 15.6782 47.7534 16.9655 47.4068L21.8403 46.0942C22.2893 45.9733 22.6401 45.6226 22.761 45.1736L24.0735 40.2987Z" fill="var(--sc-logo-mark)" />
  </svg>
);

/* ============================================================
   UX SCORECARD  (platform "Rating Card")
   ============================================================ */
const SC_CATEGORIES = [
  { key: 'performance', label: 'Performance', icon: 'zap',             value: 38, color: 'var(--performance)' },
  { key: 'usability',   label: 'Usability',   icon: 'navigation',      value: 63, color: 'var(--usability)' },
  { key: 'journey',     label: 'Journey',     icon: 'audio-waveform',  value: 66, color: 'var(--journey)' },
  { key: 'perception',  label: 'Perception',  icon: 'heart',           value: 65, color: 'var(--perception)' },
];

const CategoryRow = ({ cat, run, index }) => {
  const num = useCountUp(cat.value, run, 1100);
  return (
    <div className="sc-cat">
      <div className="sc-cat-head">
        <div className="sc-cat-label">
          <span className="sc-cat-icon"><SCIcon name={cat.icon} /></span>
          <span>{cat.label}</span>
        </div>
        <div className="sc-cat-value">{num}</div>
      </div>
      <div className="sc-bar-track">
        <div
          className="sc-bar-fill"
          style={{
            width: run ? cat.value + '%' : '0%',
            background: cat.color,
            transitionDelay: (0.15 + index * 0.12) + 's',
          }}
        />
      </div>
    </div>
  );
};

const UXScorecard = ({ score = 60, rating = 'Poor', brand = 'Your Brand', region = 'Your Region' }) => {
  const ref = useRef(null);
  const run = useInView(ref);
  const scoreNum = useCountUp(score, run, 1200);

  // Gauge geometry — 180deg arc
  const R = 140;
  const L = Math.PI * R;              // semicircle length
  const frac = Math.max(0, Math.min(1, score / 100));
  const offset = run ? L * (1 - frac) : L;

  return (
    <div className="sc-card" ref={ref}>
      {/* Header */}
      <div className="sc-head">
        <div className="sc-logo"><JurniiMark size={42} /></div>
        <div className="sc-head-text">
          <div className="sc-brand">{brand}</div>
          <div className="sc-region">{region}</div>
        </div>
      </div>

      {/* Gauge */}
      <div className="sc-gauge">
        <svg viewBox="0 0 320 186" className="sc-gauge-svg" aria-hidden="true">
          <path className="sc-gauge-track" d="M20 168 A140 140 0 0 1 300 168"
                fill="none" strokeWidth="24" strokeLinecap="round" />
          <path className="sc-gauge-value" d="M20 168 A140 140 0 0 1 300 168"
                fill="none" stroke="var(--poor)" strokeWidth="24" strokeLinecap="round"
                strokeDasharray={L} strokeDashoffset={offset} />
        </svg>
        <div className="sc-gauge-text">
          <div className="sc-gauge-label">Jurnii Score</div>
          <div className="sc-gauge-score">
            <span className="sc-gauge-num">{scoreNum}</span>
            <span className="sc-gauge-denom">/ 100</span>
          </div>
          <div className="sc-gauge-rating">{rating}</div>
        </div>
      </div>

      {/* Categories */}
      <div className="sc-cats">
        {SC_CATEGORIES.map((c, i) => (
          <CategoryRow key={c.key} cat={c} run={run} index={i} />
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   PRICE BOOST CARD  (Jurnii 360 — detected competitor promotion)
   ============================================================ */
const PBArrow = () => (
  <svg width="46" height="20" viewBox="0 0 46 20" fill="none" stroke="currentColor"
       strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="2" y1="10" x2="40" y2="10" />
    <polyline points="32 3 41 10 32 17" />
  </svg>
);

const PriceBoostCard = ({
  brand = 'Your Brand',
  product = 'Super Price Boost',
  status = 'Active',
  match = 'Manchester United vs Liverpool',
  date = '07/03/2026',
  market = 'Bruno Fernandes to Assist & Kobbie Mainoo to score',
  was = '4/7',
  now = '4/5',
  boost = '+28%',
}) => (
  <div className="pb-card">
    <div className="pb-head">
      <div className="pb-logo"><JurniiMark size={42} /></div>
      <div className="pb-head-text">
        <div className="pb-brand">{brand}</div>
        <div className="pb-product">{product}</div>
      </div>
      <span className="pb-status">{status}</span>
    </div>

    <div className="pb-body">
      <div className="pb-match">{match}</div>
      <div className="pb-date">Date Detected: {date}</div>
    </div>

    <div className="pb-market">
      <div className="pb-market-label">Market</div>
      <div className="pb-market-value">{market}</div>
    </div>

    <div className="pb-odds">
      <div className="pb-odds-col">
        <span className="pb-odds-cap">Was</span>
        <span className="pb-odds-num was">{was}</span>
      </div>
      <span className="pb-odds-arrow"><PBArrow /></span>
      <div className="pb-odds-col">
        <span className="pb-odds-cap">Now</span>
        <span className="pb-odds-num">{now}</span>
      </div>
      <span className="pb-boost">{boost}</span>
    </div>
  </div>
);

/* ============================================================
   Page chrome
   ============================================================ */
const ThemeToggle = ({ theme, onChange }) => (
  <div className="cl-toggle" role="group" aria-label="Theme">
    {[
      { v: 'light', label: 'Light' },
      { v: 'jurnii-v1', label: 'Jurnii v1' },
    ].map(o => (
      <button
        key={o.v}
        className={'cl-toggle-btn' + (theme === o.v ? ' is-active' : '')}
        onClick={() => onChange(o.v)}
        aria-pressed={theme === o.v}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const ComponentSection = ({ name, product, stageLabel, wide, xwide, children }) => (
  <section className="cl-section">
    <div className="cl-section-head">
      <div>
        <p className="cl-eyebrow">Component</p>
        <h2 className="cl-section-title">{name}</h2>
      </div>
      <span className="cl-product-tag">{product}</span>
    </div>
    <div className="cl-stage">
      {stageLabel && <span className="cl-stage-label">{stageLabel}</span>}
      <div className={'cl-stage-inner' + (wide ? ' wide' : '') + (xwide ? ' xwide' : '')}>{children}</div>
    </div>
  </section>
);

const App = () => {
  const [theme, setTheme] = useState(clGetTheme());
  const [filter, setFilter] = useState('All');
  const change = (t) => { clSetTheme(t); setTheme(t); };
  const show = (product) => filter === 'All' || filter === product;

  return (
    <React.Fragment>
      <header className="cl-topbar">
        <div className="cl-topbar-inner">
          <div className="cl-brandblock">
            <JurniiMark size={28} />
            <div>
              <div className="cl-title">Component Library</div>
              <div className="cl-sub">Internal reference · not public</div>
            </div>
          </div>
          <ThemeToggle theme={theme} onChange={change} />
        </div>
      </header>

      <main className="cl-main">
        <div className="cl-intro">
          <p className="cl-eyebrow">Jurnii platform</p>
          <h1 className="cl-h1">Live UI components</h1>
          <p className="cl-lede">
            Real components pulled from the Jurnii platform, ready to select and showcase on the
            marketing site. They track the active theme — switch between Light and Jurnii&nbsp;v1 above.
          </p>
          <div className="cl-toggle" role="group" aria-label="Filter by product" style={{ marginTop: 24, display: 'inline-flex' }}>
            {['All', 'Jurnii UX', 'Jurnii 360'].map(opt => (
              <button key={opt}
                className={'cl-toggle-btn' + (filter === opt ? ' is-active' : '')}
                onClick={() => setFilter(opt)}
                aria-pressed={filter === opt}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        {show('Jurnii UX') && (
          <ComponentSection name="UX Scorecard" product="Jurnii UX" stageLabel="Rating Card">
            <UXScorecard />
          </ComponentSection>
        )}

        {show('Jurnii UX') && (
          <ComponentSection name="Score Trend" product="Jurnii UX" stageLabel="Line Chart" wide>
            <JurniiLineChart />
          </ComponentSection>
        )}

        {show('Jurnii 360') && (
          <ComponentSection name="Price Boost Card" product="Jurnii 360" stageLabel="Price Boost Card">
            <PriceBoostCard />
          </ComponentSection>
        )}

        {show('Jurnii 360') && (
          <ComponentSection name="Price Boost Promotions Table" product="Jurnii 360" stageLabel="Price Boost Table" wide>
            <PriceBoostTable />
          </ComponentSection>
        )}

        {show('Jurnii 360') && (
          <ComponentSection name="Promotions by Vertical" product="Jurnii 360" stageLabel="Dashboard Panel" xwide>
            <PromotionsByVertical />
          </ComponentSection>
        )}

        {show('Jurnii UX') && (
          <ComponentSection name="Recommendation Modal" product="Jurnii UX" stageLabel="Recommendation Modal" wide>
            <RecommendationModal />
          </ComponentSection>
        )}
      </main>
    </React.Fragment>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
