// ============================================================
// Use Case leaf-page TEMPLATE. One component renders every
// individual use-case page from window.USE_CASE_DATA[slug].
// Edit here once → every page updates.
//   <UseCasePage slug="cco" />
// ============================================================

const UseCasePage = ({ slug }) => {
  const d = window.USE_CASE_DATA[slug];
  const S = window.USE_CASE_SHARED;
  const cat = window.USE_CASE_CATS[d.cat];

  React.useEffect(() => {window.lucide && window.lucide.createIcons();});

  // Sibling pages in the same category → "Built For" rail.
  const siblings = cat.children.filter((s) => s !== slug).map((s) => window.USE_CASE_DATA[s]);
  const leafHref = (s) => `/use-cases/${s}`;

  const bench = S.benchmark;

  return (
    <React.Fragment>
      {/* HERO */}
      <section className="uc-hero reveal">
        <div className="container">
          <nav className="uc-hero-crumb" aria-label="Breadcrumb">
            <a href="/use-cases">Use Cases</a>
            <span className="sep">/</span>
            <a href={cat.href}>{cat.label}</a>
            <span className="sep">/</span>
            <span>{d.label}</span>
          </nav>
          <div className="uc-hero-head">
            <div className="uc-hero-icon"><i data-lucide={d.icon} style={{ width: 26, height: 26 }} /></div>
            <p className="uc-hero-kicker">{d.kicker}</p>
          </div>
          <h1 className="h1-page">{d.title}</h1>
          <p className="page-hero-lede">{d.lede}</p>
          <div className="hero-cta-row" style={{ marginTop: 8 }}>
            <a href="/contact-us" className="btn primary lg">Book a demo <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" /></a>
            <a href={cat.href} className="btn ghost lg">All {cat.label.toLowerCase()} use cases</a>
          </div>
        </div>
      </section>

      {/* METRIC STRIP */}
      <div className="uc-metrics">
        <div className="container">
          <div className="uc-metrics-grid">
            {d.metrics.map((m, i) =>
            <div className="uc-metric" key={i}>
                <span className="uc-metric-num">{m.num}</span>
                <span className="uc-metric-label">{m.label}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MANIFESTO */}
      <section className="uc-manifesto reveal">
        <div className="container">
          <p>{d.manifesto}</p>
        </div>
      </section>

      {/* CHALLENGE / SOLUTION */}
      <section className="uc-challenge section reveal">
        <div className="container">
          <div className="uc-challenge-grid">
            <div>
              <p className="eyebrow"><span className="dot" />{d.challengeEyebrow}</p>
              <h2>{d.challengeTitle}</h2>
              <p>{d.challengePara}</p>
              <p>{S.challengeSharedPara}</p>
            </div>
            <div className="uc-solution-card">
              <div className="uc-solution-ico"><i data-lucide={S.solutionIcon} style={{ width: 20, height: 20 }} /></div>
              <h3>{S.solutionHeading}</h3>
              <p>{d.solutionPara}</p>
              <div className="uc-implication">
                <div className="uc-implication-head"><i data-lucide="trending-up" style={{ width: 13, height: 13 }} /> Commercial Implication</div>
                <p dangerouslySetInnerHTML={{ __html: S.implication }} />
              </div>
              <div className="uc-solution-foot">{d.solutionFoot}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES (dark band) */}
      <section className="uc-capabilities reveal">
        <div className="container">
          <div className="uc-cap-head">
            <h2>Strategic Capabilities</h2>
            <p>Objective tools designed to replace subjective opinion with verified digital and commercial facts.</p>
          </div>
          <div className="uc-cap-grid">
            {d.capabilities.map((c, i) =>
            <div className="uc-cap-card" key={i}>
                <div className="uc-cap-ico"><i data-lucide={c.icon} style={{ width: 22, height: 22 }} /></div>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BENCHMARK MATRIX */}
      <section className="uc-benchmark section reveal">
        <div className="container">
          <div className="section-head centered">
            <p className="eyebrow"><span className="dot" />Performance Matrix</p>
            <h2 className="h2-section">{bench.heading}</h2>
            <p className="section-lede">{bench.lede}</p>
          </div>
          <div className="uc-table-card">
            <table className="uc-table">
              <thead>
                <tr>
                  <th>Capabilities Matrix</th>
                  <th className="jcol">{bench.cols[0]}</th>
                  <th>{bench.cols[1]}</th>
                  <th>{bench.cols[2]}</th>
                </tr>
              </thead>
              <tbody>
                {bench.rows.map((r, i) =>
                <tr key={i}>
                    <td className="feat">{r.feat}</td>
                    <td className="jcol"><span className="uc-badge"><i data-lucide="check" /> {r.jurnii}</span></td>
                    <td>{r.legacy}</td>
                    <td>{r.manual}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CORTEX + DASHBOARD */}
      <section className="uc-cortex section reveal">
        <div className="container">
          <div className="uc-cortex-grid">
            <div>
              <p className="eyebrow"><span className="dot" />{S.cortex.eyebrow}</p>
              <h2>{S.cortex.heading}</h2>
              {S.cortex.paras.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="uc-dash">
              <div className="uc-dash-head">
                <span className="uc-dash-title"><span className="uc-dash-dot" /> Jurnii Cortex Live Benchmarks</span>
                <span className="uc-dash-live">Active Feed</span>
              </div>
              <div className="uc-dash-grid">
                <div className="uc-dash-card">
                  <h4>Promo Richness Index</h4>
                  <div className="uc-idx-row">
                    <span className="uc-idx-val">84</span>
                    <span className="uc-idx-cmp">+4.2% vs Market Avg</span>
                  </div>
                  <div className="uc-minichart">
                    {[35, 48, 60, 84, 72, 68, 80].map((h, i) =>
                    <div key={i} className={`uc-bar ${h >= 80 ? 'on' : ''}`} style={{ height: h + '%' }} />
                    )}
                  </div>
                </div>
                <div className="uc-dash-card">
                  <h4>Player Onboarding Funnel</h4>
                  <div className="uc-funnel">
                    <div className="uc-funnel-meta"><span>Registration</span><span>98%</span></div>
                    <div className="uc-funnel-track"><div className="uc-funnel-fill" style={{ width: '98%' }} /></div>
                  </div>
                  <div className="uc-funnel">
                    <div className="uc-funnel-meta"><span>KYC Checkpoint</span><span className="uc-funnel-leak">82% Leak</span></div>
                    <div className="uc-funnel-track"><div className="uc-funnel-fill leak" style={{ width: '82%' }} /></div>
                  </div>
                  <div className="uc-funnel">
                    <div className="uc-funnel-meta"><span>First Deposit</span><span>64%</span></div>
                    <div className="uc-funnel-track"><div className="uc-funnel-fill" style={{ width: '64%' }} /></div>
                  </div>
                </div>
              </div>
              <div className="uc-dash-foot">
                <b>Cortex Attribution Yield Result: {S.cortex.result}</b>
                {S.cortex.resultNote}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="uc-quote section reveal">
        <div className="container">
          <div className="uc-quote-card">
            <blockquote>“{S.testimonial.quote}”</blockquote>
            <div className="uc-quote-author">
              <div className="uc-quote-avatar">{S.testimonial.avatar}</div>
              <div>
                <cite className="uc-quote-name">{S.testimonial.name}</cite>
                <span className="uc-quote-role">{S.testimonial.role}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ECOSYSTEM / RELATED */}
      <section className="uc-eco section reveal">
        <div className="container">
          <div className="section-head">
            <h2 className="h2-section">{S.ecosystem.heading}</h2>
            <p className="section-lede">{S.ecosystem.lede}</p>
          </div>
          <div className="uc-eco-grid">
            {S.ecosystem.columns.map((col, i) =>
            <div key={i}>
                <h3 className="uc-eco-col-label">{col.label}</h3>
                <div className="uc-eco-links">
                  {col.items.map((it) =>
                <a key={it.href} href={it.href} className="uc-eco-card">
                      <h4>{it.title}</h4>
                      <p>{it.desc}</p>
                    </a>
                )}
                </div>
              </div>
            )}
            <div>
              <h3 className="uc-eco-col-label">Built For</h3>
              <div className="uc-eco-links">
                {siblings.map((sib) =>
                <a key={sib.slug} href={leafHref(sib.slug)} className="uc-eco-card">
                    <h4>{sib.label}</h4>
                    <p>{sib.cardTitle}</p>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </React.Fragment>);

};
window.UseCasePage = UseCasePage;