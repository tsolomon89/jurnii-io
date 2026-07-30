// Resources data + filterable hub + FAQ + Pricing + About sections
const { useState: rS, useEffect: rE, useMemo: rM } = React;

const RESOURCES = [
// Comparisons (4)
{ slug: 'jurnii-vs-ekimetrics', cat: 'comparison', title: 'Jurnii vs Ekimetrics: Which MMM is built for iGaming?', summary: 'Ekimetrics is a serious MMM consultancy. Here\'s where the model fits — and where the iGaming gap opens.', readTime: '7 min read', date: 'Apr 2026', featured: true },
{ slug: 'jurnii-vs-nielsen', cat: 'comparison', title: 'Jurnii vs Nielsen MMM: what iGaming operators need to know', summary: 'Nielsen is the FMCG gold standard. The variables that move iGaming aren\'t in the model.', readTime: '6 min read', date: 'Apr 2026', featured: false },
{ slug: 'jurnii-vs-ux-agencies', cat: 'comparison', title: 'Jurnii UX vs traditional UX agencies: speed, depth, and commercial weight', summary: 'Agencies do qualitative work brilliantly. They don\'t scale, and they don\'t carry NGR weight.', readTime: '5 min read', date: 'Mar 2026', featured: true },
{ slug: 'jurnii-vs-manual-tracking', cat: 'comparison', title: 'Jurnii 360 vs manual competitor tracking: the real cost', summary: 'Two analysts, three spreadsheets, and a quarterly report. We costed it. The number is bigger than you think.', readTime: '5 min read', date: 'Mar 2026', featured: false },
// Guides (3)
{ slug: 'how-to-build-promo-intelligence-framework', cat: 'guide', title: 'How to build a competitor promotion intelligence framework', summary: 'A practical seven-step framework, with the data points and review cadence we\'d use ourselves.', readTime: '9 min read', date: 'Apr 2026', featured: true },
{ slug: 'how-to-run-ux-audit-igaming', cat: 'guide', title: 'How to run a UX audit for your sportsbook or casino', summary: 'The five journeys to score, the friction points to look for, and how to weight findings by NGR impact.', readTime: '8 min read', date: 'Mar 2026', featured: false },
{ slug: 'mmm-data-readiness-igaming', cat: 'guide', title: 'Is your data ready for MMM? A self-assessment for iGaming operators', summary: 'A 12-point checklist. Most operators fail two or three before contracts are signed — here\'s how to fix them first.', readTime: '7 min read', date: 'Feb 2026', featured: false },
// Reports (2)
{ slug: 'cheltenham-2026-promotional-intelligence', cat: 'report', title: 'Cheltenham 2026: Promotional Intelligence Report', summary: '850+ promotions tracked across 20+ operators. Who blinked first, who held the line, and what it cost.', readTime: '14 min read', date: 'Apr 2026', featured: true },
{ slug: 'igaming-intelligence-trends-2026', cat: 'report', title: 'iGaming Intelligence Trends: 2026 Outlook', summary: 'Where the smart operators are putting commercial intelligence budget — and where they\'re cutting back.', readTime: '11 min read', date: 'Jan 2026', featured: false },
// Thought leadership (2)
{ slug: 'experience-is-the-new-battleground', cat: 'thought', title: 'Experience is the new battleground: why UX is now a commercial priority', summary: 'Promo arms races have a ceiling. The operators winning the 2026 cohort are competing on experience.', readTime: '6 min read', date: 'Mar 2026', featured: true },
{ slug: 'ai-igaming-proprietary-intelligence', cat: 'thought', title: 'AI in iGaming: why proprietary intelligence separates leaders from followers', summary: 'Generic LLMs aren\'t the moat. Proprietary, structured competitive data is.', readTime: '5 min read', date: 'Feb 2026', featured: false },
// Case studies (1)
{ slug: 'tier-1-operator-promo-waste-reduction', cat: 'casestudy', title: 'How a Tier 1 European operator reduced promo waste by 23% in Q1', summary: 'Inside the first 90 days: scoping, calibration, and the three reload offers we recommended cutting.', readTime: '6 min read', date: 'Apr 2026', featured: true }];

window.RESOURCES = RESOURCES;

const CAT_LABEL = {
  comparison: 'Comparison',
  guide: 'Guide',
  report: 'Report',
  thought: 'Thought leadership',
  casestudy: 'Case study'
};
window.CAT_LABEL = CAT_LABEL;

const FILTER_OPTS = [
{ id: 'all', label: 'All' },
{ id: 'comparison', label: 'Jurnii vs X' },
{ id: 'guide', label: 'How-to guides' },
{ id: 'report', label: 'Market reports' },
{ id: 'thought', label: 'Thought leadership' },
{ id: 'casestudy', label: 'Case studies' }];


const ResourceCard = ({ r }) =>
<a className="resource-card" href={`/library/${r.slug}`}>
    <span className={`badge cat-${r.cat}`}>{CAT_LABEL[r.cat]}</span>
    <h3>{r.title}</h3>
    <p>{r.summary}</p>
    <div className="meta">
      <span>{r.readTime} · {r.date}</span>
      <span className="read-arrow">Read <i data-lucide="arrow-right" style={{ width: 12, height: 12 }} /></span>
    </div>
  </a>;

