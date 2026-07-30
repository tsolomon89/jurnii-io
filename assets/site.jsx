// Shared site components: Nav, Footer, DemoCTA, Theme tweaks, brand wordmarks, reveal hook
// Each top-level page does: <Nav active="..." /> ... <DemoCTA /> <Footer /> <ThemeTweaks /> <StickyDemoCTA />

const { useState, useEffect, useRef, useCallback } = React;

// ---------- Theme management ----------
const THEME_KEY = 'jurnii-theme';
const HERO_VAR_KEY = 'jurnii-hero-variant-2';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
function getStoredTheme() {
  try {return localStorage.getItem(THEME_KEY) || 'light';} catch {return 'light';}
}
function setStoredTheme(t) {
  try {localStorage.setItem(THEME_KEY, t);} catch {}
  applyTheme(t);
}

/** True when the user prefers reduced motion. */
function prefersReducedMotion() {
  try {return window.matchMedia('(prefers-reduced-motion: reduce)').matches;} catch {return false;}
}

/**
 * Switch theme with a circular wipe from the click point (View Transition API).
 * Falls back to a brief veil crossfade, then to an instant swap.
 * @param {string} nextTheme
 * @param {MouseEvent|PointerEvent|{clientX?:number,clientY?:number}|null} [source]
 */
function transitionTheme(nextTheme, source) {
  const current = document.documentElement.getAttribute('data-theme');
  if (nextTheme === current) {
    setStoredTheme(nextTheme);
    return Promise.resolve();
  }

  const apply = () => setStoredTheme(nextTheme);

  if (prefersReducedMotion()) {
    apply();
    return Promise.resolve();
  }

  const x = source && typeof source.clientX === 'number' ? source.clientX : window.innerWidth - 48;
  const y = source && typeof source.clientY === 'number' ? source.clientY : 28;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  // Modern path: circular reveal from the control that triggered the switch.
  if (typeof document.startViewTransition === 'function') {
    document.documentElement.classList.add('theme-switching');
    const transition = document.startViewTransition(apply);
    const done = transition.finished.finally(() => {
      document.documentElement.classList.remove('theme-switching');
    });
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: 560,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      );
    }).catch(() => {});
    return done.catch(() => {});
  }

  // Fallback: short veil flash so the swap still feels intentional.
  return new Promise((resolve) => {
    const veil = document.createElement('div');
    veil.className = 'theme-veil';
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);
    // Force paint, then fade in → swap → fade out.
    requestAnimationFrame(() => {
      veil.classList.add('is-on');
      window.setTimeout(() => {
        apply();
        veil.classList.remove('is-on');
        veil.classList.add('is-out');
        window.setTimeout(() => {
          veil.remove();
          resolve();
        }, 280);
      }, 140);
    });
  });
}

window.transitionTheme = transitionTheme;

// Apply on load before paint
(function initTheme() {
  applyTheme(getStoredTheme());
})();

// ---------- Reveal on scroll (GSAP-powered) ----------
// Centralized scroll-animation engine. Every page mounts this via PageChrome.
// - .reveal sections fade + rise as they enter view (trigger once)
// - card grids stagger their children in one-by-one
// - big stat numbers count up from zero
// Respects prefers-reduced-motion: shows everything instantly, no motion.

// Card-grid containers whose children should stagger in. These are the
// primary repeating-card blocks that make up the bulk of their section.
const FX_STAGGER_GROUPS = [
'.problem-grid', '.how-grid', '.proof-grid', '.resources-grid',
'.pricing-grid', '.team-grid', '.feature-grid', '.outcome-grid',
'.method-list', '.persona-grid', '.industry-list', '.icp-stats'].
join(', ');

// Leading number elements that should count up when revealed.
const FX_COUNT_TARGETS = [
'.hero-stats .n', '.proof-stat .n', '.tab-visual-stat .n',
'.icp-stat-num', '.industry-proof-stat', '.outcome-num'].
join(', ');

function fxAnimateCount(node, g) {
  if (node.dataset.fxCounted) return;
  // The number markup is `<leading>NN</leading><span class="small-suffix">%</span>`
  // where <leading> is a raw text node on the live site, or an editor-wrapped
  // <span class="__om-t"> in the preview. Find the first child that holds the
  // numeric portion (skipping the styled suffix span) and animate just that —
  // so suffixes like %, M, ×, /100 keep their styling.
  const isSuffix = (n) => n.nodeType === 1 && n.matches('.small-suffix, small');
  const owner = Array.from(node.childNodes).find(
    (n) => !isSuffix(n) && /\d/.test(n.textContent || '')
  ) || node;
  const raw = owner.textContent;
  const m = raw.match(/-?[\d,]*\.?\d+/);
  if (!m) return;
  const numStr = m[0];
  const target = parseFloat(numStr.replace(/,/g, ''));
  if (!isFinite(target)) return;
  node.dataset.fxCounted = '1';
  const decimals = (numStr.split('.')[1] || '').length;
  const grouped = numStr.includes(',');
  const prefix = raw.slice(0, m.index);
  const suffix = raw.slice(m.index + numStr.length);
  const render = (v) => {
    const s = decimals ? v.toFixed(decimals) :
    grouped ? Math.round(v).toLocaleString() : String(Math.round(v));
    owner.textContent = prefix + s + suffix;
  };
  const obj = { v: 0 };
  render(0);
  g.to(obj, {
    v: target, duration: 1.1, ease: 'power2.out',
    onUpdate: () => render(obj.v),
    onComplete: () => {owner.textContent = raw;}
  });
}

