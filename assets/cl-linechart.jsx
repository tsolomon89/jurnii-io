// Jurnii Score Trend — multi-line chart (shadcn-chart style), 5 series over 6 months.
// One brand line (rising) + 4 competitors (mixed trends). Theme-aware + draws in on view.

(function () {
  const { useState, useEffect, useRef } = React;

  function useInViewLC(ref) {
    const [seen, setSeen] = useState(false);
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      if (!('IntersectionObserver' in window)) { setSeen(true); return; }
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.25 });
      io.observe(el);
      return () => io.disconnect();
    }, []);
    return seen;
  }

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June'];

  // Jurnii Score (0–100). Brand rises steadily; competitors mixed.
  const SERIES = [
    { key: 'brand', label: 'Your Brand',     color: 'var(--ch-brand)', emphasis: true,  data: [54, 58, 61, 66, 72, 78] },
    { key: 'c1',    label: 'Competitor A',    color: 'var(--ch-c1)',    emphasis: false, data: [72, 69, 67, 63, 59, 55] }, // steady decline
    { key: 'c2',    label: 'Competitor B',    color: 'var(--ch-c2)',    emphasis: false, data: [61, 65, 60, 64, 62, 67] }, // fluctuating up
    { key: 'c3',    label: 'Competitor C',    color: 'var(--ch-c3)',    emphasis: false, data: [48, 51, 50, 54, 57, 59] }, // gradual rise
    { key: 'c4',    label: 'Competitor D',    color: 'var(--ch-c4)',    emphasis: false, data: [70, 66, 71, 64, 60, 57] }, // volatile decline
  ];

  // Chart geometry
  const W = 720, H = 300;
  const M = { top: 18, right: 18, bottom: 30, left: 34 };
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const Y_MIN = 40, Y_MAX = 85;
  const Y_TICKS = [40, 50, 60, 70, 80];

  const xAt = (i) => M.left + (i / (MONTHS.length - 1)) * innerW;
  const yAt = (v) => M.top + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * innerH;

  // Catmull-Rom -> cubic Bézier (monotone-ish smooth curve)
  function smoothPath(pts) {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }

  const seriesPaths = SERIES.map(s => ({
    ...s,
    points: s.data.map((v, i) => ({ x: xAt(i), y: yAt(v) })),
  }));
  seriesPaths.forEach(s => { s.d = smoothPath(s.points); });

  const JurniiLineChart = () => {
    const ref = useRef(null);
    const run = useInViewLC(ref);
    const pathRefs = useRef([]);
    const [lens, setLens] = useState(null);
    const [hover, setHover] = useState(null); // month index
    const reduce = typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    useEffect(() => {
      setLens(pathRefs.current.map(p => (p ? p.getTotalLength() : 0)));
    }, []);

    const onMove = (e) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const vbX = ratio * W;
      let i = Math.round(((vbX - M.left) / innerW) * (MONTHS.length - 1));
      i = Math.max(0, Math.min(MONTHS.length - 1, i));
      setHover(i);
    };

    const ready = lens !== null;
    const showAnim = run && ready && !reduce;

    return (
      <div className="ch-card" ref={ref}>
        <div className="ch-head">
          <div className="ch-title">Jurnii Score Trend</div>
          <div className="ch-desc">January – June 2026 · 100-point scale</div>
        </div>

        <div className="ch-plot">
          <svg viewBox={`0 0 ${W} ${H}`} className="ch-svg"
               onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            {/* horizontal gridlines */}
            {Y_TICKS.map(t => (
              <line key={t} className="ch-grid" x1={M.left} x2={W - M.right} y1={yAt(t)} y2={yAt(t)} />
            ))}
            {/* y tick labels */}
            {Y_TICKS.map(t => (
              <text key={'yl' + t} className="ch-axis-text" x={M.left - 10} y={yAt(t) + 4} textAnchor="end">{t}</text>
            ))}
            {/* x tick labels */}
            {MONTHS.map((m, i) => (
              <text key={m} className="ch-axis-text" x={xAt(i)} y={H - 10} textAnchor="middle">{m.slice(0, 3)}</text>
            ))}

            {/* hover cursor */}
            {hover !== null && (
              <line className="ch-cursor" x1={xAt(hover)} x2={xAt(hover)} y1={M.top} y2={H - M.bottom} />
            )}

            {/* lines */}
            {seriesPaths.map((s, idx) => {
              const len = ready ? lens[idx] : 0;
              const dash = len || 1;
              const off = showAnim ? 0 : (run && reduce ? 0 : dash);
              return (
                <path
                  key={s.key}
                  ref={el => (pathRefs.current[idx] = el)}
                  className="ch-line"
                  d={s.d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.emphasis ? 3 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={ready ? (s.emphasis ? 1 : 0.92) : 0}
                  style={ready ? {
                    strokeDasharray: dash,
                    strokeDashoffset: off,
                    transition: reduce ? 'none' : `stroke-dashoffset 1.15s cubic-bezier(0.22,1,0.36,1) ${idx * 0.1}s`,
                  } : undefined}
                />
              );
            })}

            {/* per-month markers (a point on every line for each month) */}
            <g style={{ opacity: run ? 1 : 0, transition: reduce ? 'none' : 'opacity 0.45s ease 0.85s' }}>
              {seriesPaths.map(s => s.points.map((p, i) => (
                <circle key={s.key + '-m' + i} className="ch-dot"
                        cx={p.x} cy={p.y} r={s.emphasis ? 4.5 : 3.6}
                        fill="var(--card)" stroke={s.color} strokeWidth={s.emphasis ? 2.6 : 2} />
              )))}
            </g>

            {/* hover dots */}
            {hover !== null && seriesPaths.map(s => (
              <circle key={'d' + s.key} className="ch-dot" cx={xAt(hover)} cy={yAt(s.data[hover])} r={s.emphasis ? 5 : 4}
                      fill="var(--card)" stroke={s.color} strokeWidth={s.emphasis ? 3 : 2.5} />
            ))}
          </svg>

          {/* tooltip */}
          {hover !== null && (
            <div className="ch-tip" style={{
              left: (xAt(hover) / W) * 100 + '%',
              top: 0,
              transform: `translate(${hover > MONTHS.length / 2 ? 'calc(-100% - 14px)' : '14px'}, 6px)`,
            }}>
              <div className="ch-tip-month">{MONTHS[hover]}</div>
              {seriesPaths
                .map(s => ({ s, v: s.data[hover] }))
                .sort((a, b) => b.v - a.v)
                .map(({ s, v }) => (
                  <div key={s.key} className="ch-tip-row">
                    <span className="ch-tip-dot" style={{ background: s.color }} />
                    <span className="ch-tip-label">{s.label}</span>
                    <span className="ch-tip-val">{v}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* legend */}
        <div className="ch-legend">
          {SERIES.map(s => (
            <div key={s.key} className={'ch-leg-item' + (s.emphasis ? ' is-brand' : '')}>
              <span className="ch-leg-swatch" style={{ background: s.color }} />
              {s.label}
            </div>
          ))}
        </div>

        {/* footer */}
        <div className="ch-foot">
          <div className="ch-foot-main">
            Your Brand up 24 points over 6 months
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <div className="ch-foot-sub">Jurnii Score vs. 4 tracked competitors · platform recommendations applied</div>
        </div>
      </div>
    );
  };

  window.JurniiLineChart = JurniiLineChart;
})();
