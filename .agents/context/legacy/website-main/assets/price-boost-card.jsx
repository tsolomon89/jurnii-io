// Price Boost Card — Jurnii 360 "detected competitor promotion" component.
// Mirrors the component library, plus a GSAP entrance timeline for character.
// Exported to window so other babel scripts (home-sections.jsx) can use it.
(function () {
  const { useRef, useEffect } = React;

  // Jurnii brand mark — green arrow + two sparkles. Sparkle fill adapts to theme.
  const JurniiMark = ({ size = 40 }) =>
  <svg width={size} height={size} viewBox="0 0 88 88" fill="none" aria-hidden="true">
      <path d="M42.2788 52.8445L68.7087 41.0979C70.6628 40.2294 72.6595 42.2261 71.791 44.1802L60.0444 70.6101C59.0201 72.9149 55.5753 72.1839 55.5753 69.6617V59.6488C55.5753 58.3591 54.5298 57.3136 53.2401 57.3136H43.2272C40.705 57.3136 39.974 53.8688 42.2788 52.8445Z" fill="var(--jurnii-300)" />
      <path d="M45.4314 17.2873C45.8936 15.5709 48.3288 15.5709 48.791 17.2873L50.541 23.7871C50.7022 24.3858 51.1698 24.8534 51.7685 25.0146L58.2683 26.7647C59.9847 27.2268 59.9847 29.6621 58.2683 30.1242L51.7685 31.8743C51.1698 32.0355 50.7022 32.5031 50.541 33.1018L48.791 39.6016C48.3288 41.318 45.8936 41.318 45.4314 39.6016L43.6814 33.1018C43.5202 32.5031 43.0525 32.0355 42.4539 31.8743L35.9541 30.1242C34.2376 29.6621 34.2376 27.2268 35.9541 26.7647L42.4539 25.0146C43.0525 24.8534 43.5202 24.3858 43.6814 23.7871L45.4314 17.2873Z" fill="var(--sc-logo-mark)" />
      <path d="M24.0735 40.2987C24.4201 39.0114 26.2465 39.0114 26.5932 40.2987L27.9057 45.1736C28.0266 45.6226 28.3773 45.9733 28.8263 46.0942L33.7012 47.4068C34.9885 47.7534 34.9885 49.5798 33.7012 49.9264L28.8263 51.239C28.3773 51.3598 28.0266 51.7106 27.9057 52.1596L26.5932 57.0344C26.2465 58.3217 24.4201 58.3217 24.0735 57.0344L22.761 52.1596C22.6401 51.7106 22.2893 51.3598 21.8403 51.239L16.9655 49.9264C15.6782 49.5798 15.6782 47.7534 16.9655 47.4068L21.8403 46.0942C22.2893 45.9733 22.6401 45.6226 22.761 45.1736L24.0735 40.2987Z" fill="var(--sc-logo-mark)" />
    </svg>;


  const PBArrow = () =>
  <svg width="46" height="20" viewBox="0 0 46 20" fill="none" stroke="currentColor"
  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="2" y1="10" x2="40" y2="10" />
      <polyline points="32 3 41 10 32 17" />
    </svg>;


  const PriceBoostCard = ({
    brand = 'Your Brand',
    product = 'Super Price Boost',
    status = 'Active',
    match = 'Manchester United vs Liverpool',
    date = '07/03/2026',
    market = 'Bruno Fernandes to Assist & Kobbie Mainoo to score',
    was = '4/7',
    now = '4/5',
    boost = '+28%'
  }) => {
    const ref = useRef(null);

    useEffect(() => {
      const root = ref.current;
      const gsap = window.gsap;
      if (!root || !gsap) return;

      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const q = (sel) => Array.from(root.querySelectorAll(sel));

      const ctx = gsap.context(() => {
        if (reduce) return; // leave everything in its natural, visible state

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.from(root, { autoAlpha: 0, y: 18, scale: 0.985, duration: 0.5 }).
        from(q('.pb-logo, .pb-head-text > *'), { autoAlpha: 0, x: -14, duration: 0.4, stagger: 0.07 }, '-=0.25').
        from(q('.pb-status'), { autoAlpha: 0, scale: 0.5, duration: 0.45, ease: 'back.out(2)' }, '-=0.3').
        from(q('.pb-match, .pb-date, .pb-market-label, .pb-market-value'),
        { autoAlpha: 0, y: 12, duration: 0.4, stagger: 0.06 }, '-=0.2').
        from(q('.pb-odds'), { autoAlpha: 0, y: 16, duration: 0.45 }, '-=0.1').
        from(q('.pb-odds-col'), { autoAlpha: 0, y: 10, duration: 0.35, stagger: 0.12 }, '-=0.25').
        from(q('.pb-odds-arrow'), { autoAlpha: 0, scaleX: 0, transformOrigin: 'left center', duration: 0.4, ease: 'power2.out' }, '<').
        from(q('.pb-boost'), { autoAlpha: 0, scale: 0.4, duration: 0.5, ease: 'back.out(2.4)' }, '-=0.15')
        // ongoing character: the boost pill gently breathes, the status dot-glow pulses
        .add(() => {
          gsap.to(q('.pb-boost'), {
            scale: 1.045, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1,
            transformOrigin: 'center center'
          });
          gsap.to(q('.pb-status'), {
            boxShadow: '0 0 0 6px color-mix(in srgb, var(--primary) 22%, transparent)',
            duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1
          });
        });
      }, root);

      return () => ctx.revert();
    }, []);

    return (
      <div className="pb-card" ref={ref}>
        <div className="pb-head">
          <div className="pb-logo"><JurniiMark size={42} /></div>
          <div className="pb-head-text">
            <div className="pb-brand">{brand}</div>
            <div className="pb-product">{product}</div>
          </div>
          <span className="pb-status">{status}</span>
        </div>

        <div className="pb-body">
          <div className="pb-match">{match}</div>
          <div className="pb-date">Date Detected: {date}</div>
        </div>

        <div className="pb-market">
          <div className="pb-market-label">Market</div>
          <div className="pb-market-value">{market}</div>
        </div>

        <div className="pb-odds">
          <div className="pb-odds-col">
            <span className="pb-odds-cap">Was</span>
            <span className="pb-odds-num was">{was}</span>
          </div>
          <span className="pb-odds-arrow"><PBArrow /></span>
          <div className="pb-odds-col">
            <span className="pb-odds-cap">Now</span>
            <span className="pb-odds-num">{now}</span>
          </div>
          <span className="pb-boost">{boost}</span>
        </div>
      </div>);

  };

  window.PriceBoostCard = PriceBoostCard;
})();