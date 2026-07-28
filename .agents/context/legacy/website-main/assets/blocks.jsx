// Reusable building blocks for product detail pages
const { useState: pS, useEffect: pE } = React;

// ---------- Page hero (smaller than homepage hero, used on product/compare/etc) ----------
const PageHero = ({ eyebrow, title, lede, primaryCta, secondaryCta, kicker, accentClass = '' }) => {
  pE(() => {window.lucide && window.lucide.createIcons();}, []);
  return (
    <section className={`page-hero ${accentClass}`}>
      <div className="container">
        {kicker && <p className="page-hero-kicker">{kicker}</p>}
        <p className="eyebrow"><span className="dot" />{eyebrow}</p>
        <h1 className="h1-page">{title}</h1>
        <p className="page-hero-lede">{lede}</p>
        <div className="hero-cta-row">
          {primaryCta && <a href={primaryCta.href} className="btn primary lg">{primaryCta.label} <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" /></a>}
          {secondaryCta && <a href={secondaryCta.href} className="btn ghost lg">{secondaryCta.label}</a>}
        </div>
      </div>
    </section>);

};
window.PageHero = PageHero;

// ---------- Feature grid ("what you get") ----------
const FeatureGrid = ({ heading, sub, items }) => {
  pE(() => {window.lucide && window.lucide.createIcons();}, []);
  return (
    <section className="section reveal">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" />Capabilities</p>
          <h2 className="h2-section">{heading}</h2>
          {sub && <p className="section-lede">{sub}</p>}
        </div>
        <div className="feature-grid">
          {items.map((it, i) =>
          <div key={i} className="feature-cell">
              <div className="feature-icon"><i data-lucide={it.icon} style={{ width: 18, height: 18 }} /></div>
              <h3>{it.title}</h3>
              <p>{it.body}</p>
            </div>
          )}
        </div>
      </div>
    </section>);

};
window.FeatureGrid = FeatureGrid;

// ---------- Outcomes / KPI strip ("what changes") ----------
const OutcomeStrip = ({ heading, sub, kpis }) =>
<section className="section reveal section-tight">
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot" />Outcomes</p>
        <h2 className="h2-section">{heading}</h2>
        {sub && <p className="section-lede">{sub}</p>}
      </div>
      <div className="outcome-grid">
        {kpis.map((k, i) =>
      <div key={i} className="outcome-cell">
            <div className="outcome-num">{k.num}</div>
            <div className="outcome-label">{k.label}</div>
            <p className="outcome-desc">{k.desc}</p>
          </div>
      )}
      </div>
    </div>
  </section>;

window.OutcomeStrip = OutcomeStrip;

// ---------- Methodology / steps ----------
const Methodology = ({ heading, sub, steps }) =>
<section className="section reveal">
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot" />Methodology</p>
        <h2 className="h2-section">{heading}</h2>
        {sub && <p className="section-lede">{sub}</p>}
      </div>
      <ol className="method-list">
        {steps.map((s, i) =>
      <li key={i}>
            <span className="method-num">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </li>
      )}
      </ol>
    </div>
  </section>;

window.Methodology = Methodology;

// ---------- Inline pull-quote ----------
const PullQuote = ({ quote, author, role }) =>
<section className="section reveal section-tight">
    <div className="container">
      <figure className="pull-quote">
        <blockquote>{quote}</blockquote>
        <figcaption><b>{author}</b> · <span>{role}</span></figcaption>
      </figure>
    </div>
  </section>;

window.PullQuote = PullQuote;

// ---------- Testimonial carousel ----------
const TmAvatar = ({ author, initials, avatar, color }) =>
<div className={`tm-avatar tm-av-${color}`} aria-hidden={avatar ? undefined : true}>
    {avatar ? <img src={avatar} alt={author} /> : <span>{initials}</span>}
  </div>;

const Testimonials = ({ eyebrow = 'Testimonials', heading, items = [], accentClass = '' }) => {
  const trackRef = React.useRef(null);
  const [atStart, setAtStart] = pS(true);
  const [atEnd, setAtEnd] = pS(false);

  pE(() => {window.lucide && window.lucide.createIcons();}, []);

  const sync = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  };

  pE(() => {
    const el = trackRef.current;
    if (!el) return;
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);

    // drag-to-scroll
    let down = false,startX = 0,startLeft = 0,moved = false;
    const onDown = (e) => {down = true;moved = false;startX = e.pageX;startLeft = el.scrollLeft;el.classList.add('is-grabbing');};
    const onMove = (e) => {if (!down) return;const dx = e.pageX - startX;if (Math.abs(dx) > 4) moved = true;el.scrollLeft = startLeft - dx;};
    const onUp = () => {down = false;el.classList.remove('is-grabbing');};
    const onClick = (e) => {if (moved) {e.preventDefault();e.stopPropagation();}};
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('click', onClick, true);
    };
  }, []);

  const nudge = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('.tm-card');
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const colors = ['green', 'blue', 'orange', 'purple'];

  return (
    <section className={`section reveal tm-section ${accentClass}`}>
      <div className="container">
        <div className="tm-head">
          <div className="section-head">
            <p className="eyebrow"><span className="dot" />{eyebrow}</p>
            <h2 className="h2-section" dangerouslySetInnerHTML={{ __html: heading }} />
          </div>
          <div className="tm-nav">
            <button className="tm-arrow" onClick={() => nudge(-1)} disabled={atStart} aria-label="Previous testimonials"><i data-lucide="arrow-left" /></button>
            <button className="tm-arrow" onClick={() => nudge(1)} disabled={atEnd} aria-label="Next testimonials"><i data-lucide="arrow-right" /></button>
          </div>
        </div>

        <div className="tm-track-wrap">
          <div className="tm-track" ref={trackRef}>
            {items.map((t, i) =>
            <article className="tm-card" key={i}>
                <header className="tm-card-head">
                  <TmAvatar author={t.author} initials={t.initials} avatar={t.avatar} color={t.color || colors[i % colors.length]} />
                  <div className="tm-id">
                    <b>{t.author}</b>
                    <span>{t.role}</span>
                  </div>
                </header>
                <blockquote className="tm-quote">{t.quote}</blockquote>
              </article>
            )}
          </div>
          <div className={`tm-fade${atEnd ? ' is-hidden' : ''}`} />
        </div>
      </div>
    </section>);

};
window.Testimonials = Testimonials;