function fxRevealElement(el, g) {
  const group = el.matches(FX_STAGGER_GROUPS) ? el : el.querySelector(FX_STAGGER_GROUPS);
  if (group && group.children.length > 1) {
    // Section intro (heading) + each card stagger in; container just fades.
    const units = [];
    const head = el.querySelector('.section-head');
    if (head && head !== group && !group.contains(head)) units.push(head);
    units.push(...group.children);
    g.set(el, { clearProps: 'transform' });
    g.to(el, { autoAlpha: 1, duration: 0.4, ease: 'power1.out' });
    g.fromTo(units,
    { autoAlpha: 0, y: 16 },
    { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.09, delay: 0.04, clearProps: 'transform' }
    );
  } else {
    g.fromTo(el,
    { autoAlpha: 0, y: 18 },
    { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', clearProps: 'transform' }
    );
  }
  el.querySelectorAll(FX_COUNT_TARGETS).forEach((n) => fxAnimateCount(n, g));
}

function initScrollFX() {
  const g = window.gsap;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pending = () => document.querySelectorAll('.reveal:not(.in-view)');

  // No GSAP or reduced motion → show everything instantly, no movement.
  if (!g || reduced) {
    const show = () => pending().forEach((el) => el.classList.add('in-view'));
    window.__fxSweep = show;
    show();
    return;
  }

  // GSAP owns the reveal — disable the CSS transition fallback.
  document.documentElement.classList.add('js-gsap');

  // Reveal anything whose top has scrolled into the lower ~92% of the
  // viewport. Trigger-once: each element animates a single time, then is
  // marked in-view and skipped. A scroll-position sweep is used (rather than
  // IntersectionObserver) so it's robust even when the page mounts already
  // in view or inside an embedded frame.
  const sweep = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    pending().forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh * 0.92) {
        el.classList.add('in-view');
        fxRevealElement(el, window.gsap);
      }
    });
    // Keep listeners — LazySection mounts .reveal nodes after first paint.
  };
  window.__fxSweep = sweep;

  if (!window.__fxBound) {
    window.__fxBound = true;
    let ticking = false;
    window.__fxOnScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {ticking = false;sweep();});
    };
    window.addEventListener('scroll', window.__fxOnScroll, { passive: true });
    window.addEventListener('resize', window.__fxOnScroll, { passive: true });
  }
  sweep();
}

function useReveal() {
  useEffect(() => {
    initScrollFX();
  });
}

// ---------- Brand wordmarks (stylized SVGs) ----------
const BrandWordmark = ({ name }) => {
  // Each gets a distinct visual identity
  const props = { fill: 'currentColor' };
  switch (name) {
    case 'Flutter':
      return <svg viewBox="0 0 130 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="20" fontWeight="700" letterSpacing="-0.02em">Flutter</text><circle cx="118" cy="13" r="4" fill="#1ddea6" /></svg>;
    case 'Entain':
      return <svg viewBox="0 0 110 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="22" fontWeight="800" letterSpacing="-0.04em" fontStyle="italic">entain</text></svg>;
    case 'Bet365':
      return <svg viewBox="0 0 120 28" {...props}><rect x="0" y="4" width="22" height="22" rx="3" fill="currentColor" /><text x="6" y="20" fill="var(--concrete-50)" fontFamily="Geist, sans-serif" fontSize="14" fontWeight="800">365</text><text x="30" y="20" fontFamily="Geist, sans-serif" fontSize="18" fontWeight="700" letterSpacing="-0.02em">Bet 365</text></svg>;
    case 'Kindred':
      return <svg viewBox="0 0 110 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="20" fontWeight="600" letterSpacing="0.06em">KINDRED</text></svg>;
    case 'Betsson':
      return <svg viewBox="0 0 110 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="22" fontWeight="800" letterSpacing="-0.03em">Betsson</text></svg>;
    case 'LeoVegas':
      return <svg viewBox="0 0 130 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="20" fontWeight="700" letterSpacing="-0.02em">LeoVegas</text></svg>;
    case 'PaddyPower':
      return <svg viewBox="0 0 144 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="18" fontWeight="700" letterSpacing="-0.02em">Paddy Power</text></svg>;
    case 'WilliamHill':
      return <svg viewBox="0 0 138 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="18" fontWeight="700" letterSpacing="-0.02em">William Hill</text></svg>;
    case 'iGamingBusiness':
      return <svg viewBox="0 0 170 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="16" fontWeight="700" letterSpacing="-0.01em">iGaming Business</text></svg>;
    case 'SiGMA':
      return <svg viewBox="0 0 90 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="22" fontWeight="800" letterSpacing="0.04em">SiGMA</text></svg>;
    case 'NextIO':
      return <svg viewBox="0 0 90 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="20" fontWeight="700" letterSpacing="-0.02em">Next.io</text></svg>;
    case 'EGR':
      return <svg viewBox="0 0 80 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="22" fontWeight="800" letterSpacing="0.02em">EGR</text></svg>;
    case 'GamblingInsider':
      return <svg viewBox="0 0 170 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="16" fontWeight="700" letterSpacing="-0.01em">Gambling Insider</text></svg>;
    default:
      return <svg viewBox="0 0 100 28" {...props}><text x="0" y="20" fontFamily="Geist, sans-serif" fontSize="18" fontWeight="700">{name}</text></svg>;
  }
};
window.BrandWordmark = BrandWordmark;

