// Data for the three product detail pages
window.PRODUCT_DATA = {
  '360': {
    eyebrow: 'Jurnii 360',
    kicker: '',
    accent: 'accent-360',
    title: 'See every competitor move, the day it happens.',
    lede: 'Jurnii 360 monitors competitor promotions, segmentation, and proposition changes daily across 20+ operators — so your trading, CRM, and product teams stop running on guesswork.',
    primary: { label: 'Book a 45-min demo', href: 'contact.html' },
    secondary: { label: 'See sample report', href: 'resources.html?cat=report' },

    features: {
      heading: 'A live intelligence layer for the commercial floor.',
      sub: 'Built on what mid-managers and Heads-of need every Monday morning — not what looks good in a vendor brochure.',
      items: [
        { icon: 'radar', title: 'Daily promotion capture', body: 'Welcome offers, reload offers, free bets, free spins, cashback — captured daily across the competitor set with full structured metadata.' },
        { icon: 'bell', title: 'Real-time change alerts', body: 'Slack or email alerts the moment a competitor changes a hero offer, lowers a wagering requirement, or launches a campaign.' },
        { icon: 'layers', title: 'Promotion richness index', body: 'A weighted composite score that lets you compare like-for-like across operators — beyond headline values.' },
        { icon: 'users', title: 'Segmentation & targeting analysis', body: 'Identify which player segments competitors are targeting, with what message, and at what cadence.' },
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
        { quote: 'The first quarter alone paid for the platform twice over. We pulled three reload offers that no major competitor had run for nine months — and saw zero churn impact.', author: 'Marcus Hale', role: 'Head of CRM · Tier 1 European operator', initials: 'MH', color: 'green' },
        { quote: 'We used to find out about a competitor\u2019s price-boost campaign from Twitter. Now it\u2019s a Slack alert before they\u2019ve even finished rolling it out.', author: 'Priya Nadar', role: 'Head of Trading · Multi-market sportsbook', initials: 'PN', color: 'blue' },
        { quote: 'It settled an argument we\u2019d been having for two years. The market data was right there on the screen — no more \u201CI think\u201D in the Monday meeting.', author: 'Daniel Okafor', role: 'Group Marketing Director · Tier 1 operator', initials: 'DO', color: 'orange' },
        { quote: 'The historical database alone is worth it. We replayed a competitor\u2019s entire seasonal playbook in an afternoon and built our counter off it.', author: 'Elena Rossi', role: 'Head of Casino · Tier 2 European operator', initials: 'ER', color: 'purple' },
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
    kicker: 'AUTOMATED UX BENCHMARKING',
    accent: 'accent-ux',
    title: 'Replace UX opinion with structured benchmarking.',
    lede: 'Jurnii UX scores every step of every critical journey across your operator and your peer set — so product and design teams ship with evidence, not anecdote.',
    primary: { label: 'Book a demo', href: 'contact.html' },
    secondary: { label: 'View a demo report', href: 'resources.html?cat=thought' },

    features: {
      heading: 'A clear, comparable view of player experience.',
      sub: 'Built around the journeys that actually move NGR.',
      items: [
        { icon: 'route', title: 'Journey mapping', body: 'Sign-up, deposit, first bet, casino-to-sport crossover, withdrawal — each scored against 60+ structured criteria.' },
        { icon: 'gauge', title: 'Performance analysis', body: 'Understand if your product is more or less performant than your competition. If not, use the technical recommendations to rectify.' },
        { icon: 'monitor-smartphone', title: 'Mobile & Desktop', body: 'iOS, Android, mobile web, desktop web — scored separately, then synthesised into a unified score.' },
        { icon: 'trophy', title: 'Peer benchmarking', body: 'See exactly where you sit vs your competitors on every criterion. No vague "industry average" averaging.' },
        { icon: 'list-checks', title: 'Prioritised recommendations', body: 'We provide you with categorised recommendations that allow you to build roadmaps, create optimisation experiments or pick off low-hanging fruits.' },
        { icon: 'refresh-cw', title: 'Recurring assessments', body: 'See how your releases are affecting your score month-on-month, whilst keeping a close eye on your competition, and closing the gap.' },
      ],
    },

    outcomes: {
      heading: 'What "evidence-based UX" looks like in practice.',
      sub: 'Outcomes from operators currently scoring quarterly with Jurnii UX.',
      kpis: [
        { num: '60+', label: 'Criteria per journey', desc: 'Every journey decomposed into structured, scoreable criteria — not a single 1–10 vibe-check.' },
        { num: '5', label: 'Peer operators', desc: 'Standard scope: your operator + 5 peers, scored side-by-side, every quarter.' },
        { num: '12 days', label: 'Average audit time', desc: 'From scoping call to delivered first audit, including peer-set calibration.' },
        { num: '+8.4pp', label: 'Avg conversion lift', desc: 'Average sign-up→FTD lift after addressing top-3 friction points (over 6 audits).' },
      ],
    },

    method: {
      heading: 'How a Jurnii UX audit runs.',
      sub: 'A predictable, repeatable process — designed to fit a quarterly product cadence.',
      steps: [
        { title: 'Define scope', body: 'Agree the journeys (typically 5–7), the peer set (typically 5 operators), and the platforms (iOS, Android, mobile web, desktop web).' },
        { title: 'Capture & score', body: 'Our analysts plus our scoring layer walk every journey on every platform. Each step is scored, screenshotted, and timestamped.' },
        { title: 'Calibrate findings', body: 'Findings are calibrated against your internal product team in a half-day workshop — no surprises in the final report.' },
        { title: 'Deliver the audit', body: 'A structured report (executive summary, journey-level scoring, prioritised findings) plus a working dashboard you can re-open any time.' },
        { title: 'Re-score quarterly', body: 'Each quarter we re-walk the same journeys. You see the impact of what shipped — and where competitors caught up or pulled away.' },
      ],
    },

    testimonials: {
      eyebrow: 'Testimonials',
      heading: 'Evidence, not opinion.',
      items: [
        { quote: 'For the first time, our roadmap arguments stopped being “Spotify does it this way” and started being “we lose 4.2 points to the market on this exact step.” That changed the whole conversation.', author: 'Sofia Lindqvist', role: 'Director of Product · Top 5 European sportsbook', initials: 'SL', color: 'green' },
        { quote: 'Every finding came with a screenshot and a score. My designers stopped defending taste and started fixing measured problems.', author: 'Tom Wheeler', role: 'Director of Design · Tier 1 operator', initials: 'TW', color: 'blue' },
        { quote: 'Step-level scoring pointed straight at one screen in our deposit flow. We fixed it in a single sprint and conversion moved the next week.', author: 'Aisha Mansour', role: 'Conversion Lead · Multi-brand casino', initials: 'AM', color: 'orange' },
        { quote: 'It’s the first UX report I’ve been able to take into a board meeting without translating it first. The commercial weight is already in the numbers.', author: 'James Okonkwo', role: 'Chief Product Officer · Tier 2 operator', initials: 'JO', color: 'purple' },
      ],
    },

    personas: {
      heading: 'Who Jurnii UX is built for.',
      sub: 'A product-and-design tool with commercial weight behind every finding.',
      list: [
        { role: 'Head of Product', question: 'Where is our experience leaking NGR?', answer: 'A prioritised list of friction points, ranked by NGR-weighted impact — ready for the next planning cycle.' },
        { role: 'Director of Design', question: 'Are we shipping enough, fast enough?', answer: 'Quarterly re-scoring shows whether design throughput is moving the metrics that matter — or just shipping new screens.' },
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
    primary: { label: 'Book a scoping call', href: 'contact.html' },
    secondary: { label: 'Read the data-readiness guide', href: 'resource.html?slug=mmm-data-readiness-igaming' },

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
        { quote: 'Every MMM we’d looked at before came from a consultancy that had clearly never run an iGaming P&L. Jurnii’s model had the bonus structure right inside the regression. That was the difference.', author: 'Lukas Brandt', role: 'Group Head of Performance · Multi-jurisdiction operator', initials: 'LB', color: 'green' },
        { quote: 'For once the marketing line in the board pack came with confidence bands, not a story. Our CFO actually signed off the increase.', author: 'Rachel Donovan', role: 'VP Finance · Tier 1 European operator', initials: 'RD', color: 'blue' },
        { quote: 'The saturation curves told us paid search was tapped out two quarters before we’d have felt it. We moved the budget and kept the growth.', author: 'Nikhil Rao', role: 'Head of Performance · Multi-market operator', initials: 'NR', color: 'orange' },
        { quote: 'It’s the only model I’ve seen that treats a free-bet campaign and a TV burst in the same framework. That’s how we actually spend.', author: 'Hannah Vogel', role: 'Chief Marketing Officer · Tier 2 operator', initials: 'HV', color: 'purple' },
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