// ---------- Two-column "Use cases" or "Who it's for" ----------
const PersonaList = ({ heading, sub, personas }) =>
<section className="section reveal">
    <div className="container">
      <div className="section-head">
        <p className="eyebrow"><span className="dot" />Who it's for</p>
        <h2 className="h2-section">{heading}</h2>
        {sub && <p className="section-lede">{sub}</p>}
      </div>
      <div className="persona-grid">
        {personas.map((p, i) =>
      <div key={i} className="persona-cell">
            <h3>{p.role}</h3>
            <p className="persona-q">"{p.question}"</p>
            <p>{p.answer}</p>
          </div>
      )}
      </div>
    </div>
  </section>;

window.PersonaList = PersonaList;

// ---------- Big CTA band ----------
const CTABand = ({ heading, sub, primary, secondary }) => {
  pE(() => {window.lucide && window.lucide.createIcons();}, []);
  return (
    <section className="section reveal cta-band-wrap">
      <div className="container">
        <div className="cta-band">
          <div>
            <h2>{heading}</h2>
            <p>{sub}</p>
          </div>
          <div className="cta-band-actions">
            {primary && <a href={primary.href} className="btn accent lg">{primary.label} <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" /></a>}
            {secondary && <a href={secondary.href} className="btn ghost lg">{secondary.label}</a>}
          </div>
        </div>
      </div>
    </section>);

};
window.CTABand = CTABand;