// ---------- Nav ----------
const NAV_PRODUCTS = [
{ href: '/products/jurnii-ux', title: 'Jurnii UX', desc: 'AI-powered UX audit, commercial outcomes', icon: 'sparkles' },
{ href: '/products/jurnii-360', title: 'Jurnii 360', desc: 'Real-time competitor promotion intelligence', icon: 'radar' },
{ href: '/products/jurnii-mmm', title: 'Jurnii Cortex', desc: 'Marketing mix modelling for iGaming', icon: 'line-chart' }];

const NAV_RESOURCES = [
{ href: '/library?cat=Competitive%20Analysis', title: 'Jurnii vs X', desc: 'Honest comparisons against competitors', icon: 'git-compare' },
{ href: '/library?cat=Playbook', title: 'How-to guides', desc: 'Practical playbooks for operators', icon: 'book-open' },
{ href: '/library?cat=Market%20Intelligence', title: 'Market reports', desc: 'Annual & seasonal intelligence', icon: 'file-text' },
{ href: '/library?cat=Commercial%20Strategy', title: 'Thought leadership', desc: 'Where the market is going', icon: 'lightbulb' },
{ href: '/library?cat=Case%20Study', title: 'Case studies', desc: 'Real outcomes, named operators', icon: 'briefcase' },
{ href: 'https://jurnii.featurebase.app/help', title: 'Help & support', desc: 'Docs, FAQs, and product help center', icon: 'life-buoy', external: true }];


const NAV_FEATURES = [
{ group: 'Competitor', items: [
  { href: '/features/competitor-promotions', title: 'Promotions', icon: 'percent' },
  { href: '/features/competitor-positioning', title: 'Positioning', icon: 'target' },
  { href: '/features/competitor-comparison', title: 'Comparison', icon: 'git-compare' },
  { href: '/features/competitor-analysis', title: 'Analysis', icon: 'search' },
  { href: '/features/competitor-offer-feed', title: 'Offer Feed', icon: 'gift' },
  { href: '/features/competitor-live-feed', title: 'Live Feed', icon: 'radio' },
  { href: '/features/competitor-alerts', title: 'Alerts', icon: 'bell' },
  { href: '/features/competitor-ai-insights', title: 'AI Insights', icon: 'sparkles' }]
},
{ group: 'Brand', items: [
  { href: '/features/brand-meta-scoring', title: 'Meta Scoring', icon: 'gauge' },
  { href: '/features/brand-market-trends', title: 'Market Trends', icon: 'trending-up' },
  { href: '/features/brand-design-themes', title: 'Design Themes', icon: 'palette' },
  { href: '/features/brand-promotion-analysis', title: 'Promotion Analysis', icon: 'bar-chart-3' },
  { href: '/features/brand-performance', title: 'Performance', icon: 'zap' },
  { href: '/features/brand-usability', title: 'Usability', icon: 'mouse-pointer-click' },
  { href: '/features/brand-perception', title: 'Perception', icon: 'eye' },
  { href: '/features/brand-recommendations', title: 'Recommendations', icon: 'lightbulb' }]
}];


const NAV_SOLUTIONS = [
{ group: 'Competition', items: [
  { href: '/solutions/competition-discovery', title: 'Discovery', icon: 'search' },
  { href: '/solutions/competition-offers', title: 'Offers', icon: 'gift' },
  { href: '/solutions/competition-pricing', title: 'Pricing', icon: 'tag' },
  { href: '/solutions/competition-positioning', title: 'Positioning', icon: 'target' }]
},
{ group: 'Benchmarking', items: [
  { href: '/solutions/user-interface-benchmarking', title: 'User Interface', icon: 'layout-panel-left' },
  { href: '/solutions/user-experience-benchmarking', title: 'User Experience', icon: 'mouse-pointer-click' },
  { href: '/solutions/customer-journey-benchmarking', title: 'Customer Journey', icon: 'route' },
  { href: '/solutions/market-positioning-benchmarking', title: 'Market Positioning', icon: 'crosshair' }]
},
{ group: 'Attribution', items: [
  { href: '/solutions/marketing-roi-attribution', title: 'Marketing ROI', icon: 'dollar-sign' },
  { href: '/solutions/cross-channel-attribution', title: 'Cross-Channel', icon: 'shuffle' },
  { href: '/solutions/marketing-mix-modeling-attribution', title: 'Marketing Mix', icon: 'layers' },
  { href: '/solutions/market-growth-attribution', title: 'Market Growth', icon: 'trending-up' }]
},
{ group: 'Optimization', items: [
  { href: '/solutions/conversion-rate-optimization', title: 'Conversion Rate', icon: 'zap' },
  { href: '/solutions/life-time-value-optimization', title: 'Lifetime Value', icon: 'gem' },
  { href: '/solutions/churn-rate-optimization', title: 'Churn Rate', icon: 'trending-down' },
  { href: '/solutions/customer-acquisition-cost-optimization', title: 'Acquisition Cost', icon: 'user-plus' }]
}];



