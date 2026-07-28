// ============================================================
// Use Cases ARCHIVE + CATEGORY templates.
//   <UseCaseArchive />          → /use-cases/index.html (blog-style)
//   <UseCaseCategory catKey=".."/> → parent page for one category
// ============================================================

const leafHrefFor = (slug) => {
  const d = window.USE_CASE_DATA[slug];
  return `use-cases/${d.cat}/${slug}.html`;
};

// A single use-case card used on both index + category pages.
const UseCaseEntryCard = ({ slug }) => {
  const d = window.USE_CASE_DATA[slug];
  return (
    <a href={leafHrefFor(slug)} className="uc-entry-card">
      <div className="uc-entry-ico"><i data-lucide={d.icon} style={{ width: 22, height: 22 }} /></div>
      <p className="uc-entry-tag">{d.kicker}</p>
      <h3>{d.cardTitle}</h3>
      <p>{d.cardSummary}</p>
      <span className="uc-entry-more">Read use case <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" /></span>
    </a>
  );
};

// ---------- Archive index (grouped by category) ----------
const UseCaseArchive = () => {
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });
  const cats = window.USE_CASE_CATS;
  const order = ['roles', 'company-sizes', 'departments', 'sectors'];
  return (
    <React.Fragment>
      <section className="uc-archive-hero">
        <div className="container">
          <p className="eyebrow"><span className="dot" />Use Cases</p>
          <h1>Intelligence, mapped to how you actually operate.</h1>
          <p className="lede">Jurnii delivers modular commercial intelligence tailored around executive roles, operating sizes, functional departments, and industry verticals. Browse by segment to see exactly what changes for your team.</p>
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
                {c.children.map((slug) => <UseCaseEntryCard key={slug} slug={slug} />)}
              </div>
            </div>
          </section>
        );
      })}
    </React.Fragment>
  );
};
window.UseCaseArchive = UseCaseArchive;

// ---------- Category parent page ----------
const UseCaseCategory = ({ catKey }) => {
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });
  const cats = window.USE_CASE_CATS;
  const c = cats[catKey];
  const others = Object.keys(cats).filter((k) => k !== catKey).map((k) => cats[k]);
  return (
    <React.Fragment>
      <section className="uc-archive-hero">
        <div className="container">
          <nav className="uc-hero-crumb" aria-label="Breadcrumb">
            <a href="use-cases/index.html">Use Cases</a>
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
            {c.children.map((slug) => <UseCaseEntryCard key={slug} slug={slug} />)}
          </div>
        </div>
      </section>

      <section className="uc-otherscats section reveal">
        <div className="container">
          <div className="section-head compact">
            <p className="eyebrow"><span className="dot" />More segments</p>
            <h2 className="h2-section">Explore other use-case dimensions</h2>
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
window.UseCaseCategory = UseCaseCategory;
