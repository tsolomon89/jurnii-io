// Shared site components: Nav, Footer, DemoCTA, Theme tweaks, brand wordmarks, reveal hook
// Each top-level page does: <Nav active="..." /> ... <DemoCTA /> <Footer /> <ThemeTweaks /> <StickyDemoCTA />

const { useState, useEffect, useRef, useCallback } = React;

// ---------- Theme management ----------
const THEME_KEY = 'jurnii-theme';
const HERO_VAR_KEY = 'jurnii-hero-variant';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
function getStoredTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'light'; } catch { return 'light'; }
}
function setStoredTheme(t) {
  try { localStorage.setItem(THEME_KEY, t); } catch {}
  applyTheme(t);
}

// Apply on load before paint
(function initTheme() {
  applyTheme(getStoredTheme());
})();

// ---------- Reveal on scroll ----------
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.in-view)');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(el => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '-60px 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  });
}

// ---------- Brand wordmarks (stylized SVGs) ----------
const BrandWordmark = ({ name }) => {
  // Each gets a distinct visual identity
  const props = { fill: 'currentColor' };
  switch (name) {
    case 'Flutter':
      return (<svg viewBox="0 0 130 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="20" fontWeight="700" letterSpacing="-0.02em">Flutter</text><circle cx="118" cy="13" r="4" fill="#1ddea6" /></svg>);
    case 'Entain':
      return (<svg viewBox="0 0 110 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="22" fontWeight="800" letterSpacing="-0.04em" fontStyle="italic">entain</text></svg>);
    case 'Bet365':
      return (<svg viewBox="0 0 120 28" {...props}><rect x="0" y="4" width="22" height="22" rx="3" fill="currentColor"/><text x="6" y="20" fill="#F8F8F7" fontFamily="Geist, sans-serif" fontSize="14" fontWeight="800">365</text><text x="30" y="20" fontFamily="Geist, sans-serif" fontSize="18" fontWeight="700" letterSpacing="-0.02em">Bet 365</text></svg>);
    case 'Kindred':
      return (<svg viewBox="0 0 110 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="20" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">KINDRED</text></svg>);
    case 'Betsson':
      return (<svg viewBox="0 0 110 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="22" fontWeight="800" letterSpacing="-0.03em">Betsson</text></svg>);
    case 'LeoVegas':
      return (<svg viewBox="0 0 130 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="20" fontWeight="700" letterSpacing="-0.02em">LeoVegas</text></svg>);
    case 'PaddyPower':
      return (<svg viewBox="0 0 144 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="18" fontWeight="700" letterSpacing="-0.02em">Paddy Power</text></svg>);
    case 'WilliamHill':
      return (<svg viewBox="0 0 138 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="18" fontWeight="700" letterSpacing="-0.02em">William Hill</text></svg>);
    case 'iGamingBusiness':
      return (<svg viewBox="0 0 170 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="16" fontWeight="700" letterSpacing="-0.01em">iGaming Business</text></svg>);
    case 'SiGMA':
      return (<svg viewBox="0 0 90 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="22" fontWeight="800" letterSpacing="0.04em">SiGMA</text></svg>);
    case 'NextIO':
      return (<svg viewBox="0 0 90 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="20" fontWeight="700" letterSpacing="-0.02em">Next.io</text></svg>);
    case 'EGR':
      return (<svg viewBox="0 0 80 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="22" fontWeight="800" letterSpacing="0.02em">EGR</text></svg>);
    case 'GamblingInsider':
      return (<svg viewBox="0 0 170 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="16" fontWeight="700" letterSpacing="-0.01em">Gambling Insider</text></svg>);
    default:
      return (<svg viewBox="0 0 100 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="18" fontWeight="700">{name}</text></svg>);
  }
};
window.BrandWordmark = BrandWordmark;

// ---------- Nav ----------
const NAV_PRODUCTS = [
  { href: 'jurnii-ux.html', title: 'Jurnii UX', desc: 'AI-powered UX audit, commercial outcomes', icon: 'sparkles' },
  { href: 'jurnii-360.html', title: 'Jurnii 360', desc: 'Real-time competitor promotion intelligence', icon: 'radar' },
  { href: 'jurnii-mmm.html', title: 'Jurnii MMM', desc: 'Marketing mix modelling for iGaming', icon: 'line-chart' },
];
const NAV_RESOURCES = [
  { href: 'resources.html?cat=comparison', title: 'Jurnii vs X', desc: 'Honest comparisons against competitors', icon: 'git-compare' },
  { href: 'resources.html?cat=guide', title: 'How-to guides', desc: 'Practical playbooks for operators', icon: 'book-open' },
  { href: 'resources.html?cat=report', title: 'Market reports', desc: 'Annual & seasonal intelligence', icon: 'file-text' },
  { href: 'resources.html?cat=thought', title: 'Thought leadership', desc: 'Where the market is going', icon: 'lightbulb' },
  { href: 'resources.html?cat=casestudy', title: 'Case studies', desc: 'Real outcomes, named operators', icon: 'briefcase' },
];

const Dropdown = ({ label, items }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  useEffect(() => { window.lucide && window.lucide.createIcons(); }, [open]);
  return (
    <div className={`dropdown ${open ? 'open' : ''}`} ref={ref}>
      <button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {label}
        <i data-lucide="chevron-down" style={{ width: 12, height: 12 }} />
      </button>
      <div className="dropdown-panel" role="menu">
        {items.map(it => (
          <a key={it.href} className="dropdown-item" href={it.href} role="menuitem">
            <div className="ico"><i data-lucide={it.icon} style={{ width: 16, height: 16 }} /></div>
            <div>
              <b>{it.title}</b>
              <span>{it.desc}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

const Nav = ({ active = '' }) => {
  const [theme, setTheme] = useState(getStoredTheme());
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { window.lucide && window.lucide.createIcons(); }, [mobileOpen, theme]);
  const cycleTheme = () => {
    const order = ['light', 'dark', 'jurnii-v1'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setStoredTheme(next); setTheme(next);
  };
  const themeIcon = theme === 'dark' ? 'moon' : (theme === 'jurnii-v1' ? 'sparkles' : 'sun');
  const isActive = (key) => active === key ? 'is-active' : '';
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="nav-brand" href="index.html" aria-label="Jurnii home">
          <img src="assets/jurnii-light-full.svg" alt="Jurnii" className="logo-light" style={{ display: theme === 'light' ? 'block' : 'none' }}/>
          <img src="assets/jurnii-dark-full.svg" alt="Jurnii" className="logo-dark" style={{ display: theme !== 'light' ? 'block' : 'none' }}/>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <Dropdown label="Products" items={NAV_PRODUCTS} />
          <Dropdown label="Resources" items={NAV_RESOURCES} />
          <a href="industries.html" className={isActive('industries')}>Industries</a>
          <a href="who-its-for.html" className={isActive('who')}>Who it's for</a>
          <a href="about.html" className={isActive('about')}>About</a>
        </nav>
        <div className="nav-cta">
          <button className="icon-btn desktop-only" onClick={cycleTheme} aria-label="Cycle theme" title={`Theme: ${theme}`}>
            <i data-lucide={themeIcon} style={{ width: 16, height: 16 }} />
          </button>
          <a href="#" className="btn ghost sm desktop-only">Log in</a>
          <a href="contact.html" className="btn accent sm">Book a demo</a>
          <button className="icon-btn nav-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <i data-lucide="menu" style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>
      <div className={`nav-mobile-overlay ${mobileOpen ? 'open' : ''}`} role="dialog" aria-modal="true">
        <div className="nav-mobile-head">
          <img src="assets/jurnii-light-full.svg" alt="Jurnii" style={{ display: theme === 'light' ? 'block' : 'none' }}/>
          <img src="assets/jurnii-dark-full.svg" alt="Jurnii" style={{ display: theme !== 'light' ? 'block' : 'none' }}/>
          <button className="icon-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <i data-lucide="x" style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div className="nav-mobile-list">
          <div className="nav-mobile-group-head">Products</div>
          {NAV_PRODUCTS.map(p => <a key={p.href} href={p.href}>{p.title}</a>)}
          <div className="nav-mobile-group-head" style={{ marginTop: 16 }}>Resources</div>
          {NAV_RESOURCES.map(r => <a key={r.href} href={r.href}>{r.title}</a>)}
          <a href="industries.html" style={{ marginTop: 16 }}>Industries</a>
          <a href="who-its-for.html">Who it's for</a>
          <a href="about.html">About</a>
          <a href="contact.html">Contact</a>
        </div>
        <div className="nav-mobile-foot">
          <button className="btn ghost" onClick={cycleTheme}>
            <i data-lucide={themeIcon} style={{ width: 14, height: 14 }} /> Theme: {theme}
          </button>
          <a href="contact.html" className="btn accent">Book a demo</a>
        </div>
      </div>
    </header>
  );
};
window.Nav = Nav;

// ---------- DemoCTA ----------
const DemoCTA = ({ heading, sub }) => (
  <section className="demo-cta">
    <div className="container demo-cta-inner">
      <h2>{heading || 'See what your competitors are doing — before they do it to you.'}</h2>
      <p>{sub || 'A 30-minute demo, with sample intelligence for your real competitor set. No boilerplate deck, no sales pressure.'}</p>
      <div className="actions">
        <a className="btn accent lg" href="contact.html">Book a demo <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow"/></a>
        <a className="btn ghost-on-dark lg" href="resources.html">Read the research</a>
      </div>
      <div className="demo-cta-sub">
        <div><b>30 min</b> Zoom or in-person</div>
        <div><b>Sample data</b> for your competitor set</div>
        <div><b>No obligation</b> — straight talk</div>
      </div>
    </div>
  </section>
);
window.DemoCTA = DemoCTA;

// ---------- Footer ----------
const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div className="footer-brand">
          <img src="assets/jurnii-dark-full.svg" alt="Jurnii"/>
          <p>Commercial intelligence for iGaming operators. Replace manual research with structured, near-real-time signal.</p>
          <div className="footer-social" style={{ marginTop: 18 }}>
            <a href="#" aria-label="LinkedIn"><i data-lucide="linkedin" style={{ width: 14, height: 14 }} /></a>
            <a href="#" aria-label="X/Twitter"><i data-lucide="x" style={{ width: 14, height: 14 }} /></a>
            <a href="#" aria-label="Email"><i data-lucide="mail" style={{ width: 14, height: 14 }} /></a>
          </div>
        </div>
        <div className="footer-cols">
          <div>
            <div className="footer-head">Products</div>
            <a href="jurnii-ux.html">Jurnii UX</a>
            <a href="jurnii-360.html">Jurnii 360</a>
            <a href="jurnii-mmm.html">Jurnii MMM</a>
          </div>
          <div>
            <div className="footer-head">Compare</div>
            <a href="compare-ekimetrics.html">vs Ekimetrics</a>
            <a href="compare-nielsen.html">vs Nielsen</a>
            <a href="compare-ux-agencies.html">vs UX agencies</a>
            <a href="compare-manual-tracking.html">vs manual tracking</a>
          </div>
          <div>
            <div className="footer-head">Resources</div>
            <a href="resources.html?cat=guide">Guides</a>
            <a href="resources.html?cat=report">Reports</a>
            <a href="resources.html?cat=thought">Thought leadership</a>
            <a href="resources.html?cat=casestudy">Case studies</a>
          </div>
          <div>
            <div className="footer-head">Company</div>
            <a href="about.html">About</a>
            <a href="contact.html">Contact</a>
            <a href="#">Careers</a>
            <a href="#">Privacy</a>
          </div>
        </div>
      </div>
      <div className="footer-foot">
        <span>© 2026 Jurnii Ltd. — London, UK. All rights reserved.</span>
        <span>hello@jurnii.io</span>
      </div>
    </div>
  </footer>
);
window.Footer = Footer;

// ---------- Sticky mobile CTA ----------
const StickyDemoCTA = () => (
  <a href="contact.html" className="sticky-demo-cta">
    <div className="label">
      Book a demo
      <span>30 min · Zoom or in-person</span>
    </div>
    <span className="btn accent sm">Get started <i data-lucide="arrow-right" style={{ width: 12, height: 12 }} /></span>
  </a>
);
window.StickyDemoCTA = StickyDemoCTA;

// ---------- Tweaks panel (theme + hero variant) ----------
const ThemeTweaks = () => {
  const [active, setActive] = useState(false);
  const [theme, setTheme] = useState(getStoredTheme());
  const [variant, setVariant] = useState(() => {
    try { return localStorage.getItem(HERO_VAR_KEY) || 'dashboard'; } catch { return 'dashboard'; }
  });
  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setActive(true);
      if (e.data.type === '__deactivate_edit_mode') setActive(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  useEffect(() => { window.lucide && window.lucide.createIcons(); }, [active, theme, variant]);
  // Apply hero variant
  useEffect(() => {
    document.querySelectorAll('.hero[data-variant]').forEach(el => el.setAttribute('data-variant', variant));
    try { localStorage.setItem(HERO_VAR_KEY, variant); } catch {}
  }, [variant]);
  if (!active) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200, background: 'var(--popover)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: '0 16px 48px -12px rgba(0,0,0,0.2)', width: 280 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <b style={{ fontSize: 13, fontWeight: 600 }}>Tweaks</b>
        <button onClick={() => { setActive(false); window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); }} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--muted-foreground)' }} aria-label="Close"><i data-lucide="x" style={{ width: 14, height: 14 }} /></button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 8 }}>Theme</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {['light', 'dark', 'jurnii-v1'].map(t => (
            <button key={t} onClick={() => { setStoredTheme(t); setTheme(t); }} className="filter-pill" style={{ padding: '8px', fontSize: 12, background: theme === t ? 'var(--concrete-950)' : 'var(--card)', color: theme === t ? 'var(--concrete-50)' : 'var(--foreground)' }}>
              {t === 'jurnii-v1' ? 'v1 teal' : t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 8 }}>Hero visual</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[
            { v: 'dashboard', l: 'Dashboard' },
            { v: 'orbit', l: 'Orbit' },
            { v: 'ticker', l: 'Ticker' },
          ].map(o => (
            <button key={o.v} onClick={() => setVariant(o.v)} className="filter-pill" style={{ padding: '8px', fontSize: 12, background: variant === o.v ? 'var(--concrete-950)' : 'var(--card)', color: variant === o.v ? 'var(--concrete-50)' : 'var(--foreground)' }}>
              {o.l}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '12px 0 0', lineHeight: 1.5 }}>Hero variant only shows on the homepage.</p>
      </div>
    </div>
  );
};
window.ThemeTweaks = ThemeTweaks;

// ---------- Page chrome wrapper ----------
const PageChrome = ({ active, children }) => {
  useReveal();
  useEffect(() => {
    window.lucide && window.lucide.createIcons();
    // Restore hero variant
    try {
      const v = localStorage.getItem(HERO_VAR_KEY) || 'dashboard';
      document.querySelectorAll('.hero[data-variant]').forEach(el => el.setAttribute('data-variant', v));
    } catch {}
  }, []);
  return (
    <React.Fragment>
      <Nav active={active} />
      {children}
      <DemoCTA />
      <Footer />
      <StickyDemoCTA />
      <ThemeTweaks />
    </React.Fragment>
  );
};
window.PageChrome = PageChrome;