const NAV_USE_CASES = [
{ group: 'Roles', items: [
  { href: '/use-cases/cmo', title: 'CMO', icon: 'megaphone' },
  { href: '/use-cases/coo', title: 'COO', icon: 'settings' },
  { href: '/use-cases/cco', title: 'CCO', icon: 'handshake' }]
},
{ group: 'Company Size', items: [
  { href: '/use-cases/smb', title: 'SMB', icon: 'store' },
  { href: '/use-cases/midmarket', title: 'Mid-Market', icon: 'building' },
  { href: '/use-cases/enterprise', title: 'Enterprise', icon: 'building-2' }]
},
{ group: 'Departments', items: [
  { href: '/use-cases/marketing', title: 'Marketing', icon: 'megaphone' },
  { href: '/use-cases/commercial', title: 'Commercial', icon: 'briefcase' },
  { href: '/use-cases/product', title: 'Product', icon: 'package' }]
},
{ group: 'Sectors', items: [
  { href: '/use-cases/igaming', title: 'iGaming', icon: 'gamepad-2' },
  { href: '/use-cases/ecommerce', title: 'eCommerce', icon: 'shopping-cart' },
  { href: '/use-cases/fintech', title: 'FinTech', icon: 'landmark' }]
}];


const Dropdown = ({ label, items }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  useEffect(() => {window.lucide && window.lucide.createIcons();}, [open]);
  return (
    <div className={`dropdown ${open ? 'open' : ''}`} ref={ref}>
      <button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label}
        <i data-lucide="chevron-down" style={{ width: 12, height: 12 }} />
      </button>
      <div className="dropdown-panel" role="menu">
        {items.map((it) =>
        <a key={it.href} className="dropdown-item" href={it.href} role="menuitem" {...it.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}}>
            <div className="ico"><i data-lucide={it.icon} style={{ width: 16, height: 16 }} /></div>
            <div>
              <b>{it.title}</b>
              <span>{it.desc}</span>
            </div>
          </a>
        )}
      </div>
    </div>);

};

const MegaDropdown = ({ label, groups, viewAllHref, viewAllLabel, twoCol = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  useEffect(() => {window.lucide && window.lucide.createIcons();}, [open]);
  return (
    <div className={`mega-dropdown ${open ? 'open' : ''}`} ref={ref}>
      <button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label}
        <i data-lucide="chevron-down" style={{ width: 12, height: 12 }} />
      </button>
      <div className="mega-panel" role="menu">
        <div className="mega-cols" style={{ gridTemplateColumns: `repeat(${groups.length}, 1fr)` }}>
          {groups.map((g) =>
          <div key={g.group} className="mega-col">
              <div className="mega-col-head">{g.group}</div>
              <div className={twoCol ? 'mega-col-items mega-col-items--2' : 'mega-col-items'}>
                {g.items.map((it) =>
              <a key={it.href} href={it.href} className="mega-item" role="menuitem">
                  <i data-lucide={it.icon} className="mega-item-ico" />
                  <span>{it.title}</span>
                </a>
              )}
              </div>
            </div>
          )}
        </div>
        {viewAllHref &&
        <div className="mega-footer-row">
            <a href={viewAllHref} className="link-arrow">
              {viewAllLabel} <i data-lucide="arrow-right" style={{ width: 12, height: 12 }} className="arrow" />
            </a>
          </div>
        }
      </div>
    </div>);

};

