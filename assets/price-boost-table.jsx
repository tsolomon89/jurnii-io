// Jurnii 360 — "snapshot of the data" component.
//   PriceBoostTable  : the cut-off card itself (showcased in the component library)
//   PriceBoostTeaser : the marketing section that wraps the table with a heading
const { useRef: pbUseRef, useEffect: pbUseEffect } = React;

// Generic monogram tiles — NOT logo recreations. Operator names are the
// competitive-intelligence point of the product; the tiles are original chips.
const PB_ROWS = [
  { op: 'William Hill', m: 'WH', bg: '#0A1A3A', fg: 'var(--white)', sport: 'Football',     event: 'Premier League',          market: 'Acca Boost',              date: '29/09/2025' },
  { op: 'Bet365',       m: 'B',  bg: '#16713F', fg: 'var(--white)', sport: 'Football',     event: 'Premier League',          market: 'Bet Boost',               date: '29/09/2025' },
  { op: 'Ladbrokes',    m: 'L',  bg: '#D81F26', fg: 'var(--white)', sport: 'Football',     event: 'Premier League',          market: 'Turbo Boost',             date: '29/09/2025' },
  { op: 'SkyBet',       m: 'SB', bg: '#102A43', fg: 'var(--white)', sport: 'Football',     event: 'UEFA Champions Leag\u2026', market: 'Price Boost',             date: '29/09/2025' },
  { op: 'Coral',        m: 'C',  bg: '#155AB0', fg: 'var(--white)', sport: 'Football',     event: 'UEFA Champions Leag\u2026', market: 'Bet Builder + Boost\u2026', date: '29/09/2025' },
  { op: 'William Hill', m: 'WH', bg: '#0A1A3A', fg: 'var(--white)', sport: 'Football',     event: 'La Liga',                 market: 'Odds Booster \u2013 Foo\u2026', date: '29/09/2025' },
  { op: 'Bet365',       m: 'B',  bg: '#16713F', fg: 'var(--white)', sport: 'Football',     event: 'Ligue 1',                 market: 'Boost your Acca wit\u2026', date: '29/09/2025' },
  { op: 'Ladbrokes',    m: 'L',  bg: '#D81F26', fg: 'var(--white)', sport: 'Horse Racing', event: 'Cheltenham Festival',     market: 'Bet Builder Boost',       date: '29/09/2025' },
  { op: 'SkyBet',       m: 'SB', bg: '#102A43', fg: 'var(--white)', sport: 'Horse Racing', event: 'Cheltenham Festival',     market: 'Price Boost',             date: '29/09/2025' },
  { op: 'Coral',        m: 'C',  bg: '#155AB0', fg: 'var(--white)', sport: 'Tennis',       event: 'ATP',                     market: 'Get a 25% Winning\u2026', date: '29/09/2025' },
  { op: 'Bet365',       m: 'B',  bg: '#16713F', fg: 'var(--white)', sport: 'Tennis',       event: 'WTA Tour',                market: 'Acca Insurance',          date: '29/09/2025' },
  { op: 'William Hill', m: 'WH', bg: '#0A1A3A', fg: 'var(--white)', sport: 'Basketball',   event: 'NBA',                     market: 'Points Boost',           date: '29/09/2025' },
];

const PbSortIco = () => <i data-lucide="arrow-up-down" className="pbt-sort" />;

// The cut-off snapshot card. Rows cascade in as it scrolls into view.
const PriceBoostTable = () => {
  const ref = pbUseRef(null);

  pbUseEffect(() => {
    window.lucide && window.lucide.createIcons();
    const root = ref.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll('.pbt-row'));
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { rows.forEach((r) => r.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.35, rootMargin: '0px 0px -6% 0px' });
    rows.forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, []);

  return (
    <div className="pbt-frame" ref={ref}>
      <div className="pbt-card">
        <div className="pbt-card-head">
          <span className="pbt-title-ico"><i data-lucide="arrow-up-from-line" style={{ width: 22, height: 22 }} /></span>
          <div className="pbt-title-text">
            <h3>Latest Price Boost Promotions</h3>
            <p>The latest price boost promotions across the market's sports</p>
          </div>
        </div>

        <div className="pbt-search" aria-hidden="true">
          <i data-lucide="search" style={{ width: 17, height: 17 }} />
          <span>Search boosts</span>
        </div>

        <div className="pbt-table-wrap">
          <table className="pbt-table">
            <thead>
              <tr>
                <th className="pbt-th-op"><span>Operator</span><PbSortIco /></th>
                <th className="pbt-th-sort"><span>Sport</span><PbSortIco /></th>
                <th>Event</th>
                <th>Market</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {PB_ROWS.map((r, i) => (
                <tr key={i} className="pbt-row" style={{ transitionDelay: `${Math.min(i, 9) * 65}ms` }}>
                  <td>
                    <div className="pbt-op">
                      <span className="pbt-mono" style={{ background: r.bg, color: r.fg }}>{r.m}</span>
                      <span className="pbt-op-name">{r.op}</span>
                    </div>
                  </td>
                  <td>{r.sport}</td>
                  <td>{r.event}</td>
                  <td>{r.market}</td>
                  <td className="pbt-date">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pbt-fade">
        <a className="pbt-more" href="contact-us.html">
          <span className="pbt-more-count">840+</span> more promotions tracked today
        </a>
      </div>
    </div>
  );
};
window.PriceBoostTable = PriceBoostTable;

// Marketing-page section: heading + lede + the snapshot card.
const PriceBoostTeaser = () => (
  <section className="section reveal pbt-section">
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot" />Live capture</p>
        <h2 className="h2-section">A snapshot of what we capture, <span style={{ color: 'var(--muted-foreground)' }}>every day</span>.</h2>
        <p className="section-lede">Every price boost, free bet, and reload offer — structured the moment it goes live. Below is a fraction of a single day's capture across the competitor set.</p>
      </div>
      <PriceBoostTable />
    </div>
  </section>
);
window.PriceBoostTeaser = PriceBoostTeaser;
