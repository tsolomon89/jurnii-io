import React, { useRef, useState, useEffect } from 'react';

const TmAvatar = ({ author, initials, avatar, color }: any) => (
  <div className={`tm-avatar tm-av-${color}`} aria-hidden={avatar ? undefined : true}>
    {avatar ? <img src={avatar} alt={author} /> : <span>{initials}</span>}
  </div>
);

export const Testimonials = ({ eyebrow = 'Testimonials', heading, items = [], accentClass = '' }: any) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }, []);

  const sync = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);

    let down = false, startX = 0, startLeft = 0, moved = false;
    const onDown = (e: PointerEvent) => {
      down = true; moved = false; startX = e.pageX; startLeft = el.scrollLeft; el.classList.add('is-grabbing');
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      down = false; el.classList.remove('is-grabbing');
    };
    const onClick = (e: MouseEvent) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    };
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

  const scrollBy = (dir: number) => {
    if (trackRef.current) trackRef.current.scrollBy({ left: dir * 400, behavior: 'smooth' });
  };

  if (!items.length) return null;

  return (
    <section className={`section reveal tm-outer ${accentClass}`}>
      <div className="container">
        <div className="tm-head-row">
          <div>
            <p className="eyebrow"><span className="dot" />{eyebrow}</p>
            <h2 className="h2-section" dangerouslySetInnerHTML={{ __html: heading }}></h2>
          </div>
          <div className="tm-nav">
            <button className="tm-nav-btn" disabled={atStart} onClick={() => scrollBy(-1)} aria-label="Previous quote">
              <i data-lucide="arrow-left" style={{ width: 20, height: 20 }} />
            </button>
            <button className="tm-nav-btn" disabled={atEnd} onClick={() => scrollBy(1)} aria-label="Next quote">
              <i data-lucide="arrow-right" style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>
      </div>
      <div className="tm-track-wrap">
        <div className="tm-track" ref={trackRef}>
          {items.map((it: any, i: number) => (
            <div key={i} className="tm-card">
              <blockquote>{it.quote}</blockquote>
              <div className="tm-author-row">
                <TmAvatar author={it.author} initials={it.initials} avatar={it.avatar} color={it.color} />
                <div>
                  <div className="tm-author">{it.author}</div>
                  <div className="tm-role">{it.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