// ---------- Animated brand logo (theme-driven inline SVG) ----------
// Replaces the static light/dark logo images: arrow uses the brand green token,
// sparkles + wordmark use --foreground so they flip automatically across
// light / dark / jurnii-v1. Mark animates in + sparkles twinkle (motion-safe).
const NavLogo = ({ height = 22, className = '' }) =>
<svg className={`nav-logo ${className}`} viewBox="0 0 258 88" height={height} fill="none"
role="img" aria-label="Jurnii" xmlns="http://www.w3.org/2000/svg">
    <path className="logo-arrow" d="M42.2788 52.8445L68.7087 41.0979C70.6628 40.2294 72.6595 42.2261 71.791 44.1802L60.0444 70.6101C59.0201 72.9149 55.5753 72.1839 55.5753 69.6617V59.6488C55.5753 58.3591 54.5298 57.3136 53.2401 57.3136H43.2272C40.705 57.3136 39.974 53.8688 42.2788 52.8445Z" />
    <path className="logo-spark logo-spark-1" d="M45.4314 17.2873C45.8936 15.5709 48.3288 15.5709 48.791 17.2873L50.541 23.7871C50.7022 24.3858 51.1698 24.8534 51.7685 25.0146L58.2683 26.7647C59.9847 27.2268 59.9847 29.6621 58.2683 30.1242L51.7685 31.8743C51.1698 32.0355 50.7022 32.5031 50.541 33.1018L48.791 39.6016C48.3288 41.318 45.8936 41.318 45.4314 39.6016L43.6814 33.1018C43.5202 32.5031 43.0525 32.0355 42.4539 31.8743L35.9541 30.1242C34.2376 29.6621 34.2376 27.2268 35.9541 26.7647L42.4539 25.0146C43.0525 24.8534 43.5202 24.3858 43.6814 23.7871L45.4314 17.2873Z" />
    <path className="logo-spark logo-spark-2" d="M24.0735 40.2987C24.4201 39.0114 26.2465 39.0114 26.5932 40.2987L27.9057 45.1736C28.0266 45.6226 28.3773 45.9733 28.8263 46.0942L33.7012 47.4068C34.9885 47.7534 34.9885 49.5798 33.7012 49.9264L28.8263 51.239C28.3773 51.3598 28.0266 51.7106 27.9057 52.1596L26.5932 57.0344C26.2465 58.3217 24.4201 58.3217 24.0735 57.0344L22.761 52.1596C22.6401 51.7106 22.2893 51.3598 21.8403 51.239L16.9655 49.9264C15.6782 49.5798 15.6782 47.7534 16.9655 47.4068L21.8403 46.0942C22.2893 45.9733 22.6401 45.6226 22.761 45.1736L24.0735 40.2987Z" />
    <g className="logo-word">
      <path d="M234.968 66.1619V32.1991H241.87V66.1619H234.968ZM234.837 27.2834V20.5164H242V27.2834H234.837Z" />
      <path d="M221.736 66.1619V32.1991H228.638V66.1619H221.736ZM221.605 27.2834V20.5164H228.768V27.2834H221.605Z" />
      <path d="M186.999 66.1623V32.1994H193.315L193.575 41.2647L192.729 40.8178C193.119 38.6047 193.857 36.8172 194.942 35.4553C196.028 34.0933 197.352 33.0932 198.914 32.4548C200.477 31.7738 202.17 31.4333 203.993 31.4333C206.598 31.4333 208.747 32.0079 210.439 33.157C212.176 34.2636 213.478 35.7957 214.346 37.7535C215.258 39.6687 215.714 41.8605 215.714 44.329V66.1623H208.812V46.3719C208.812 44.3716 208.595 42.6905 208.16 41.3285C207.726 39.9666 207.01 38.9239 206.012 38.2004C205.013 37.4769 203.711 37.1151 202.105 37.1151C199.674 37.1151 197.699 37.9025 196.18 39.4772C194.66 41.0519 193.901 43.3501 193.901 46.3719V66.1623H186.999Z" />
      <path d="M162.57 66.1616V32.1987H168.886L169.147 41.2002L168.561 41.0086C169.038 37.9443 169.993 35.7099 171.426 34.3054C172.902 32.901 174.877 32.1987 177.351 32.1987H180.672V38.2635H177.351C175.615 38.2635 174.161 38.5402 172.989 39.0934C171.816 39.6467 170.927 40.4979 170.319 41.647C169.755 42.7962 169.472 44.2858 169.472 46.1158V66.1616H162.57Z" />
      <path d="M139.358 66.9276C135.886 66.9276 133.107 65.7998 131.024 63.5441C128.983 61.2459 127.963 58.0752 127.963 54.032V32.1987H134.865V52.3083C134.865 55.3726 135.408 57.6283 136.493 59.0753C137.579 60.5224 139.228 61.2459 141.442 61.2459C143.96 61.2459 145.913 60.4585 147.302 58.8838C148.735 57.2665 149.451 55.0109 149.451 52.1168V32.1987H156.353V66.1616H149.907L149.776 57.2878L150.753 57.6709C150.145 60.65 148.865 62.9483 146.911 64.5656C144.958 66.1403 142.44 66.9276 139.358 66.9276Z" />
      <path d="M106.199 67.183C103.116 67.183 100.403 66.502 98.0593 65.1401C95.7587 63.7356 93.9789 61.8204 92.72 59.3945C91.4611 56.926 90.81 54.0958 90.7666 50.9038L97.9291 50.5208C97.9725 53.9256 98.7105 56.5004 100.143 58.2454C101.575 59.9904 103.594 60.8628 106.199 60.8628C108.933 60.8628 111.017 59.9478 112.449 58.1177C113.925 56.2876 114.663 53.6489 114.663 50.2016V20.8352H121.696V50.2016C121.696 53.6489 121.044 56.6494 119.742 59.203C118.483 61.7566 116.704 63.7356 114.403 65.1401C112.102 66.502 109.367 67.183 106.199 67.183Z" />
    </g>
  </svg>;

window.NavLogo = NavLogo;

