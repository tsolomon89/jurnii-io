import React, { useState, useEffect, useRef } from 'react';
// Jurnii 360 — "Promotions by Vertical" dashboard panel.
// Animated donut (draws in), animated competitor progress bars, count-up numbers,
// working Sports/Casino + Show Banner Offers toggles, and scroll-triggered reveals.

  const { useState, useEffect, useRef } = React;

  const REDUCE = typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function useInViewPV(ref) {
    const [seen, setSeen] = useState(false);
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      if (!('IntersectionObserver' in window)) { setSeen(true); return; }
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
      io.observe(el);
      return () => io.disconnect();
    }, []);
    return seen;
  }

  // count-up that restarts whenever target OR cycle changes
  function useCountUpPV(target, run, cycle, dur = 1000) {
    const [v, setV] = useState(0);
    useEffect(() => {
      if (!run) { setV(0); return; }
      if (REDUCE) { setV(target); return; }
      let raf; const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        setV(Math.round(target * e));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [run, target, cycle]);
    return v;
  }

  const SEG_COLORS = ['var(--jurnii-700)', 'var(--jurnii-500)', 'var(--jurnii-400)', 'var(--jurnii-300)', 'var(--jurnii-200)'];

  const TrendIco = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  );

  /* ---------------- Data ---------------- */
  const DATA = {
    Sports: {
      centerNum: 5, centerLabel: 'Sports',
      segments: [
        { label: 'Football', val: 42 },
        { label: 'Horse Racing', val: 24 },
        { label: 'Tennis', val: 16 },
        { label: 'Basketball', val: 11 },
        { label: 'Golf', val: 7 },
      ],
      donutFoot: ['Football dominates', '+8% vs last month'],
      eventsTitle: 'Top Targeted Events',
      eventsSub: 'Events with most promotions',
      events: [
        { name: 'Manchester United vs Liverpool', league: 'Premier League', n: 7 },
        { name: 'Everton vs Manchester City', league: 'Premier League', n: 6 },
        { name: 'Nottingham Forest vs Chelsea', league: 'Premier League', n: 5 },
        { name: 'West Ham vs Arsenal', league: 'Premier League', n: 5 },
        { name: 'Brighton vs Tottenham', league: 'Premier League', n: 4 },
        { name: 'Newcastle vs Aston Villa', league: 'Premier League', n: 4 },
      ],
      eventsFoot: ['Premier League Football ', 'dominates the market'],
      brands: [
        { name: 'William Hill', m: 'WH', bg: '#0A1A3A', fg: 'var(--white)', base: 9, banner: 5, delta: 5 },
        { name: 'Midnite', m: 'M', bg: '#111111', fg: '#C7FF44', base: 2, banner: 1, delta: 1 },
        { name: 'Ladbrokes', m: 'L', bg: '#D81F26', fg: 'var(--white)', base: 2, banner: 1, delta: 1 },
        { name: 'SkyBet', m: 'SB', bg: '#102A43', fg: 'var(--white)', base: 1, banner: 1, delta: 2 },
      ],
      brandFoot: ['William Hill ', '+14% # of promotions vs the market'],
    },
    Casino: {
      centerNum: 5, centerLabel: 'Categories',
      segments: [
        { label: 'Slots', val: 48 },
        { label: 'Live Casino', val: 22 },
        { label: 'Table Games', val: 14 },
        { label: 'Jackpots', val: 10 },
        { label: 'Bingo', val: 6 },
      ],
      donutFoot: ['Slots dominate', '+6% vs last month'],
      eventsTitle: 'Top Promoted Games',
      eventsSub: 'Games with most promotions',
      events: [
        { name: 'Starburst', league: 'Slots', n: 9 },
        { name: 'Sweet Bonanza', league: 'Slots', n: 7 },
        { name: 'Lightning Roulette', league: 'Live Casino', n: 6 },
        { name: 'Mega Moolah', league: 'Jackpots', n: 5 },
        { name: "Gonzo's Quest", league: 'Slots', n: 4 },
        { name: 'Blackjack VIP', league: 'Table Games', n: 3 },
      ],
      eventsFoot: ['Slots ', 'dominate the casino market'],
      brands: [
        { name: 'Bet365', m: 'B', bg: '#16713F', fg: 'var(--white)', base: 8, banner: 4, delta: 4 },
        { name: 'PokerStars', m: 'PS', bg: '#111111', fg: '#4CA0FF', base: 3, banner: 2, delta: 2 },
        { name: '888casino', m: '8', bg: '#E4002B', fg: 'var(--white)', base: 3, banner: 1, delta: 1 },
        { name: 'LeoVegas', m: 'LV', bg: '#F58220', fg: '#1A1A1A', base: 2, banner: 1, delta: 1 },
      ],
      brandFoot: ['Bet365 ', '+11% # of promotions vs the market'],
    },
  };

  /* ---------------- Donut ---------------- */
  const Donut = ({ segments, centerNum, centerLabel, play, cycle }) => {
    const R = 78, SW = 22, cx = 100, cy = 100;
    const C = 2 * Math.PI * R;
    const total = segments.reduce((s, x) => s + x.val, 0) || 1;
    const num = useCountUpPV(centerNum, play, cycle, 700);
    let acc = 0;
    return (
      <div className="pv-donut">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          {segments.map((s, i) => {
            const f = s.val / total;
            const arc = f * C;
            const dash = Math.max(arc - 3, 0); // 3px gap between segments
            const rot = -90 + acc * 360;
            acc += f;
            return (
              <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                stroke={SEG_COLORS[i % SEG_COLORS.length]} strokeWidth={SW} strokeLinecap="butt"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={play ? 0 : dash}
                transform={`rotate(${rot} ${cx} ${cy})`}
                style={{ transition: REDUCE ? 'none' : `stroke-dashoffset .9s cubic-bezier(.22,1,.36,1) ${0.1 + i * 0.11}s` }} />
            );
          })}
        </svg>
        <div className="pv-donut-center">
          <div className="pv-donut-num">{num}</div>
          <div className="pv-donut-lbl">{centerLabel}</div>
        </div>
      </div>
    );
  };

  /* ---------------- Brand row ---------------- */
  const BrandRow = ({ b, total, max, play, cycle, index }) => {
    const n = useCountUpPV(total, play, cycle, 900);
    const pct = max ? Math.round((total / max) * 100) : 0;
    return (
      <div className="pv-brand" style={{ transitionDelay: (0.12 + index * 0.08) + 's' }}>
        <div className="pv-brand-top">
          <span className="pv-logo" style={{ background: b.bg, color: b.fg }}>{b.m}</span>
          <span className="pv-brand-name">{b.name}</span>
          <span className="pv-brand-n">{n}</span>
          <span className="pv-trend"><TrendIco />+{b.delta}</span>
        </div>
        <div className="pv-bar">
          <div className="pv-bar-fill" style={{
            width: play ? pct + '%' : '0%',
            transitionDelay: (0.18 + index * 0.08) + 's',
          }} />
        </div>
      </div>
    );
  };

  /* ---------------- Panel ---------------- */
  const PromotionsByVertical = () => {
    const ref = useRef(null);
    const inView = useInViewPV(ref);
    const [vertical, setVertical] = useState('Sports');
    const [banner, setBanner] = useState(true);
    const [cycle, setCycle] = useState(0);
    const [play, setPlay] = useState(false);

    // (re)run the draw-in whenever it enters view or the data set changes
    useEffect(() => {
      if (!inView) { setPlay(false); return; }
      if (REDUCE) { setPlay(true); return; }
      setPlay(false);
      let raf2;
      const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setPlay(true)); });
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    }, [inView, cycle]);

    const d = DATA[vertical];
    const bump = () => setCycle(c => c + 1);
    const pickVertical = (v) => { if (v !== vertical) { setVertical(v); bump(); } };
    const toggleBanner = () => { setBanner(b => !b); bump(); };

    const totals = d.brands.map(b => b.base + (banner ? b.banner : 0));
    const max = Math.max(...totals, 1);

    return (
      <div className={'pv-panel' + (inView ? ' is-in' : '')} ref={ref}>
        {/* header */}
        <div className="pv-head">
          <div>
            <div className="pv-head-title">Promotions by Vertical</div>
            <div className="pv-head-sub">The latest promotions across sports betting and casino verticals</div>
          </div>
          <div className="pv-head-ctrl">
            <label className="pv-switchwrap">
              <button className={'pv-switch' + (banner ? ' on' : '')} onClick={toggleBanner}
                role="switch" aria-checked={banner} aria-label="Show banner offers" />
              Show Banner Offers
            </label>
            <div className="pv-seg" role="group" aria-label="Vertical">
              {['Sports', 'Casino'].map(v => (
                <button key={v} className={'pv-seg-btn' + (vertical === v ? ' on' : '')}
                  onClick={() => pickVertical(v)} aria-pressed={vertical === v}>{v}</button>
              ))}
            </div>
          </div>
        </div>

        {/* three columns */}
        <div className="pv-grid">
          {/* 1 — donut */}
          <div className="pv-sub" style={{ transitionDelay: '0s' }}>
            <div className="pv-sub-title">{vertical === 'Sports' ? 'Promo Type by Sport' : 'Promo Type by Category'}</div>
            <div className="pv-sub-sub">Last 30 days</div>
            <div className="pv-sub-div" />
            <div className="pv-sub-body">
              <Donut segments={d.segments} centerNum={d.centerNum} centerLabel={d.centerLabel} play={play} cycle={cycle} />
              <div className="pv-legend">
                {d.segments.map((s, i) => (
                  <div key={s.label} className="pv-leg">
                    <span className="pv-leg-sw" style={{ background: SEG_COLORS[i % SEG_COLORS.length] }} />
                    <span className="pv-leg-name">{s.label}</span>
                    <span className="pv-leg-val">{s.val}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pv-foot">{d.donutFoot[0]} <span className="g">{d.donutFoot[1]}</span></div>
          </div>

          {/* 2 — events */}
          <div className="pv-sub" style={{ transitionDelay: '0.09s' }}>
            <div className="pv-sub-title">{d.eventsTitle}</div>
            <div className="pv-sub-sub">{d.eventsSub}</div>
            <div className="pv-sub-div" />
            <div className="pv-sub-body" style={{ display: 'flex' }}>
              <div className="pv-events">
                <div className="pv-events-scroll">
                  {d.events.map((e, i) => (
                    <div key={vertical + e.name} className="pv-event" style={{ transitionDelay: (0.12 + i * 0.06) + 's' }}>
                      <div className="pv-event-name">{e.name}</div>
                      <div className="pv-event-meta">
                        <span>{e.league}</span>
                        <span className="pv-event-n">{e.n} Promotions</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pv-events-fade" />
              </div>
            </div>
            <div className="pv-foot"><span className="g">{d.eventsFoot[0]}</span>{d.eventsFoot[1]}</div>
          </div>

          {/* 3 — brand activity */}
          <div className="pv-sub" style={{ transitionDelay: '0.18s' }}>
            <div className="pv-sub-title">Brand Activity</div>
            <div className="pv-sub-sub">Promotions by competitor</div>
            <div className="pv-sub-div" />
            <div className="pv-sub-body">
              <div className="pv-brands">
                {d.brands.map((b, i) => (
                  <BrandRow key={vertical + b.name} b={b} total={totals[i]} max={max} play={play} cycle={cycle} index={i} />
                ))}
              </div>
            </div>
            <div className="pv-foot">{d.brandFoot[0]}<span className="g">{d.brandFoot[1]}</span></div>
          </div>
        </div>
      </div>
    );
  };

  export { PromotionsByVertical };
