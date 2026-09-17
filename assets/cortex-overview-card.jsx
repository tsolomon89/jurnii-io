// Cortex Overview Card — homepage mock of Cortex, sourced from the one-pager
// "Marketing Overview" window until a live product UI exists.
// Exported to window so other babel scripts (home-sections.jsx) can use it.
(function () {
  const { useRef, useState, useEffect } = React;

  const CX_STATS = [
    { label: 'Channels live', value: 12, note: 'All tracked' },
    { label: 'Budget pacing', value: 94, suffix: '%', note: 'On track' },
    { label: 'Causal lift', value: 18, prefix: '+', suffix: '%', note: 'vs baseline', accent: true }
  ];

  const CX_GANTT = [
    { name: 'Sponsorships', start: 2, span: 68 },
    { name: 'Affiliates', start: 22, span: 48 },
    { name: 'Paid Media', start: 2, span: 76 },
    { name: 'Creators', start: 32, span: 38 },
    { name: 'ATL / OOH', start: 46, span: 40 }
  ];

  const CX_PILLS = [
    { name: 'AI Assistant', on: true },
    { name: 'Snapshot', on: true },
    { name: 'Finance', on: true },
    { name: 'Causal Impact', on: false },
    { name: 'Scenario', on: false },
    { name: 'Testing', on: false }
  ];

  function useCountUp(target, run, dur) {
    const [v, setV] = useState(0);
    useEffect(() => {
      if (!run) return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setV(target);
        return;
      }
      let raf;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        setV(Math.round(target * e));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [run, target, dur]);
    return v;
  }

  const StatCell = ({ stat, run, delay }) => {
    const n = useCountUp(stat.value, run, 900 + delay);
    const value = (stat.prefix || '') + n + (stat.suffix || '');
    return (
      <div className={'cx-stat' + (stat.accent ? ' is-accent' : '')}>
        <span className="cx-stat-lbl">{stat.label}</span>
        <span className="cx-stat-n">{value}</span>
        <span className="cx-stat-note">{stat.note}</span>
      </div>
    );
  };

  const CortexOverviewCard = () => {
    const ref = useRef(null);
    const [run, setRun] = useState(false);

    useEffect(() => {
      const root = ref.current;
      if (!root) return;

      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const gsap = window.gsap;

      if (!gsap || reduce) {
        root.classList.add('is-in');
        setRun(true);
        return;
      }

      const q = (sel) => Array.from(root.querySelectorAll(sel));
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from(root, { autoAlpha: 0, y: 18, scale: 0.985, duration: 0.5 }).
        from(q('.cx-chrome'), { autoAlpha: 0, y: -8, duration: 0.35 }, '-=0.28').
        from(q('.cx-stat'), { autoAlpha: 0, y: 10, duration: 0.35, stagger: 0.07 }, '-=0.18').
        from(q('.cx-gantt'), { autoAlpha: 0, y: 12, duration: 0.4 }, '-=0.18').
        from(q('.cx-pill'), { autoAlpha: 0, y: 8, duration: 0.28, stagger: 0.04 }, '-=0.18').
        add(() => {
          root.classList.add('is-in');
          setRun(true);
        });
      }, root);

      return () => ctx.revert();
    }, []);

    return (
      <div className="cx-card" ref={ref} role="img" aria-label="Cortex marketing overview">
        <div className="cx-chrome">
          <span className="cx-dots" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="cx-title">Cortex — Marketing Overview</span>
        </div>

        <div className="cx-body">
          <div className="cx-stats">
            {CX_STATS.map((s, i) => <StatCell key={s.label} stat={s} run={run} delay={i * 80} />)}
          </div>

          <div className="cx-gantt">
            {CX_GANTT.map((row) =>
            <div className="cx-gantt-row" key={row.name}>
                <span className="cx-gantt-name">{row.name}</span>
                <span className="cx-gantt-track">
                  <span
                className="cx-gantt-fill"
                style={{ '--cx-start': row.start + '%', '--cx-span': row.span + '%' }} />

                </span>
              </div>
            )}
          </div>

          <div className="cx-pills">
            {CX_PILLS.map((p) =>
            <span key={p.name} className={'cx-pill' + (p.on ? ' is-on' : '')}>{p.name}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  window.CortexOverviewCard = CortexOverviewCard;
})();