const Nav = ({ active = '' }) => {
  const [theme, setTheme] = useState(getStoredTheme());
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    window.lucide && window.lucide.createIcons();
    // After Lucide swaps sun ↔ moon, re-kick the flip on the active toggle.
    const btn = document.querySelector('.theme-toggle.is-flipping');
    if (!btn || prefersReducedMotion()) return;
    const icon = btn.querySelector('i, svg');
    if (!icon) return;
    icon.style.animation = 'none';
    void icon.offsetWidth;
    icon.style.animation = '';
  }, [mobileOpen, theme]);
  const cycleTheme = (e) => {
    const order = ['light', 'jurnii-v1'];
    const idx = order.indexOf(theme);
    const next = order[idx === -1 ? 0 : (idx + 1) % order.length];
    const btn = e && e.currentTarget;
    if (btn && btn.classList) {
      btn.classList.remove('is-flipping');
      // Restart CSS animation if the user clicks again mid-spin.
      void btn.offsetWidth;
      btn.classList.add('is-flipping');
      const clear = () => btn.classList.remove('is-flipping');
      btn.addEventListener('animationend', clear, { once: true });
    }
    transitionTheme(next, e);
    setTheme(next);
  };
  const themeIcon = theme === 'light' ? 'sun' : 'moon';
  const isActive = (key) => active === key ? 'is-active' : '';
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="nav-brand" href="/" aria-label="Jurnii home">
          <NavLogo height={28} />
        </a>
        <nav className="nav-links" aria-label="Primary">
          <Dropdown label="Products" items={NAV_PRODUCTS} />
          <MegaDropdown label="Features" groups={NAV_FEATURES} viewAllHref="/features" viewAllLabel="View all features" twoCol />
          <MegaDropdown label="Solutions" groups={NAV_SOLUTIONS} viewAllHref="/solutions" viewAllLabel="View all solutions" />
          <MegaDropdown label="Use Cases" groups={NAV_USE_CASES} viewAllHref="/use-cases" viewAllLabel="View all use cases" />
          <Dropdown label="Resources" items={NAV_RESOURCES} />
          <a href="/contact-us" className={isActive('contact')}>Contact</a>
        </nav>
        <div className="nav-cta">
          <button className="icon-btn theme-toggle desktop-only" onClick={cycleTheme} aria-label="Cycle theme" title={`Theme: ${theme}`}>
            <i data-lucide={themeIcon} style={{ width: 16, height: 16 }} />
          </button>
          <a href="https://app.jurnii.io" className="btn ghost sm desktop-only">Log in</a>
          <a href="/contact-us" className="btn primary sm">Book a demo</a>
          <button className="icon-btn nav-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <i data-lucide="menu" style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>
      <div className={`nav-mobile-overlay ${mobileOpen ? 'open' : ''}`} role="dialog" aria-modal="true">
        <div className="nav-mobile-head">
          <NavLogo height={28} />
          <button className="icon-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <i data-lucide="x" style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div className="nav-mobile-list">
          <div className="nav-mobile-group-head">Products</div>
          {NAV_PRODUCTS.map((p) => <a key={p.href} href={p.href}>{p.title}</a>)}
          <div className="nav-mobile-group-head" style={{ marginTop: 16 }}>Features</div>
          {NAV_FEATURES.flatMap((g) => g.items).map((it) => <a key={it.href} href={it.href}>{it.title}</a>)}
          <a href="/features" className="nav-mobile-viewall">View all features →</a>
          <div className="nav-mobile-group-head" style={{ marginTop: 16 }}>Solutions</div>
          {NAV_SOLUTIONS.flatMap((g) => g.items).map((it) => <a key={it.href} href={it.href}>{it.title}</a>)}
          <a href="/solutions" className="nav-mobile-viewall">View all solutions →</a>
          <div className="nav-mobile-group-head" style={{ marginTop: 16 }}>Use Cases</div>
          {NAV_USE_CASES.flatMap((g) => g.items).map((it) => <a key={it.href} href={it.href}>{it.title}</a>)}
          <a href="/use-cases" className="nav-mobile-viewall">View all use cases →</a>
          <div className="nav-mobile-group-head" style={{ marginTop: 16 }}>Resources</div>
          {NAV_RESOURCES.map((r) => <a key={r.href} href={r.href} {...r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}}>{r.title}</a>)}
          <a href="/contact-us" style={{ marginTop: 16 }}>Contact</a>
        </div>
        <div className="nav-mobile-foot">
          <button className="btn ghost theme-toggle" onClick={cycleTheme}>
            <i data-lucide={themeIcon} style={{ width: 14, height: 14 }} /> Theme: {theme}
          </button>
          <a href="/contact-us" className="btn accent">Book a demo</a>
        </div>
      </div>
    </header>);

};
window.Nav = Nav;

// ---------- DemoCTA ----------
const DemoCTA = ({ heading, sub }) =>
<section className="demo-cta">
    <div className="container demo-cta-inner">
      <h2>{heading || 'See what your competitors are doing — before they do it to you.'}</h2>
      <p>{sub || 'A 45-minute demo, with sample intelligence for your real competitor set. No boilerplate deck, no sales pressure.'}</p>
      <div className="actions">
        <a className="btn accent lg" href="/contact-us">Book a demo <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" /></a>
        <a className="btn ghost-on-dark lg" href="/library">Read the research</a>
      </div>
      <div className="demo-cta-sub">
        <div><b>45 min</b> Zoom or in-person</div>
        <div><b>Sample data</b> for your competitor set</div>
        <div><b>No obligation</b> — straight talk</div>
      </div>
    </div>
  </section>;

window.DemoCTA = DemoCTA;

