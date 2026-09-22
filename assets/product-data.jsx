// Data for the three product detail pages
window.PRODUCT_DATA = {
  '360': {
    eyebrow: 'Jurnii 360',
    kicker: '',
    accent: 'accent-360',
    title: 'See every competitor move, the day it happens.',
    lede: 'Jurnii 360 monitors competitor promotions, boosts, and proposition changes daily across 20+ operators — so your trading, CRM, and product teams stop running on guesswork.',
    primary: { label: 'Book a 45-min demo', href: '/contact-us' },

    features: {
      heading: 'A live intelligence layer for the commercial floor.',
      sub: 'Built on what mid-managers and Heads-of need every Monday morning — not what looks good in a vendor brochure.',
      items: [
        { icon: 'radar', title: 'Daily promotion capture', body: 'Welcome offers, reload offers, free bets, free spins, cashback — captured daily across the competitor set with full structured metadata.' },
        { icon: 'bell', title: 'Real-time change alerts', body: 'Slack or email alerts the moment a competitor changes a hero offer, lowers a wagering requirement, or launches a campaign.' },
        { icon: 'layers', title: 'Promotion richness index', body: 'A weighted composite score that lets you compare like-for-like across operators — beyond headline values.' },
        { icon: 'percent', title: 'Boost margin intelligence', body: 'Every competitor\'s boost margin, scored to the tenth of a point — and the margin you concede each time you match or beat it.' },
        { icon: 'history', title: 'Historical database', body: 'Multi-year history of every promotion in the market. Search, filter, and replay any competitor\'s playbook.' },
        { icon: 'plug-zap', title: 'API & BI integration', body: 'REST API, Snowflake / BigQuery / Databricks exports, and ready-made dashboards for Tableau and Looker.' },
      ],
    },

    outcomes: {
      heading: 'What changes for your team.',
      sub: 'Numbers from current Tier 1 and Tier 2 deployments. Specific results vary by market and starting maturity.',
      kpis: [
        { num: '23%', label: 'Promo waste reduced', desc: 'Average reduction in low-ROI bonus spend after first quarter, by identifying offers competitors abandoned.' },
        { num: '4.2×', label: 'Faster reaction time', desc: 'From "competitor changed something" to "we have a response brief" — measured against manual workflows.' },
        { num: '850+', label: 'Promotions tracked', desc: 'Captured across our most recent seasonal report (Cheltenham 2026), across 20+ operators.' },
        { num: '6 days', label: 'Average go-live', desc: 'From contract signed to first live intelligence dashboard, including calibration period.' },
      ],
    },

    method: {
      heading: 'How Jurnii 360 actually works.',
      sub: 'No black box. Here\'s the pipeline, end to end.',
      steps: [
        { title: 'Scope the competitor set', body: 'Together we agree the brands, markets, and verticals that matter. Typical scope: 5–20 brands across 1–4 jurisdictions.' },
        { title: 'Capture, daily', body: 'Public-facing pages, promo pages, and structured offer pages are captured at agreed frequency. Standard is daily; up to 4× daily for enterprise.' },
        { title: 'Structure & enrich', body: 'Every offer is parsed into a structured schema — value, mechanic, wagering, qualifying odds, eligible games, segment, channel, and more.' },
        { title: 'Score & benchmark', body: 'The promotion richness index normalises across mechanics so a £50 free bet can be compared to a £20 bonus + £10 free spins.' },
        { title: 'Surface & alert', body: 'Insights land in a dashboard, in your Slack, in your email, or directly in your warehouse — whatever your team actually uses.' },
        { title: 'Calibrate weekly', body: 'Your account team reviews accuracy with you weekly for the first month, then monthly, with a quarterly strategy review.' },
      ],
    },

    testimonials: {
      eyebrow: 'Testimonials',
      heading: 'Trusted on the<br/>commercial floor.',
      items: [
        { quote: "I am blown away by the volume and the richness of the report Jurnii provides. A really powerful tool that gave me a 'first time using ChatGPT' feeling.", author: 'David Cox', role: 'CX Consultant', initials: 'DC', color: 'green' },
        { quote: 'This kind of report would have taken three months to generate via usual research processes.', author: 'Ryan Schembri', role: 'CPO at Betsson', initials: 'RS', color: 'blue' },
      ],
    },

    personas: {
      heading: 'Who 360 is built for.',
      sub: 'It\'s a horizontal tool, but it answers different questions for different roles.',
      list: [
        { role: 'CRM & Promotions', question: 'Are we overpaying on reload offers?', answer: 'Compare your full offer ladder against the live market. See which competitors have abandoned mechanics you\'re still funding.' },
        { role: 'Trading & Sportsbook', question: 'Who blinks first on price boosts?', answer: 'Track price-boost frequency, depth, and concentration around major events — and time your own boosts off it.' },
        { role: 'Product & Casino', question: 'What new game launch tactics work?', answer: 'See which providers are getting hero placement at competitors, with what mechanic, and for how long.' },
        { role: 'Head of Marketing', question: 'Where is the market actually going?', answer: 'Quarterly trend reports surface where mechanics are heating up vs cooling — strategy-grade, not anecdotal.' },
      ],
    },
  },

  ux: {
    eyebrow: 'Jurnii UX',
    accent: 'accent-ux',
    title: 'Replace UX opinion with structured benchmarking.',
    lede: 'Jurnii UX scores every step of every critical journey across your operator and your peer set — so product and design teams ship with evidence, not anecdote.',
    primary: { label: 'Book a demo', href: '/contact-us' },

    features: {
      heading: 'A clear, comparable view of player experience.',
      sub: 'Built around the journeys that actually move NGR.',
      items: [
        { icon: 'route', title: 'Journey mapping', body: 'Sign-up, deposit, first bet, casino-to-sport crossover, withdrawal — each scored against 60+ structured criteria.' },
        { icon: 'gauge', title: 'Performance analysis', body: 'Understand if your product is more or less performant than your competition. If not, use the technical recommendations to rectify.' },
        { icon: 'monitor-smartphone', title: 'Mobile & Desktop', body: 'Mobile web and desktop web — scored separately, then synthesised into a unified score.' },
        { icon: 'trophy', title: 'Peer benchmarking', body: 'See exactly where you sit vs your competitors on every criterion. No vague "industry average" averaging.' },
        { icon: 'list-checks', title: 'Prioritised recommendations', body: 'We provide you with categorised recommendations that allow you to build roadmaps, create optimisation experiments or pick off low-hanging fruits.' },
        { icon: 'activity', title: 'Change detection', body: 'Track how yours and competitor releases are affecting scores month-on-month. Receive alerts and notifications for key experience changes found.' },
      ],
    },

    outcomes: {
      heading: 'What "evidence-based UX" looks like in practice.',
      sub: 'Outcomes from operators currently scoring monthly with Jurnii UX.',
      kpis: [
        { num: '60+', label: 'Criteria per journey', desc: 'Every journey decomposed into structured, scoreable criteria — not a single 1–10 vibe-check.' },
        { num: '5', label: 'Peer operators', desc: 'Standard scope: your operator + 5 peers, scored side-by-side, every month.' },
        { num: '<5 days', label: 'Average audit time', desc: 'From scoping call to delivered first audit, including peer-set calibration.' },
        { num: '+8.4pp', label: 'Avg conversion lift', desc: 'Average sign-up→FTD lift after addressing top-3 friction points (over 6 audits).' },
      ],
    },

    method: {
      heading: 'How a Jurnii UX audit runs.',
      sub: 'A predictable, repeatable process — designed to fit a monthly product cadence.',
      steps: [
        { title: 'Define scope', body: 'Agree the journeys (typically 10–12), the peer set (typically 5 operators), and the platforms (mobile web and desktop web).' },
        { title: 'Capture & score', body: 'Our analysts plus our scoring layer walk every journey on mobile web and desktop. Each step is scored, screenshotted, and timestamped.' },
        { title: 'Calibrate findings', body: 'Findings are calibrated against your internal product team in a half-day workshop — no surprises in the final report.' },
        { title: 'Deliver the audit', body: 'A structured report (executive summary, journey-level scoring, prioritised findings) plus a working dashboard you can re-open any time.' },
        { title: 'Re-score monthly', body: 'Each month we re-walk the same journeys. You see the impact of what shipped — and where competitors caught up or pulled away.' },
      ],
    },

    testimonials: {
      eyebrow: 'Testimonials',
      heading: 'Evidence, not opinion.',
      items: [
        { quote: "I am blown away by the volume and the richness of the report Jurnii provides. A really powerful tool that gave me a 'first time using ChatGPT' feeling.", author: 'David Cox', role: 'CX Consultant', initials: 'DC', color: 'green' },
        { quote: 'This kind of report would have taken three months to generate via usual research processes.', author: 'Ryan Schembri', role: 'CPO at Betsson', initials: 'RS', color: 'blue' },
      ],
    },

    personas: {
      heading: 'Who Jurnii UX is built for.',
      sub: 'A product-and-design tool with commercial weight behind every finding.',
      list: [
        { role: 'Head of Product', question: 'Where is our experience leaking NGR?', answer: 'A prioritised list of friction points, ranked by NGR-weighted impact — ready for the next planning cycle.' },
        { role: 'Director of Design', question: 'Are we shipping enough, fast enough?', answer: 'Monthly re-scoring shows whether design throughput is moving the metrics that matter — or just shipping new screens.' },
        { role: 'Conversion / CRO Lead', question: 'Which step is the bottleneck?', answer: 'Step-level scoring isolates the single most impactful change for the next sprint.' },
        { role: 'CCO / CMO', question: 'Is product keeping up with marketing?', answer: 'A clear, executive-level view of whether the experience justifies the acquisition spend.' },
      ],
    },
  },

  mmm: {
    eyebrow: 'jurnii Cortex',
    kicker: 'iGAMING-NATIVE MEDIA MIX MODELLING',
    accent: 'accent-mmm',
    title: 'MMM that actually understands iGaming.',
    lede: 'Cortex is built from the ground up for operators — incorporating bonus mechanics, sporting calendars, regulatory shocks, and competitor pressure as first-class inputs.',
    primary: { label: 'Book a scoping call', href: '/contact-us' },
    secondary: { label: 'Read the data-readiness guide', href: '/library?slug=mmm-data-readiness-igaming' },

    features: {
      heading: 'Designed for operators, not adapted from FMCG.',
      sub: 'Every modelling choice we made started from "what actually drives an iGaming P&L?"',
      items: [
        { icon: 'sparkles', title: 'Bonus mechanics as inputs', body: 'Free bet value, wagering requirements, and reload cadence are first-class model inputs — not lumped into "promotional spend".' },
        { icon: 'calendar', title: 'Sporting calendar awareness', body: 'Cheltenham, the Grand National, the World Cup, NFL season — the model knows the calendar and decomposes uplift accordingly.' },
        { icon: 'shield-alert', title: 'Regulatory shock handling', body: 'Stake limits, ad bans, affordability checks — modelled as exogenous shocks, not noise.' },
        { icon: 'swords', title: 'Competitor pressure variable', body: 'Direct integration with Jurnii 360 means competitor promo intensity is in the model, not assumed away.' },
        { icon: 'split', title: 'FTD vs reactivation split', body: 'New player acquisition and lapsed player reactivation are modelled separately — they don\'t respond to the same channels.' },
        { icon: 'target', title: 'Decision-grade outputs', body: 'Channel-level ROI, saturation curves, and an optimiser that respects real budget and contractual constraints.' },
      ],
    },

    outcomes: {
      heading: 'Decisions, not dashboards.',
      sub: 'Outcomes from current Cortex deployments.',
      kpis: [
        { num: '11%', label: 'Avg NGR uplift', desc: 'Net incremental NGR from optimised channel mix in year one (range: 7%–18% across deployments).' },
        { num: '24mo', label: 'Min. data window', desc: '24 months of clean spend + KPI history is the working minimum. We assess this in the scoping call.' },
        { num: '6', label: 'Channels modelled', desc: 'Standard model: paid search, paid social, display, affiliates, TV, sponsorship — extensible per operator.' },
        { num: '4–6w', label: 'Time to first model', desc: 'From data handoff to delivered first model. Faster than typical FMCG-MMM timelines.' },
      ],
    },

    method: {
      heading: 'A scoping-first approach.',
      sub: 'Most MMM projects fail at data readiness. We surface that risk before contracts.',
      steps: [
        { title: 'Data-readiness assessment', body: 'A 12-point checklist on your spend granularity, KPI cleanliness, and channel taxonomy. Most operators fail 2–3 — we tell you which, before signing.' },
        { title: 'Ingestion & taxonomy', body: 'We unify spend, KPI, and exogenous data (calendar, regulatory, competitor) into a single modelling-ready dataset.' },
        { title: 'Model build', body: 'Bayesian time-series structure, calibrated with your team\'s priors on what each channel "should" do. Transparent, not black-box.' },
        { title: 'Validation workshop', body: 'A half-day session where your commercial leadership stress-tests every coefficient. We don\'t deliver outputs you don\'t believe.' },
        { title: 'Optimisation & roll-out', body: 'Channel-level recommendations with confidence bands, plus an optimiser respecting your real-world budget and contractual constraints.' },
        { title: 'Quarterly refresh', body: 'New data in, model re-trained, deltas reported. Saturation curves and ROIs evolve as the market does.' },
      ],
    },

    testimonials: {
      eyebrow: 'Testimonials',
      heading: 'A model commercial teams believe.',
      items: [
        { quote: "I am blown away by the volume and the richness of the report Jurnii provides. A really powerful tool that gave me a 'first time using ChatGPT' feeling.", author: 'David Cox', role: 'CX Consultant', initials: 'DC', color: 'green' },
        { quote: 'This kind of report would have taken three months to generate via usual research processes.', author: 'Ryan Schembri', role: 'CPO at Betsson', initials: 'RS', color: 'blue' },
      ],
    },

    personas: {
      heading: 'Who Cortex is built for.',
      sub: 'Commercial leadership wanting model-driven channel decisions, not channel-team self-reporting.',
      list: [
        { role: 'CMO / Group Head of Marketing', question: 'Where is the next pound best spent?', answer: 'Channel-level ROI with saturation curves and confidence intervals — and an optimiser that respects your real constraints.' },
        { role: 'Head of Performance', question: 'Is paid search saturated?', answer: 'Per-channel saturation curves show when the next pound stops earning — and which channel should pick it up.' },
        { role: 'CFO / Finance', question: 'Is the marketing line defensible?', answer: 'A model that ties spend to NGR with confidence bands. Defensible in a board meeting.' },
        { role: 'Head of CRM', question: 'How do bonuses really compare to media?', answer: 'Bonus mechanics are first-class inputs. CRM and acquisition spend are modelled in the same framework.' },
      ],
    },
  },
};
