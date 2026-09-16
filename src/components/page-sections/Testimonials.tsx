import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  initials?: string;
  color?: string;
  avatar?: string;
}

interface TestimonialsProps {
  eyebrow?: string;
  heading: string;
  items?: TestimonialItem[];
  accentClass?: string;
}

const AVATAR_COLORS = ['green', 'blue', 'orange', 'purple'] as const;

const TmAvatar = ({ author, initials, avatar, color }: Pick<TestimonialItem, 'author' | 'initials' | 'avatar' | 'color'>) => (
  <div className={`tm-avatar tm-av-${color}`} aria-hidden={avatar ? undefined : true}>
    {avatar ? <img src={avatar} alt={author} /> : <span>{initials}</span>}
  </div>
);

export const Testimonials = ({ eyebrow = 'Testimonials', heading, items = [], accentClass = '' }: TestimonialsProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const sync = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    setOverflows(el.scrollWidth > el.clientWidth + 2);
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

  const nudge = (dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('.tm-card');
    const step = card instanceof HTMLElement ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  if (!items.length) return null;

  return (
    <section className={`section reveal tm-section ${accentClass}`}>
      <div className="container">
        <div className="tm-head">
          <div className="section-head">
            <p className="eyebrow"><span className="dot" />{eyebrow}</p>
            <h2 className="h2-section" dangerouslySetInnerHTML={{ __html: heading }} />
          </div>
          {overflows ? (
            <div className="tm-nav">
              <button className="tm-arrow" onClick={() => nudge(-1)} disabled={atStart} aria-label="Previous testimonials">
                <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
              </button>
              <button className="tm-arrow" onClick={() => nudge(1)} disabled={atEnd} aria-label="Next testimonials">
                <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="tm-track-wrap">
          <div className="tm-track" ref={trackRef}>
            {items.map((t, i) => (
              <article className="tm-card" key={`${t.author}-${i}`}>
                <header className="tm-card-head">
                  <TmAvatar
                    author={t.author}
                    initials={t.initials}
                    avatar={t.avatar}
                    color={t.color || AVATAR_COLORS[i % AVATAR_COLORS.length]}
                  />
                  <div className="tm-id">
                    <b>{t.author}</b>
                    <span>{t.role}</span>
                  </div>
                </header>
                <blockquote className="tm-quote">{t.quote}</blockquote>
              </article>
            ))}
          </div>
          <div className={`tm-fade${atEnd ? ' is-hidden' : ''}`} />
        </div>
      </div>
    </section>
  );
};