// ---------- Footer ----------
const Footer = () =>
<footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div className="footer-brand">
          <img src="assets/jurnii-dark-full.svg" alt="Jurnii" />
          <p>Commercial intelligence for iGaming operators. Replace manual research with structured, near-real-time signal.</p>
          <div className="footer-social" style={{ marginTop: 18 }}>
            <a href="https://www.linkedin.com/company/jurnii-ltd" target="_blank" rel="noopener" aria-label="LinkedIn"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" /></svg></a>
            <a href="#" aria-label="Email"><i data-lucide="mail" style={{ width: 14, height: 14 }} /></a>
          </div>
        </div>
        <div className="footer-cols">
          <div>
            <div className="footer-head">Products</div>
            <a href="/products/jurnii-ux">Jurnii UX</a>
            <a href="/products/jurnii-360">Jurnii 360</a>
            <a href="/products/jurnii-mmm">Jurnii Cortex</a>
          </div>
          <div>
            <div className="footer-head">Features</div>
            <a href="/features/competitor-promotions">Promotions</a>
            <a href="/features/competitor-alerts">Alerts</a>
            <a href="/features/brand-usability">Usability</a>
            <a href="/features">All features →</a>
          </div>
          <div>
            <div className="footer-head">Solutions</div>
            <a href="/solutions/user-experience-benchmarking">UX Benchmarking</a>
            <a href="/solutions/competition-offers">Competitor Offers</a>
            <a href="/solutions/conversion-rate-optimization">Conversion Rate</a>
            <a href="/solutions">All solutions →</a>
          </div>
          <div>
            <div className="footer-head">Use Cases</div>
            <a href="/use-cases/cmo">CMO</a>
            <a href="/use-cases/marketing">Marketing</a>
            <a href="/use-cases/igaming">iGaming</a>
            <a href="/use-cases">All use cases →</a>
          </div>
          <div>
            <div className="footer-head">Resources</div>
            <a href="/library?cat=Playbook">Guides</a>
            <a href="/library?cat=Market%20Intelligence">Reports</a>
            <a href="/library?cat=Commercial%20Strategy">Thought leadership</a>
            <a href="/library?cat=Case%20Study">Case studies</a>
          </div>
          <div>
            <div className="footer-head">Company</div>
            <a href="/contact-us">Contact</a>
            <a href="https://www.linkedin.com/company/jurnii-ltd/jobs" target="_blank" rel="noopener noreferrer">Careers</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
      </div>
      <div className="footer-foot">
        <span>© 2026 Jurnii Ltd. — London, UK. All rights reserved.</span>
        <span>hello@jurnii.io</span>
      </div>
    </div>
  </footer>;

window.Footer = Footer;

// ---------- Sticky mobile CTA ----------
const StickyDemoCTA = () =>
<a href="/contact-us" className="sticky-demo-cta">
    <div className="label">
      Book a demo
      <span>45 min · Zoom or in-person</span>
    </div>
    <span className="btn accent sm">Get started <i data-lucide="arrow-right" style={{ width: 12, height: 12 }} /></span>
  </a>;

window.StickyDemoCTA = StickyDemoCTA;

// ---------- Tweaks panel (theme + hero variant) ----------
const ThemeTweaks = () => {
  const [active, setActive] = useState(false);
  const [theme, setTheme] = useState(getStoredTheme());
  const [variant, setVariant] = useState(() => {
    try {return localStorage.getItem(HERO_VAR_KEY) || 'stack';} catch {return 'stack';}
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
  useEffect(() => {window.lucide && window.lucide.createIcons();}, [active, theme, variant]);
  // Apply hero variant
  useEffect(() => {
    document.querySelectorAll('.hero[data-variant]').forEach((el) => el.setAttribute('data-variant', variant));
    try {localStorage.setItem(HERO_VAR_KEY, variant);} catch {}
  }, [variant]);
  if (!active) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200, background: 'var(--popover)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: '0 16px 48px -12px rgba(0,0,0,0.2)', width: 280 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <b style={{ fontSize: 13, fontWeight: 600 }}>Tweaks</b>
        <button onClick={() => {setActive(false);window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');}} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--muted-foreground)' }} aria-label="Close"><i data-lucide="x" style={{ width: 14, height: 14 }} /></button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 8 }}>Theme</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {['light', 'dark', 'jurnii-v1'].map((t) =>
          <button key={t} onClick={(e) => {transitionTheme(t, e);setTheme(t);}} className="filter-pill" style={{ padding: '8px', fontSize: 12, background: theme === t ? 'var(--concrete-950)' : 'var(--card)', color: theme === t ? 'var(--concrete-50)' : 'var(--foreground)' }}>
              {t === 'jurnii-v1' ? 'v1 teal' : t}
            </button>
          )}
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 8 }}>Hero visual</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {[
          { v: 'stack', l: 'Stack' },
          { v: 'dashboard', l: 'Dashboard' },
          { v: 'orbit', l: 'Orbit' },
          { v: 'ticker', l: 'Ticker' }].
          map((o) =>
          <button key={o.v} onClick={() => setVariant(o.v)} className="filter-pill" style={{ padding: '8px', fontSize: 12, background: variant === o.v ? 'var(--concrete-950)' : 'var(--card)', color: variant === o.v ? 'var(--concrete-50)' : 'var(--foreground)' }}>
              {o.l}
            </button>
          )}
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '12px 0 0', lineHeight: 1.5 }}>Hero variant only shows on the homepage.</p>
      </div>
    </div>);

};
window.ThemeTweaks = ThemeTweaks;

// ---------- Lazy section (CLS-safe below-fold mount) ----------
/** Load a stylesheet once; resolves when loaded (or immediately if already present). */
function loadStylesheet(href) {
  if (!href) return Promise.resolve();
  const existing = document.querySelector(`link[data-lazy-href="${href}"], link[href="${href}"]`);
  if (existing) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-lazy-href', href);
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}
window.loadStylesheet = loadStylesheet;

/**
 * Renders a fixed-height placeholder until the section nears the viewport,
 * then mounts children. Optionally injects stylesheets first.
 * Pass `importFn` for Vite React.lazy code-splitting (CLS-safe Suspense fallback).
 * Never use for nav / hero / LCP text.
 */
