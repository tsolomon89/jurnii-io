// ============================================================
// Solutions ARCHIVE + CATEGORY templates.
//   <SolutionArchive />              → /solutions/index.html (blog-style)
//   <SolutionCategory catKey=".."/>  → parent page for one category
// ============================================================

const solLeafHref = (slug) => `solutions/${slug}.html`;

// A single solution card used on both index + category pages.
const SolutionEntryCard = ({ slug }) => {
  const d = window.SOLUTION_DATA[slug];
  return (
    <a href={solLeafHref(slug)} className="uc-entry-card">
      <div className="uc-entry-ico"><i data-lucide={d.icon} style={{ width: 22, height: 22 }} /></div>
      <p className="uc-entry-tag">{d.kicker}</p>
      <h3>{d.cardTitle}</h3>
      <p>{d.cardSummary}</p>
      <span className="uc-entry-more">Explore solution <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" /></span>
    </a>
  );
};

// ---------- Archive index (grouped by category) ----------
const SolutionArchive = () => {
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });
  const cats = window.SOLUTION_CATS;
  const order = ['competition', 'benchmarking', 'attribution', 'optimization'];
  return (
    <React.Fragment>
      <section className="uc-archive-hero">
        <div className="container">
          <p className="eyebrow"><span className="dot" />Solutions</p>
          <h1>Strategic intelligence, mapped to the outcome you need.</h1>
          <p className="lede">Sixteen high-impact solutions built to optimise operator yield — discover competitors, benchmark platform usability, attribute marketing spend, and lift conversion. Browse by discipline to see exactly what changes for your team.</p>
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
                {c.children.map((slug) => <SolutionEntryCard key={slug} slug={slug} />)}
              </div>
            </div>
          </section>
        );
      })}
    </React.Fragment>
  );
};
window.SolutionArchive = SolutionArchive;

// ---------- Category parent page ----------
const SolutionCategory = ({ catKey }) => {
  React.useEffect(() => { window.lucide && window.lucide.createIcons(); });
  const cats = window.SOLUTION_CATS;
  const c = cats[catKey];
  const others = Object.keys(cats).filter((k) => k !== catKey).map((k) => cats[k]);
  return (
    <React.Fragment>
      <section className="uc-archive-hero">
        <div className="container">
          <nav className="uc-hero-crumb" aria-label="Breadcrumb">
            <a href="solutions/index.html">Solutions</a>
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
            {c.children.map((slug) => <SolutionEntryCard key={slug} slug={slug} />)}
          </div>
        </div>
      </section>

      <section className="uc-otherscats section reveal">
        <div className="container">
          <div className="section-head compact">
            <p className="eyebrow"><span className="dot" />More disciplines</p>
            <h2 className="h2-section">Explore other solution categories</h2>
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
window.SolutionCategory = SolutionCategory;
