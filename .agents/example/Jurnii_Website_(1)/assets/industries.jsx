// Industries page sections
const { useEffect: indE } = React;

const INDUSTRIES = [
  {
    slug: 'igaming',
    name: 'iGaming & sports betting',
    tag: 'Our home market',
    icon: 'dice-5',
    accent: 'accent-360',
    lede: 'Jurnii was built here. Every product was scoped against the daily reality of running an iGaming P&L — bonus mechanics, sporting calendars, regulatory shocks, and competitor pressure are first-class inputs in everything we ship.',
    fitFor: ['Tier 1 and Tier 2 operators across UK, EU, LatAm, and regulated US states.', 'Multi-vertical groups (sportsbook + casino + poker) needing a unified intelligence layer.', 'Aggregators and platform providers serving operator clients.'],
    products: [
      { name: 'Jurnii 360', why: 'Daily competitor promotion capture across 20+ operators, with bonus-mechanic schema, sporting-calendar awareness, and direct API into your warehouse.' },
      { name: 'Jurnii UX', why: '60+ criteria per journey, scored against your top-5 peers across iOS, Android, mobile web, and desktop. Quarterly re-scoring.' },
      { name: 'Jurnii MMM', why: 'iGaming-native MMM with bonus mechanics, regulatory shocks, and competitor pressure modelled as first-class inputs — not lumped into the residual.' },
    ],
    proof: { stat: '23%', label: 'Avg promo-waste reduction (Tier 1, year one)' },
  },
  {
    slug: 'lottery',
    name: 'Lottery & instant-win',
    tag: 'Adjacent vertical',
    icon: 'ticket',
    accent: 'accent-ux',
    lede: 'State and private lotteries face the same competitive pressure as betting operators — but with longer planning cycles, regulator-mandated transparency, and a player base that overlaps significantly with iGaming. Our intelligence layer adapts cleanly.',
    fitFor: ['National and state lottery operators digitising their offer.', 'Instant-win and scratch-card brands competing with iGaming for share of wallet.', 'Lottery aggregators and resellers in regulated markets.'],
    products: [
      { name: 'Jurnii 360', why: 'Track competing iGaming offers in your jurisdiction — the operators players actually compare you to, not just other lotteries.' },
      { name: 'Jurnii UX', why: 'Benchmark sign-up, deposit, and play-online journeys against the operators capturing your would-be customers.' },
      { name: 'Jurnii MMM', why: 'Long-cycle media planning across TV, sponsorship, and digital, with regulatory and event-calendar inputs built in.' },
    ],
    proof: { stat: '+8.4pp', label: 'Sign-up→FTD lift after first audit (lottery deployment)' },
  },
  {
    slug: 'social-casino',
    name: 'Social casino & sweepstakes',
    tag: 'Adjacent vertical',
    icon: 'spade',
    accent: 'accent-mmm',
    lede: 'Social casino and sweepstakes brands compete on the same UX, the same media inventory, and the same player attention — but with a different monetisation engine. Our products work, with the obvious modifications to the modelling layer.',
    fitFor: ['Top-50 social casino brands building real-money credibility.', 'US sweepstakes operators navigating state-by-state regulation.', 'Hybrid brands operating both real-money and free-to-play offerings.'],
    products: [
      { name: 'Jurnii 360', why: 'Competitor offer tracking covering both social and real-money operators in overlapping markets.' },
      { name: 'Jurnii UX', why: 'Same 60+ criteria framework, applied to coin-package purchase, daily-bonus, and onboarding journeys.' },
      { name: 'Jurnii MMM', why: 'Modelling tuned for IAP-driven revenue with seasonal sporting and entertainment-event inputs.' },
    ],
    proof: { stat: '4.2×', label: 'Faster competitor reaction time vs manual tracking' },
  },
  {
    slug: 'fantasy-dfs',
    name: 'Daily fantasy & pick\'em',
    tag: 'Adjacent vertical',
    icon: 'trophy',
    accent: 'accent-360',
    lede: 'DFS and pick\'em operators sit between sportsbooks and entertainment platforms. The competitive set, the marketing rhythm, and the regulatory backdrop all shift quarter to quarter — and our intelligence layer keeps pace.',
    fitFor: ['Daily fantasy operators in regulated US and Canadian states.', 'Pick\'em product builders navigating the regulatory grey zones.', 'Sportsbook operators with adjacent fantasy products needing competitive read.'],
    products: [
      { name: 'Jurnii 360', why: 'Track entry-fee promotions, deposit-match offers, and contest-mix changes across the DFS competitive set, daily.' },
      { name: 'Jurnii UX', why: 'Benchmark contest-entry, lineup-build, and withdrawal journeys against both DFS-native and sportsbook-adjacent peers.' },
      { name: 'Jurnii MMM', why: 'Sport-by-sport seasonality (NFL, NBA, MLB, college football) decomposed as first-class inputs — not absorbed into noise.' },
    ],
    proof: { stat: '11%', label: 'Avg NGR uplift (year one MMM deployment)' },
  },
];
window.INDUSTRIES = INDUSTRIES;

const IndustryCard = ({ ind }) => {
  indE(() => { window.lucide && window.lucide.createIcons(); }, []);
  return (
    <article className={`industry-card reveal ${ind.accent || ''}`}>
      <header className="industry-card-head">
        <div className="industry-icon"><i data-lucide={ind.icon} style={{width:22,height:22}}/></div>
        <div>
          <p className="industry-tag">{ind.tag}</p>
          <h3>{ind.name}</h3>
        </div>
      </header>
      <p className="industry-lede">{ind.lede}</p>

      <div className="industry-section">
        <h4>Built for</h4>
        <ul className="industry-list">
          {ind.fitFor.map((f,i) => <li key={i}>{f}</li>)}
        </ul>
      </div>

      <div className="industry-section">
        <h4>Which Jurnii products fit</h4>
        <div className="industry-products">
          {ind.products.map((p,i) => (
            <div key={i} className="industry-product">
              <b>{p.name}</b>
              <p>{p.why}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="industry-footer">
        <div className="industry-proof">
          <div className="industry-proof-stat">{ind.proof.stat}</div>
          <div className="industry-proof-label">{ind.proof.label}</div>
        </div>
        <a href="contact.html" className="btn ghost">Talk to us about {ind.name.split(' ')[0]} <i data-lucide="arrow-right" style={{width:14,height:14}} className="arrow"/></a>
      </footer>
    </article>
  );
};
window.IndustryCard = IndustryCard;