window.ResourceCard = ResourceCard;

const ResourcesHub = ({ featuredOnly = false, initialCat = 'all' }) => {
  const [cat, setCat] = rS(initialCat);
  rE(() => {window.lucide && window.lucide.createIcons();}, [cat]);
  rE(() => {
    // Honor ?cat= query string when on /resources
    if (!featuredOnly) {
      const p = new URLSearchParams(window.location.search).get('cat');
      if (p && FILTER_OPTS.find((f) => f.id === p)) setCat(p);
    }
  }, []);
  const list = rM(() => {
    let r = RESOURCES;
    if (featuredOnly) r = r.filter((x) => x.featured);
    if (cat !== 'all') r = r.filter((x) => x.cat === cat);
    return r;
  }, [cat, featuredOnly]);
  return (
    <section className="section reveal" id="resources">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" />Resources</p>
          <h2 className="h2-section">{featuredOnly ? <>Field notes from<br />the intelligence frontline.</> : 'Every report, guide, and comparison.'}</h2>
          <p className="section-lede">Comparisons against the alternatives, practical playbooks, and seasonal market reports — written for commercial leadership, not procurement.</p>
        </div>
        {!featuredOnly &&
        <div className="resources-filters">
            {FILTER_OPTS.map((f) =>
          <button key={f.id} className={`filter-pill ${cat === f.id ? 'is-active' : ''}`} onClick={() => setCat(f.id)}>{f.label}</button>
          )}
          </div>
        }
        <div className="resources-grid">
          {list.map((r) => <ResourceCard key={r.slug} r={r} />)}
        </div>
        {featuredOnly &&
        <div style={{ marginTop: 32, textAlign: 'center' }}>
            <a className="btn ghost" href="/library">See all resources <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" /></a>
          </div>
        }
      </div>
    </section>);

};
window.ResourcesHub = ResourcesHub;

// ---------- Pricing ----------
const PLANS = [
{ name: 'Starter', sub: '5 brands', price: '£53,760', period: '/year · 1× daily analysis', note: 'Best for single-market operators with up to 5 brands.', cta: 'Book a demo', ctaVariant: 'ghost', featured: false, features: ['5 competitor brands monitored', 'Daily promotion capture & analysis', 'Change detection alerts', 'Promotion richness index', 'Historical database access', 'Dashboard + API access'] },
{ name: 'Growth', sub: '10 brands', price: '£96,768', period: '/year · 1× daily analysis', note: 'Best for multi-brand operators needing full market coverage.', cta: 'Book a demo', ctaVariant: 'accent', featured: true, features: ['10 competitor brands monitored', 'Daily promotion capture & analysis', 'Real-time Slack / email alerts', 'Segmentation & targeting analysis', 'Historical database access', 'Dashboard + API access', 'Quarterly strategy review call'] },
{ name: 'Enterprise', sub: '20 brands', price: '£174,182', period: '/year · 1× daily analysis', note: 'For Tier 1 multi-jurisdiction operators.', cta: 'Get a custom quote', ctaVariant: 'ghost', featured: false, features: ['20 competitor brands monitored', 'Up to 4× daily analysis available', 'All Growth features included', 'Custom segmentation rules', 'Integration with your BI / data warehouse', 'Dedicated account manager', 'Feeds into Cortex at no extra data cost'] }];


const PricingSection = ({ heading, sub, withFooter = true }) =>
<section className="section reveal" id="pricing">
    <div className="container">
      <div className="section-head centered">
        <p className="eyebrow"><span className="dot" />Pricing</p>
        <h2 className="h2-section">{heading || 'Indicative pricing for Jurnii 360.'}</h2>
        <p className="section-lede">{sub || 'Jurnii UX and MMM are scoped individually. Final 360 pricing varies by market, frequency, and analysis depth.'}</p>
      </div>
      <div className="pricing-grid">
        {PLANS.map((p) =>
      <div key={p.name} className={`plan ${p.featured ? 'featured' : ''}`}>
            {p.featured && <span className="plan-tag">Most popular</span>}
            <h3>{p.name} — {p.sub}</h3>
            <div>
              <div className="plan-price">{p.price}</div>
              <div className="plan-period">{p.period}</div>
            </div>
            <p className="plan-note">{p.note}</p>
            <ul className="plan-feat">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <a href="/contact-us" className={`btn ${p.ctaVariant} lg`} style={{ justifyContent: 'center' }}>{p.cta}</a>
          </div>
      )}
      </div>
      {withFooter && <p className="plan-foot-note">Pricing shown is indicative. Final scope varies by market, frequency, and analysis depth. Jurnii UX and MMM are quoted separately.</p>}
    </div>
  </section>;

window.PricingSection = PricingSection;