const LazySection = ({ minHeight = 320, children, className = '', stylesheets, rootMargin = '280px 0px', importFn }) => {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const LazyChild = React.useMemo(
    () => (typeof importFn === 'function' ? React.lazy(importFn) : null),
    [importFn]
  );
  // Stabilize stylesheet list — inline arrays in JSX are new every render and
  // would re-run the effect, cancelling in-flight activate() forever.
  const sheetKey = Array.isArray(stylesheets)
    ? stylesheets.join('|')
    : (stylesheets || '');

  useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(() => {
      if (typeof window.__fxSweep === 'function') window.__fxSweep();
      else document.querySelectorAll('.reveal:not(.in-view)').forEach((el) => el.classList.add('in-view'));
    });
    return () => cancelAnimationFrame(id);
  }, [ready]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    let activated = false;
    let io = null;
    let timer = 0;

    const activate = () => {
      if (cancelled || activated) return;
      activated = true;
      if (io) { io.disconnect(); io = null; }
      if (timer) { window.clearTimeout(timer); timer = 0; }
      window.removeEventListener('scroll', activate);
      window.removeEventListener('resize', activate);

      const sheets = sheetKey ? sheetKey.split('|') : [];
      Promise.all(sheets.map(loadStylesheet)).then(() => {
        if (!cancelled) setReady(true);
      });
    };

    const marginPx = parseInt(String(rootMargin).split(/\s+/)[0], 10) || 280;
    const alreadyNear = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      return rect.top < vh + marginPx && rect.bottom > -marginPx;
    };

    if (!('IntersectionObserver' in window) || alreadyNear()) {
      activate();
    } else {
      io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) activate();
      }, { rootMargin });
      io.observe(el);
      window.addEventListener('scroll', activate, { once: true, passive: true });
      window.addEventListener('resize', activate, { once: true, passive: true });
      timer = window.setTimeout(activate, 1500);
    }

    return () => {
      cancelled = true;
      if (io) io.disconnect();
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('scroll', activate);
      window.removeEventListener('resize', activate);
    };
  }, [sheetKey, rootMargin]);

  let body = null;
  if (ready) {
    if (LazyChild) {
      body = (
        <React.Suspense fallback={<div className="lazy-section-ph" style={{ minHeight }} aria-hidden="true" />}>
          <LazyChild />
        </React.Suspense>
      );
    } else {
      body = children;
    }
  } else {
    body = <div className="lazy-section-ph" aria-hidden="true" />;
  }

  return (
    <div
      ref={ref}
      className={'lazy-section' + (ready ? ' is-ready' : '') + (className ? ' ' + className : '')}
      style={ready ? undefined : { minHeight }}
      aria-busy={!ready}
    >
      {body}
    </div>
  );
};
window.LazySection = LazySection;

// ---------- Page chrome wrapper ----------
const PageChrome = ({ active, children }) => {
  useReveal();
  useEffect(() => {
    window.lucide && window.lucide.createIcons();
    // Restore hero variant
    try {
      const v = localStorage.getItem(HERO_VAR_KEY) || 'stack';
      document.querySelectorAll('.hero[data-variant]').forEach((el) => el.setAttribute('data-variant', v));
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
    </React.Fragment>);

};
window.PageChrome = PageChrome;

// ---------- Demo Modal ----------
(function () {
  let modalEl = null;

  // Ensure the shared vanilla booking wizard is available, then run cb.
  function ensureBooking(cb) {
    if (window.JurniiBooking) { cb(); return; }
    let s = document.querySelector('script[data-jurnii-booking]');
    if (!s) {
      s = document.createElement('script');
      s.src = 'assets/booking-form.js';
      s.setAttribute('data-jurnii-booking', '1');
      document.body.appendChild(s);
    }
    s.addEventListener('load', cb);
  }

  function buildModal() {
    const el = document.createElement('div');
    el.id = 'demo-modal';
    el.innerHTML = [
    '<div class="demo-modal-backdrop"></div>',
    '<div class="demo-modal-dialog" role="dialog" aria-modal="true" aria-label="Book a demo">',
    '<div class="demo-modal-head">',
    '<div class="demo-modal-title">',
    '<b>Book a demo</b>',
    '<span>3 quick steps &middot; a specialist confirms your slot</span>',
    '</div>',
    '<button class="demo-modal-close" aria-label="Close"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>',
    '</div>',
    '<div class="demo-modal-body is-form" style="padding:24px 28px 28px"><div class="container-narrow" id="demo-modal-mount" style="padding:0"></div></div>',
    '</div>'].
    join('');
    document.body.appendChild(el);
    el.querySelector('.demo-modal-backdrop').addEventListener('click', closeModal);
    el.querySelector('.demo-modal-close').addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) {if (e.key === 'Escape') closeModal();});
    ensureBooking(function () {
      window.JurniiBooking.render(el.querySelector('#demo-modal-mount'), { onClose: closeModal });
    });
    return el;
  }

  function openModal() {
    if (!modalEl) modalEl = buildModal();
    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    document.body.style.overflow = '';
  }

  window.openDemoModal = openModal;

  document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (!link) return;
    const txt = link.textContent.trim();
    if (txt.startsWith('Book a demo') && link.getAttribute('href') === '/contact-us') {
      e.preventDefault();
      openModal();
    }
  });
})();