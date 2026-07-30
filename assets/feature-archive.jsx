// ============================================================
// Features ARCHIVE + CATEGORY templates.
//   <FeatureArchive />               → /features/index.html (blog-style)
//   <FeatureCategory catKey=".."/>   → parent page for one category
// ============================================================

const featLeafHref = (slug) => `/features/${slug}`;

// A single solution card used on both index + category pages.
const FeatureEntryCard = ({ slug }) => {
  const d = window.FEATURE_DATA[slug];
  return (
    <a href={featLeafHref(slug)} className="uc-entry-card">
      <div className="uc-entry-ico"><i data-lucide={d.icon} style={{ width: 22, height: 22 }} /></div>
      <p className="uc-entry-tag">{d.kicker}</p>
      <h3>{d.cardTitle}</h3>
      <p>{d.cardSummary}</p>
      <span className="uc-entry-more">Explore feature <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" /></span>
    </a>
  );
};

// ---------- Archive index (grouped by category) ----------
const FeatureArchive = () => {
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });
  const cats = window.FEATURE_CATS;
  const order = ['competitor', 'competitor-feed', 'brand', 'brand-performance'];
  return (
    <React.Fragment>
      <section className="uc-archive-hero">
        <div className="container">
          <p className="eyebrow"><span className="dot" />Features</p>
          <h1>The granular toolset behind the intelligence.</h1>
          <p className="lede">Sixteen granular features powering Jurnii's three intelligence layers — competitor parsing, real-time feeds, brand scoring, and performance auditing. Browse by toolset to see exactly what each capability does.</p>
        </div>
      </section>

      {order.map((key) => {
        const c = cats[key];
        return (
          <section className="uc-cat-block reveal" key={key} data-screen-label={c.label}>
            <div className="container">
              <div className="uc-cat-head">
                <div className="uc-cat-head-left">
                  <div className="uc-cat-head-ico"><i data-lucide={c.icon} style={{ width: 22, height: 22 }} /></div>
                  <div>
                    <h2>{c.label}</h2>
                    <p>{c.tagline}</p>
                  </div>
                </div>
                <a href={c.href} className="uc-cat-viewall">View all {c.label.toLowerCase()} <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" /></a>
              </div>
              <div className="uc-card-grid">
                {c.children.map((slug) => <FeatureEntryCard key={slug} slug={slug} />)}
              </div>
            </div>
          </section>
        );
      })}
    </React.Fragment>
  );
};
window.FeatureArchive = FeatureArchive;

// ---------- Category parent page ----------
const FeatureCategory = ({ catKey }) => {
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });
  const cats = window.FEATURE_CATS;
  const c = cats[catKey];
  const others = Object.keys(cats).filter((k) => k !== catKey).map((k) => cats[k]);
  return (
    <React.Fragment>
      <section className="uc-archive-hero">
        <div className="container">
          <nav className="uc-hero-crumb" aria-label="Breadcrumb">
            <a href="/features">Features</a>
            <span className="sep">/</span>
            <span>{c.label}</span>
          </nav>
          <div className="uc-hero-icon"><i data-lucide={c.icon} style={{ width: 26, height: 26 }} /></div>
          <h1>{c.label}</h1>
          <p className="lede">{c.lede}</p>
        </div>
      </section>

      <section className="uc-cat-block reveal" style={{ borderBottom: 0 }}>
        <div className="container">
          <div className="uc-card-grid">
            {c.children.map((slug) => <FeatureEntryCard key={slug} slug={slug} />)}
          </div>
        </div>
      </section>

      <section className="uc-otherscats section reveal">
        <div className="container">
          <div className="section-head compact">
            <p className="eyebrow"><span className="dot" />More toolsets</p>
            <h2 className="h2-section">Explore other feature toolsets</h2>
          </div>
          <div className="uc-otherscats-grid">
            {others.map((o) =>
              <a key={o.key} href={o.href} className="uc-othercat">
                <div className="uc-othercat-ico"><i data-lucide={o.icon} style={{ width: 20, height: 20 }} /></div>
                <div>
                  <b>{o.label}</b>
                  <span>{o.tagline}</span>
                </div>
              </a>
            )}
          </div>
        </div>
      </section>
    </React.Fragment>
  );
};
window.FeatureCategory = FeatureCategory;