// ---------- FAQ ----------
const FAQS = [
{ q: 'How long does it take to get started with Jurnii 360?', a: 'Setup typically takes 5–10 business days. We configure the competitor set, define the market scope, and run a calibration period before going live. Most clients see their first meaningful insight within the first week of live tracking.' },
{ q: 'What data do you need from us for Cortex?', a: 'A clean 24-month history of spend by channel and campaign, plus KPI data (FTDs, deposits, NGR) at a compatible granularity — typically daily or weekly. We run a data-readiness assessment in the scoping call to identify any gaps before contracts are signed.' },
{ q: 'Is Jurnii compliant with GDPR and gaming regulations?', a: 'Yes. Jurnii operates only with publicly available competitor data for Jurnii 360 and anonymised, aggregated commercial data for MMM. We have DPAs in place with all enterprise clients. We don\'t handle player-level PII directly.' },
{ q: 'How is Jurnii different from building this capability in-house?', a: 'Building in-house requires data engineers, ML modellers, and ongoing maintenance. Most operators underestimate the total cost by 3–5×, and the first model is typically deployed 12–18 months after the decision to build. Jurnii delivers value in weeks, not years, and the model compounds every quarter.' },
{ q: 'Can Jurnii 360 integrate with our existing BI stack?', a: 'Yes. We expose a full REST API and support direct exports to Snowflake, BigQuery, Databricks, and most common BI tools. Enterprise clients can have 360 intelligence land directly in their warehouse on a scheduled basis.' },
{ q: 'Do you work with suppliers and B2B partners, not just operators?', a: 'Yes. Platform providers, CRM suppliers, and AI tooling partners use Jurnii to embed intelligence into their client proposition. We have a partnership programme — contact us to discuss.' }];


const FAQSection = () => {
  const [open, setOpen] = rS(0);
  rE(() => {window.lucide && window.lucide.createIcons();}, []);
  return (
    <section className="section reveal" id="faq">
      <div className="container">
        <div className="section-head centered">
          <p className="eyebrow"><span className="dot" />FAQ</p>
          <h2 className="h2-section">Questions operators ask<br />in the first call.</h2>
        </div>
        <div className="faq-list">
          {FAQS.map((f, i) =>
          <div key={i} className={`faq-item ${open === i ? 'is-open' : ''}`}>
              <button className="faq-trigger" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                <span>{f.q}</span>
                <span className="icon"><i data-lucide="plus" style={{ width: 12, height: 12 }} /></span>
              </button>
              <div className="faq-body"><div className="faq-body-inner">{f.a}</div></div>
            </div>
          )}
        </div>
      </div>
    </section>);

};
window.FAQSection = FAQSection;

// ---------- About section (homepage variant) ----------
const TEAM = [
{ name: 'Fraser Dunk', role: 'CEO & Founder', bio: '20 years in iGaming commercial strategy. Previously CCO at a Tier 1 European operator.', initials: 'FD', acc: 1, wide: true },
{ name: 'Mitch Vidler', role: 'Chief Commercial Officer', bio: 'Former Head of Data Science, sportsbook major. Owns the modelling layer.', initials: 'MV', acc: 3 },
{ name: 'Tristan Dexter', role: 'Chief Experience Officer', bio: '16+ Years in iGaming, from Tier 1 Operators, to B2B and Affiliation, covering Design & Product leadership roles.', initials: 'TD', acc: 2 }];

window.TEAM = TEAM;

const AboutSection = ({ short = true }) =>
<section className="section reveal" id="about">
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot" />About</p>
        <h2 className="h2-section">Built by operators, for operators.</h2>
      </div>
      <div className="about-grid">
        <div className="about-narrative">
          <p><strong>Jurnii was built because the intelligence gap in iGaming was obvious — and the existing solutions were stuck in the past.</strong> Manual audits, quarterly reports, expensive research studies: useful information locked behind processes that couldn't scale.</p>
          <p>Our goal was simple: make it possible to see, at scale and in near-real-time, what's actually happening in the market — and turn that into actionable commercial intelligence that product, trading, CRM, and marketing teams can actually use.</p>
          {!short && <p>We're not a digital agency. We're not a generic analytics tool. We're the intelligence layer operators build on to compete in commoditised markets.</p>}
          <div className="about-values">
            <div className="about-value"><span className="num">01</span><div><b>Objectivity</b><span>Replace opinion with structured benchmarking.</span></div></div>
            <div className="about-value"><span className="num">02</span><div><b>Speed as leverage</b><span>Launch at 85%, not 50%. Iterate weekly with live data.</span></div></div>
            <div className="about-value"><span className="num">03</span><div><b>Continuous intelligence</b><span>Snapshots into always-on advantage.</span></div></div>
          </div>
        </div>
        <div>
          <div className="team-grid">
            {TEAM.map((t) =>
          <div key={t.name} className={`team-card acc-${t.acc}${t.wide ? ' team-card--wide' : ''}`}>
                <div className="team-avatar">{t.initials}</div>
                <div>
                  <b>{t.name}</b>
                  <span className="role">{t.role}</span>
                </div>
                <p>{t.bio}</p>
              </div>
          )}
          </div>
        </div>
      </div>
    </div>
  </section>;

window.AboutSection = AboutSection;