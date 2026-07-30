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
      { name: 'Cortex', why: 'iGaming-native MMM with bonus mechanics, regulatory shocks, and competitor pressure modelled as first-class inputs — not lumped into the residual.' },
    ],
    proof: { stat: '23%', label: 'Avg promo-waste reduction (Tier 1, year one)' },
  },
  {
    slug: 'ecommerce',
    name: 'eCommerce',
    tag: 'High-velocity vertical',
    icon: 'shopping-bag',
    accent: 'accent-ux',
    lede: 'Online retail is the original promotion-led category. Daily price changes, voucher mechanics, paid-search saturation, and a competitor set that updates by the hour — our intelligence stack adapts cleanly to the pace and the stakes.',
    fitFor: ['DTC brands competing on paid search, paid social, and email.', 'Multi-category online retailers tracking 20+ rival assortments and promotions.', 'Marketplaces and aggregators monitoring third-party seller pricing dynamics.'],
    products: [
      { name: 'Jurnii 360', why: 'Daily structured capture of competitor pricing, voucher mechanics, and promotional cadence — straight into your warehouse.' },
      { name: 'Jurnii UX', why: 'Benchmark PDP, basket, checkout, and account journeys against your top peers across mobile and desktop, every quarter.' },
      { name: 'Cortex', why: 'Media mix modelling tuned for retail — paid search, paid social, affiliate, retail media, and promo intensity as first-class inputs.' },
    ],
    proof: { stat: '+14%', label: 'Avg paid-media efficiency lift, year one' },
  },
  {
    slug: 'fmcg',
    name: 'FMCG',
    tag: 'Brand-led vertical',
    icon: 'package',
    accent: 'accent-mmm',
    lede: 'FMCG is the home of media mix modelling — and the category where competitive pressure plays out across retail shelves, paid media, and brand equity simultaneously. Our framework slots into existing analytics stacks without re-inventing what already works.',
    fitFor: ['Global brand owners with multi-market portfolios.', 'Category teams running quarterly innovation, promotion, and pricing cycles.', 'Insight and analytics functions integrating MMM with retailer data.'],
    products: [
      { name: 'Cortex', why: 'MMM with brand equity, distribution, price elasticity, and competitor share-of-voice as first-class inputs — calibrated quarterly, not annually.' },
      { name: 'Jurnii 360', why: 'Competitor pricing, promotion, and pack-format tracking across the retailers that matter to your category.' },
      { name: 'Jurnii UX', why: 'D2C and brand-owned journey benchmarking against category leaders — subscription, sampling, and direct-purchase flows.' },
    ],
    proof: { stat: '+9%', label: 'Avg incremental ROI uplift across modelled channels' },
  },
  {
    slug: 'telco',
    name: 'Telco',
    tag: 'Subscription vertical',
    icon: 'signal',
    accent: 'accent-360',
    lede: 'Telco is a long-cycle, contract-driven category fighting for share in a saturated market. The questions — bundle competitiveness, churn pressure, regulator-mandated pricing transparency — map directly onto our intelligence stack.',
    fitFor: ['Mobile, broadband, and converged operators tracking 5–10 rival propositions daily.', 'Consumer divisions of multi-product telco groups (mobile, fixed, TV, enterprise).', 'MVNOs and challenger brands competing on plan flexibility and price.'],
    products: [
      { name: 'Jurnii 360', why: 'Daily structured capture of competitor plans, bundles, handset offers, and switching incentives across your market.' },
      { name: 'Jurnii UX', why: 'Sign-up, plan-change, and self-service journey benchmarking against incumbents and challengers — app and web, every quarter.' },
      { name: 'Cortex', why: 'Long-cycle media mix modelling with churn pressure, handset cycles, and regulator-driven price events as exogenous inputs.' },
    ],
    proof: { stat: '−18%', label: 'Avg cost-per-net-add across modelled channels' },
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
        <a href="/contact-us" className="btn ghost">Talk to us about {ind.name.split(' ')[0]} <i data-lucide="arrow-right" style={{width:14,height:14}} className="arrow"/></a>
      </footer>
    </article>
  );
};
window.IndustryCard = IndustryCard;
