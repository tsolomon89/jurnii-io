const fs = require('fs');
const path = require('path');

const root = process.cwd();

// Ensure Directories Exist
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

const featuresData = [
  {
    slug: "features/competitor-promotions.html",
    name: "Promotions",
    fullName: "Competitor Promotions",
    kicker: "Competitor Core",
    lede: "Track live competitor sign-up offers, sports/casino bonuses, and wagering multiples in real-time.",
    manifesto: "Never let a competitor promotion go unnoticed. Jurnii monitors active sign-up offers across key regulated jurisdictions, helping operators calibrate margins and acquire players dynamically.",
    capabilities: [
      { title: "Wagering Hurdles Tracking", icon: "tag", desc: "Compare deposit wagering requirements and spin multipliers side-by-side." },
      { title: "Geo-Targeted Audits", icon: "globe", desc: "Scrape campaign variations deployed by rivals in specific states or countries." },
      { title: "Active Signup Scanning", icon: "activity", desc: "Detect and log newly introduced welcome offers within minutes of launching." }
    ]
  },
  {
    slug: "features/competitor-positioning.html",
    name: "Positioning",
    fullName: "Competitor Positioning",
    kicker: "Competitor Core",
    lede: "Analyze rival market claims, value propositions, and unique landing page positioning hooks.",
    manifesto: "Identify how competitors differentiate themselves. Jurnii continuously maps promotional angles to highlight underserved positioning opportunities in sports and casino markets.",
    capabilities: [
      { title: "Value Claim Analysis", icon: "award", desc: "Extract and catalog all competitor commercial value propositions automatically." },
      { title: "Differentiated Angles", icon: "compass", desc: "Spot voids in rival messaging strategies to launch highly unique counter-campaigns." },
      { title: "Competitive Matrix", icon: "layers", desc: "Graph active brands based on pricing, premium aesthetics, and user friendliness." }
    ]
  },
  {
    slug: "features/competitor-comparison.html",
    name: "Comparison",
    fullName: "Competitor Comparison",
    kicker: "Competitor Core",
    lede: "Compare player acquisition pathways, sign-up structures, and deposit requirements side-by-side.",
    manifesto: "Run detailed mathematical comparisons. Calibrate your operator margins by evaluating wagering rules and bonus depth directly against major regional operators.",
    capabilities: [
      { title: "Side-by-Side Scoring", icon: "git-compare", desc: "Evaluate registration and KYC pipelines against three chosen rivals simultaneously." },
      { title: "Bonus Calibration", icon: "gift", desc: "Compare wagering multipliers and free spin richness across target categories." },
      { title: "Friction Auditing", icon: "filter", desc: "Compare click counts and page load delays across rival checkout checkouts." }
    ]
  },
  {
    slug: "features/competitor-analysis.html",
    name: "Analysis",
    fullName: "Competitor Analysis",
    kicker: "Competitor Core",
    lede: "Synthesize large-scale competitor marketing moves, promotional patterns, and timing frameworks.",
    manifesto: "Uncover competitor playbooks. Synthesize months of campaign data to identify launch frequencies, product milestones, and strategic market timing.",
    capabilities: [
      { title: "Historical Sequencing", icon: "calendar", desc: "Chart historical campaign durations to anticipate competitor marketing pushes." },
      { title: "Margin Calibration", icon: "trending-up", desc: "Analyze average bonus payout metrics to benchmark your net yield efficiency." },
      { title: "Executive Summaries", icon: "file-text", desc: "Produce board-ready competitive profiles and market shares in single clicks." }
    ]
  },
  {
    slug: "features/competitor-offer-feed.html",
    name: "Offer Feed",
    fullName: "Competitor Offer Feed",
    kicker: "Competitor Feed",
    lede: "Access continuous, structured data streams of active competitor promotional campaign terms.",
    manifesto: "Transform promotions into machine-readable data. Feed structured competitor promotion files directly into local modeling systems, pricing algorithms, or internal dashboards.",
    capabilities: [
      { title: "Structured API Access", icon: "database", desc: "Feed clean competitor offer JSON data directly into your CRM or player platforms." },
      { title: "Historical Archive", icon: "archive", desc: "Access comprehensive records of expired competitor promos to research holiday trends." },
      { title: "Wagering Decoders", icon: "code", desc: "Automatically translate complex bonus terms and conditions into clean data rows." }
    ]
  },
  {
    slug: "features/competitor-live-feed.html",
    name: "Live Feed",
    fullName: "Competitor Live Feed",
    kicker: "Competitor Feed",
    lede: "Monitor real-time product updates, page modifications, and creative updates.",
    manifesto: "Stay continuously connected to rival movements. Monitor live landing page visual edits and copywriting adjustments as they happen across multi-brand operators.",
    capabilities: [
      { title: "Visual Shift Tracking", icon: "eye", desc: "Detect visual interface alterations and structural design adjustments on competitive pages." },
      { title: "Real-time Scrapers", icon: "refresh-cw", desc: "Run continuous server-side monitors to detect active page changes and pricing models." },
      { title: "Changelog Reporting", icon: "clipboard", desc: "Compile daily logs detailing rival feature introductions and navigation shifts." }
    ]
  },
  {
    slug: "features/competitor-alerts.html",
    name: "Alerts",
    fullName: "Competitor Alerts",
    kicker: "Competitor Feed",
    lede: "Receive instant notifications when competitors launch new offers, adjust rates, or shift copy.",
    manifesto: "React instantly to market events. Receive direct slack or web notifications the exact moment a competitor adjustments their registration, deposit, or retention bonuses.",
    capabilities: [
      { title: "Multi-channel Alerts", icon: "bell", desc: "Configure custom push alerts via Slack, Teams, email, or webhook interfaces." },
      { title: "Bonus Shift Detection", icon: "sliders", desc: "Trigger notifications only when wagering terms or deposit percentages shift." },
      { title: "Custom Thresholds", icon: "percent", desc: "Define triggers based on maximum bonus values or promotional payout richness." }
    ]
  },
  {
    slug: "features/competitor-ai-insights.html",
    name: "AI Insights",
    fullName: "Competitor AI Insights",
    kicker: "Competitor Feed",
    lede: "Deploy advanced ML models to predict competitor marketing pushes and summarize campaign angles.",
    manifesto: "Gain predictive foresight. Leverage specialized neural nets to summarize massive campaign databases and predict rival product timing and advertising strategies.",
    capabilities: [
      { title: "Timing Prediction", icon: "brain", desc: "Anticipate rival marketing deployments using deep temporal predictive models." },
      { title: "Ad Copy Summaries", icon: "message-square", desc: "Utilize natural language processing to isolate winning copywriting hooks and angles." },
      { title: "Anomaly Spotting", icon: "alert-circle", desc: "Flag unusual competitor acquisition spikes and highly non-standard bonus structures." }
    ]
  },
  {
    slug: "features/brand-meta-scoring.html",
    name: "Meta Scoring",
    fullName: "Brand Meta Scoring",
    kicker: "Brand Core",
    lede: "Evaluate and aggregate overall user experience, visual quality, and compliance metrics into unified scores.",
    manifesto: "Establish a single metric for design. Aggregate visual, usability, speed, and onboarding indicators to score your brand portfolios side-by-side with global peers.",
    capabilities: [
      { title: "Unified Visual Index", icon: "sparkles", desc: "Combine multiple UX vectors into a single, board-ready, authoritative brand grade." },
      { title: "Portfolio Scoring", icon: "layers", desc: "Score and compare internal sister brands and regional domains under one metric." },
      { title: "Executive Benchmark dashboards", icon: "bar-chart", desc: "Present high-fidelity design metrics directly to product and compliance leadership." }
    ]
  },
  {
    slug: "features/brand-market-trends.html",
    name: "Market Trends",
    fullName: "Brand Market Trends",
    kicker: "Brand Core",
    lede: "Benchmark industry design patterns, color systems, and interactive trends across major operators.",
    manifesto: "Adopt modern UX trends ahead of the competition. Track the evolution of gaming interfaces, dark mode styles, and betslip integrations across global markets.",
    capabilities: [
      { title: "Design System Mapping", icon: "palette", desc: "Identify color palettes, border styling, and grid layouts gaining traction." },
      { title: "Feature Adoption Rates", icon: "check-square", desc: "Measure how fast rival operators deploy new digital wallet or quick-bet features." },
      { title: "Global Shift analysis", icon: "globe", desc: "Review visual design trends in pioneering markets like Sweden, the UK, and Ontario." }
    ]
  },
  {
    slug: "features/brand-design-themes.html",
    name: "Design Themes",
    fullName: "Brand Design Themes",
    kicker: "Brand Core",
    lede: "Audit visual stylesheet systems, typography scale, and layout systems in use by rivals.",
    manifesto: "Standardize aesthetic measurements. Automatically catalog font families, button border-radius systems, and visual padding to understand contemporary iGaming design standards.",
    capabilities: [
      { title: "Style Sheet Scraping", icon: "code", desc: "Scrape and log CSS variables, layout spacing, and visual styling properties." },
      { title: "Typography Analysis", icon: "type", desc: "Audit visual reading levels, typography hierarchy, and reading ease across player flows." },
      { title: "Theme Comparison Matrix", icon: "columns", desc: "Map brands across minimalist layouts, hyper-promotional patterns, or gaming UI." }
    ]
  },
  {
    slug: "features/brand-promotion-analysis.html",
    name: "Promotion Analysis",
    fullName: "Brand Promotion Analysis",
    kicker: "Brand Core",
    lede: "Correlate promotional structures and wagering richness to visual placement and layout design.",
    manifesto: "Optimize landing page conversion. Correlate promotional bonus richness directly with structural design, banner sizes, and copywriting placement to maximize player registration yields.",
    capabilities: [
      { title: "Copywriting Optimization", icon: "edit-3", desc: "Correlate signup yields against headline text lengths and deposit button positions." },
      { title: "Banner Size Audits", icon: "layout", desc: "Measure how visual real estate allocation influences player conversion success." },
      { title: "Creative Performance logs", icon: "activity", desc: "Map historical banner deployments against promotional click-through indicators." }
    ]
  },
  {
    slug: "features/brand-perfomance.html",
    name: "Perfomance",
    fullName: "Brand Perfomance",
    kicker: "Brand Performance",
    lede: "Measure actual page loading metrics, core web vitals, and asset performance dynamically.",
    manifesto: "Eliminate latency before player abandonment. Measure and track core web vitals and mobile connection delays under simulated network loads directly against rivals.",
    capabilities: [
      { title: "Core Web Vitals Auditing", icon: "zap", desc: "Track LCP, FID, and CLS scores dynamically under low-bandwidth mobile settings." },
      { title: "Asset Size Monitoring", icon: "hard-drive", desc: "Monitor script file sizes, media weights, and styling assets for conversion optimization." },
      { title: "Competitive Speed Index", icon: "gauge", desc: "Rank operator checkout speed side-by-side with national industry competitors." }
    ]
  },
  {
    slug: "features/brand-usability.html",
    name: "Usability",
    fullName: "Brand Usability",
    kicker: "Brand Performance",
    lede: "Run exhaustive heuristic user experience evaluations on key player onboarding pathways.",
    manifesto: "Evaluate ease-of-use with mathematical objectivity. Identify friction points in sports betting checkout, payment selection, and document upload stages.",
    capabilities: [
      { title: "Heuristic Frameworks", icon: "check-circle", desc: "Evaluate experience against 12 core onboarding design criteria systematically." },
      { title: "Cognitive Load Evaluation", icon: "activity", desc: "Spot redundant form fields and interactive elements causing checkout leakage." },
      { title: "Error Recovery Audits", icon: "alert-triangle", desc: "Analyze validation prompts and error feedback systems across player signups." }
    ]
  },
  {
    slug: "features/brand-preception.html",
    name: "Preception",
    fullName: "Brand Preception",
    kicker: "Brand Performance",
    lede: "Audit customer trust, security signals, and visual safety perceptions across key pipelines.",
    manifesto: "Enhance onboarding security confidence. Audit regulatory badges, terms visibility, and data privacy styling elements to maximize player signup success.",
    capabilities: [
      { title: "Trust Signals Scraping", icon: "shield-check", desc: "Log compliance logos, ssl indicators, and payout certifications across landing zones." },
      { title: "Security Styling Audits", icon: "lock", desc: "Optimize password forms, terms checkboxes, and account verification panels." },
      { title: "Visual Safety Rankings", icon: "eye", desc: "Grade player onboarding trust perceptions side-by-side with premier operator portals." }
    ]
  },
  {
    slug: "features/brand-recommendations.html",
    name: "Recommendations",
    fullName: "Brand Recommendations",
    kicker: "Brand Performance",
    lede: "Obtain automated, high-fidelity actionable suggestions to address UX deficiencies and outpace rivals.",
    manifesto: "Receive immediate development blueprints. Access step-by-step UI adjustments to resolve identified friction leaks and outpace adjacent operator competitors.",
    capabilities: [
      { title: "Actionable Sprints", icon: "clipboard-list", desc: "Obtain clean development task checklists to address identified user onboarding leaks." },
      { title: "Visual Reference Cards", icon: "image", desc: "Match recommended UI corrections to verified industry-leading interface layouts." },
      { title: "Yield Impact Mapping", icon: "dollar-sign", desc: "Prioritize design updates based on estimated player conversion and acquisition impact." }
    ]
  }
];

const solutionsData = [
  {
    slug: "solutions/competition-discovery.html",
    name: "Discovery",
    fullName: "Competition Discovery",
    kicker: "Competition",
    lede: "Identify emerging operators and new brand launches entering your target jurisdictions automatically.",
    manifesto: "Maintain total market awareness. Jurnii continuously maps regional operators, tracking fresh multi-brand conglomerates and boutique platforms before they claim market share.",
    capabilities: [
      { title: "Operator Mapping", icon: "map", desc: "Map active gaming and casino sites inside regulated regional boundaries." },
      { title: "New Entrant Alerts", icon: "alert-circle", desc: "Receive immediate notifications the moment a new brand launches welcome offers in your region." },
      { title: "Jurisdictional Audits", icon: "globe", desc: "Audit regional operator saturation across Ontario, Sweden, UK, and emerging states." }
    ]
  },
  {
    slug: "solutions/competition-offers.html",
    name: "Offers",
    fullName: "Competition Offers",
    kicker: "Competition",
    lede: "Standardize competitor promotion tracking to continuously deploy winning acquisition campaigns.",
    manifesto: "Eliminate promotional speculation. Systematize tracking of deposit bonus percentages, spin counts, and sports betting boosts across your competitors.",
    capabilities: [
      { title: "Bonus Richness Index", icon: "gift", desc: "Standardize bonus yield calculations based on active wagering hurdles." },
      { title: "Ad Campaign Parsing", icon: "tag", desc: "Extract competitor banner messaging, creative headers, and copy hooks dynamically." },
      { title: "Holiday Trend Logs", icon: "calendar", desc: "Review competitor Christmas, World Cup, and Super Bowl promotional timelines." }
    ]
  },
  {
    slug: "solutions/competition-pricing.html",
    name: "Pricing",
    fullName: "Competition Pricing",
    kicker: "Competition",
    lede: "Calibrate player margins, deposit rules, and wagering requirements against real-time market data.",
    manifesto: "Protect operator margin while remaining highly competitive. Align welcome offers and player rewards with continuous, structured regional metrics.",
    capabilities: [
      { title: "Margin Defense Tools", icon: "dollar-sign", desc: "Prevent margin erosion by tracking minimum deposit and payout limits across competitors." },
      { title: "Wagering Calibrators", icon: "sliders", desc: "Model payout curves across different spin multipliers and sports wagering terms." },
      { title: "ROI Auditing Engine", icon: "activity", desc: "Audit rival affiliate rewards and player acquisition pipelines automatically." }
    ]
  },
  {
    slug: "solutions/competition-postitioning.html",
    name: "Postitioning",
    fullName: "Competition Postitioning",
    kicker: "Competition",
    lede: "Discover untapped marketing hooks and value claims by mapping rival operator positioning.",
    manifesto: "Differentiate with absolute precision. Isolate positioning angles left open by competitor marketing layouts to establish highly defensive campaigns.",
    capabilities: [
      { title: "Value Claim Maps", icon: "compass", desc: "Graph active brands based on core value propositions, speed, or bonus size." },
      { title: "Copywriting Auditing", icon: "file-text", desc: "Parse competitor landing page copy to identify dominant positioning themes." },
      { title: "Segment Expansion", icon: "crosshair", desc: "Target player personas ignored by slow-moving regional operators." }
    ]
  },
  {
    slug: "solutions/user-interface-benchmarking.html",
    name: "User Interface",
    fullName: "User Interface Benchmarking",
    kicker: "Benchmarking",
    lede: "Grade aesthetic layouts, grid structure, and visual clarity against leading global operators.",
    manifesto: "Establish visual excellence without subjective debates. Benchmark stylesheet setups, typographic layouts, and visual real estate side-by-side with global peers.",
    capabilities: [
      { title: "Aesthetic Scoring", icon: "layout", desc: "Grade interface quality, layout spacing, and grid balance using structural analysis." },
      { title: "Design System Logs", icon: "palette", desc: "Scrape and archive rival typographic scales, border systems, and color systems." },
      { title: "Contrast Integrity Checks", icon: "eye", desc: "Assert readability and styling accessibility requirements across player flows." }
    ]
  },
  {
    slug: "solutions/user-experience-benchmarking.html",
    name: "User Experience",
    fullName: "User Experience Benchmarking",
    kicker: "Benchmarking",
    lede: "Automate user flow assessments across core player registration, verification, and deposit funnels.",
    manifesto: "Calibrate player friction objectively. Replace sluggish, manual usability audits with automated heuristic evaluation of your key transactional pathways.",
    capabilities: [
      { title: "Heuristic Benchmarks", icon: "smile", desc: "Benchmark player flows against 12 core onboarding design principles." },
      { title: "Cognitive Fatigue Audits", icon: "zap", desc: "Isolate interaction points causing player dropoffs during signup." },
      { title: "Onboarding Flow Scores", icon: "route", desc: "Grade transaction flow paths against leading global sportsbooks." }
    ]
  },
  {
    slug: "solutions/customer-journey-benchmarking.html",
    name: "Customer Journey",
    fullName: "Customer Journey Benchmarking",
    kicker: "Benchmarking",
    lede: "Visualize player transition states and identify interaction friction points in high-value checkouts.",
    manifesto: "Optimize the path to first bet. Map complete player progression pathways from landing page to successful deposit to repair leakage funnels.",
    capabilities: [
      { title: "Transition State Maps", icon: "milestone", desc: "Model user progress through verification (KYC), wallet selection, and checkouts." },
      { title: "Friction Point Logs", icon: "alert-triangle", desc: "Flag redundant form entries, laggy inputs, and validation obstacles." },
      { title: "Dropoff Analytics", icon: "filter", desc: "Track where high-value customers abandon onboarding steps." }
    ]
  },
  {
    slug: "solutions/market-positioning-benchmarking.html",
    name: "Market Positioning",
    fullName: "Market Positioning Benchmarking",
    kicker: "Benchmarking",
    lede: "Quantify design quality and promotional value to identify regional market growth opportunities.",
    manifesto: "Secure regional market share. Map your portfolio's visual UX grade and bonus structures against target competitors to identify strategic regional growth zones.",
    capabilities: [
      { title: "Regional Strategy Matrix", icon: "globe", desc: "Map competitor strength and design grades across target states and countries." },
      { title: "Market Gaps Detection", icon: "plus-circle", desc: "Spot underserved visual preferences or promotional voids in target regions." },
      { title: "Competitor Strength index", icon: "shield", desc: "Identify highly entrenched operators to refine acquisition spend strategies." }
    ]
  },
  {
    slug: "solutions/marketing-roi-attribution.html",
    name: "Marketing ROI",
    fullName: "Marketing ROI Attribution",
    kicker: "Attribution",
    lede: "Correlate marketing yield directly with competitor promotions and onboarding design changes.",
    manifesto: "Isolate true campaign impact. Determine how competitor deposit boosts and copywriting pivots influence your regional acquisition yield and CPA rates.",
    capabilities: [
      { title: "CPA Correlation Engine", icon: "pie-chart", desc: "Correlate customer acquisition cost fluctuations against competitor campaign shifts." },
      { title: "Promo Richness Modeling", icon: "gift", desc: "Measure player acquisition yields against rival bonus and wagering conditions." },
      { title: "Yield Protection Planning", icon: "shield", desc: "Refine campaign budgets when competitor promo richness spikes." }
    ]
  },
  {
    slug: "solutions/cross-channel-attribution.html",
    name: "Cross-Channel",
    fullName: "Cross-Channel Attribution",
    kicker: "Attribution",
    lede: "Model competitor campaign impacts across digital programmatic, social, and search channels.",
    manifesto: "Gain complete cross-channel foresight. Map competitor campaign footprints to understand where acquisition spend is most defensive and high-yielding.",
    capabilities: [
      { title: "Channel Footprint Analysis", icon: "split", desc: "Map competitor campaign footprints across programmatic, search, and social." },
      { title: "Spend Efficiency audits", icon: "dollar-sign", desc: "Identify channels where rival promo richness is driving customer acquisition spikes." },
      { title: "Defensive Budgeting", icon: "sliders", desc: "Calibrate cross-channel spend strategies based on real-time competitor campaign shifts." }
    ]
  },
  {
    slug: "solutions/marketing-mix-modeling-attribution.html",
    name: "Marketing Mix Modeling",
    fullName: "Marketing Mix Modeling Attribution",
    kicker: "Attribution",
    lede: "Feed structured, clean competitor promotional metrics directly into local analytics data warehouses.",
    manifesto: "Build automated, data-driven marketing models. Streamline competitor promotional tracking data to feed custom predictive models and yield optimization boards.",
    capabilities: [
      { title: "Structured Data Pipes", icon: "database", desc: "Export competitor campaign histories via automated JSON or CSV feeds." },
      { title: "Predictive Spend Engines", icon: "bar-chart-3", desc: "Model acquisition yields based on historical regional competitor promo patterns." },
      { title: "Cortex API Integration", icon: "network", desc: "Synchronize local player analytics databases with comprehensive competitor datasets." }
    ]
  },
  {
    slug: "solutions/market-growth-attribution.html",
    name: "Market Growth",
    fullName: "Market Growth Attribution",
    kicker: "Attribution",
    lede: "Attribute regional user acquisition and market share gains to visual design updates.",
    manifesto: "Prove design return on investment. Quantify how resolved player journey friction directly translates into market share gains and user onboarding yields.",
    capabilities: [
      { title: "UX ROI Attribution", icon: "trending-up", desc: "Correlate design system improvements directly with customer onboarding rates." },
      { title: "Regional Growth logs", icon: "globe", desc: "Audit market share growth following targeted usability and visual refinement sprints." },
      { title: "Executive Yield Summaries", icon: "award", desc: "Present structured design and commercial conversion correlations directly to product leadership." }
    ]
  },
  {
    slug: "solutions/conversion-rate-optimization.html",
    name: "Conversion Rate",
    fullName: "Conversion Rate Optimization",
    kicker: "Optimization",
    lede: "Isolate and repair player conversion leaks inside high-security registration and deposit funnels.",
    manifesto: "Maximize player signup yields. Calibrate checkout fields, security badges, and layout aesthetics to minimize abandonment and accelerate active conversions.",
    capabilities: [
      { title: "Friction Minimization", icon: "percent", desc: "Isolate and remove fields causing player dropoffs during verification." },
      { title: "Checkout Redesigns", icon: "layout", desc: "Adopt verified, high-converting checkout grids and deposit button configurations." },
      { title: "A/B Benchmark Sprints", icon: "check-circle", desc: "Validate interface revisions directly against leading sportsbook portals." }
    ]
  },
  {
    slug: "solutions/life-time-value-optimization.html",
    name: "Life Time Value",
    fullName: "Life Time Value Optimization",
    kicker: "Optimization",
    lede: "Boost player loyalty and retention by auditing layout usability and visual experience.",
    manifesto: "Protect customer lifetime value. Audit post-login betting boards, loyalty perks UI, and deposit ease to build deep visual trust and engagement.",
    capabilities: [
      { title: "Retention Audits", icon: "heart", desc: "Isolate usability friction points causing player churn post-registration." },
      { title: "Loyalty UI Evaluation", icon: "award", desc: "Optimize presentation of player clubs, loyalty milestones, and reward claims." },
      { title: "Engagement Logs", icon: "activity", desc: "Monitor betslip usability and payout speed parameters systematically." }
    ]
  },
  {
    slug: "solutions/churn-rate-optimization.html",
    name: "Churn Rate",
    fullName: "Churn Rate Optimization",
    kicker: "Optimization",
    lede: "Identify and prevent customer loss by analyzing competitor promotions and onboarding updates.",
    manifesto: "Combat player churn proactively. Track competitor retention campaigns and usability enhancements that are pulling players away from your platform.",
    capabilities: [
      { title: "Competitor Move Warnings", icon: "user-minus", desc: "Receive alerts when rivals introduce high-richness loyalty promos in your region." },
      { title: "Product Gap Analysis", icon: "plus-circle", desc: "Isolate product features rivals are deploying to secure active customer retention." },
      { title: "Margin Calibration sprints", icon: "sliders", desc: "Re-calibrate payout metrics to protect yields when competitor churn triggers spike." }
    ]
  },
  {
    slug: "solutions/customer-aquistion-cost-optimization.html",
    name: "Customer Aquistion Cost",
    fullName: "Customer Aquistion Cost Optimization",
    kicker: "Optimization",
    lede: "Decrease player acquisition costs by resolving player onboarding friction and optimizing layouts.",
    manifesto: "Achieve acquisition efficiency. Lower overall customer acquisition cost by securing registration pathways and optimizing welcome offer layouts using data-backed designs.",
    capabilities: [
      { title: "CPA Reduction Engine", icon: "shopping-bag", desc: "Correlate resolved player journey friction directly with reduced marketing CPA." },
      { title: "Welcome Page Optimization", icon: "layout", desc: "Refine landing zone layouts, button spacing, and trust badges systematically." },
      { title: "Promo Calibrators", icon: "sliders", desc: "Deploy ideal signup bonuses and wagering rules calculated to lower customer CAC." }
    ]
  }
];

function getPageHTML(metaTitle, metaDesc, kicker, title, lede, manifesto, capabilities, levelPrefix, isFeature) {
  const typeLabel = isFeature ? "Feature" : "Solution";
  const parentName = isFeature ? "Features" : "Solutions";
  const parentSlug = isFeature ? "features" : "solutions";
  const sectionHead = isFeature ? "How Jurnii Solves This" : "Strategic Capabilities";
  
  return `<!doctype html>
<html data-theme="light" lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${metaTitle} — Jurnii ${parentName}</title>
  <meta name="description" content="${metaDesc}">
  <link rel="icon" href="${levelPrefix}assets/jurnii-icon-light.svg">
  <link rel="stylesheet" href="${levelPrefix}assets/site.css">
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
</head>
<body>

  <!-- Navigation (Populated by script) -->
  <nav class="nav">
    <div class="container nav-inner">
      <div class="nav-brand">
        <a href="${levelPrefix}index.html"><img src="${levelPrefix}assets/jurnii-dark-full.svg" alt="Jurnii Logo" class="logo-light"></a>
      </div>
      <div class="nav-links">
        <!-- Temporary placeholder to be filled by update_nav.js -->
      </div>
    </div>
  </nav>

  <main>
    <!-- Premium Landing Page Hero -->
    <section class="feature-hero" style="background: linear-gradient(180deg, var(--jurnii-50) 0%, transparent 100%); padding: 100px 0 80px;">
      <div class="container feature-hero-grid" style="max-width: 1100px;">
        <div class="feature-hero-copy">
          <p class="feature-hero-kicker" style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 12px 0;">${kicker}</p>
          <h1 class="h1-page" style="font-size: 48px; font-weight: 800; letter-spacing: -0.03em; margin: 0 0 20px 0; color: var(--foreground);">${title}</h1>
          <p class="page-hero-lede" style="font-size: 19px; color: var(--muted-foreground); line-height: 1.6; max-width: 720px; margin: 0;">${lede}</p>
          <div class="cta-row" style="margin-top: 36px;">
            <a href="#" class="btn primary">View Live Demo</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Manifesto & Context -->
    <section class="feature-manifesto" id="details" style="padding: 60px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--card);">
      <div class="container" style="max-width: 900px; text-align: center;">
        <p style="font-size: 20px; font-weight: 500; line-height: 1.7; color: var(--foreground); margin: 0; font-family: var(--font-sans);">${manifesto}</p>
      </div>
    </section>

    <!-- Capability Cards Section -->
    <section class="feature-capability-section theme-dark" style="padding: 100px 0; background: #252c1e; color: #fff;">
      <div class="container" style="max-width: 1100px;">
        <div class="section-head" style="margin-bottom: 56px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 24px;">
          <h2 class="h2-section" style="font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin: 0 0 12px 0;">${sectionHead}</h2>
          <p style="font-size: 16px; color: rgba(255,255,255,0.7); max-width: 600px; margin: 0;">Objective tools designed to replace speculation with verified competitive data.</p>
        </div>
        <div class="feature-capability-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;">
          ${capabilities.map(c => `
          <div class="feature-capability-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 32px; transition: transform 180ms ease;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(148,255,150,0.15); color: var(--jurnii-400); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <i data-lucide="${c.icon}" style="width: 22px; height: 22px;"></i>
            </div>
            <h3 style="font-size: 19px; font-weight: 700; color: #fff; margin: 0 0 12px 0;">${c.title}</h3>
            <p style="font-size: 14.5px; color: rgba(255,255,255,0.65); line-height: 1.6; margin: 0;">${c.desc}</p>
          </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Unified Ecosystem Connections -->
    <section class="ecosystem-section" style="padding: 100px 0; background: var(--background);">
      <div class="container" style="max-width: 1100px;">
        <div class="ecosystem-header" style="margin-bottom: 56px;">
          <h2 class="h2-section" style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 12px 0;">Intelligence Integrations</h2>
          <p style="font-size: 16px; color: var(--muted-foreground); margin: 0;">Jurnii operates as a single unified system, feeding data seamlessly across your tech stacks.</p>
        </div>
        <div class="ecosystem-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
          
          <div class="ecosystem-column">
            <h3 class="col-label" style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--jurnii-600); border-bottom: 1px solid var(--border); padding-bottom: 8px; margin: 0 0 16px 0;">Related Products</h3>
            <div class="feature-link-grid" style="display:flex; flex-direction:column; gap:12px;">
              <a href="${levelPrefix}products/jurnii-ux.html" class="feature-link-card product" style="display:block; text-decoration:none; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px;">
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--foreground); margin:0 0 8px 0;">Jurnii UX</h4>
                <p style="font-size: 12px; color: var(--muted-foreground); line-height:1.4; margin:0;">Automated usability and visual scoring.</p>
              </a>
              <a href="${levelPrefix}products/cortex.html" class="feature-link-card product" style="display:block; text-decoration:none; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px;">
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--foreground); margin:0 0 8px 0;">Cortex</h4>
                <p style="font-size: 12px; color: var(--muted-foreground); line-height:1.4; margin:0;">Causal attribution and planning mix.</p>
              </a>
            </div>
          </div>

          <div class="ecosystem-column">
            <h3 class="col-label" style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--jurnii-600); border-bottom: 1px solid var(--border); padding-bottom: 8px; margin: 0 0 16px 0;">Core Features</h3>
            <div class="feature-link-grid" style="display:flex; flex-direction:column; gap:12px;">
              <a href="${levelPrefix}features/competitor-promotions.html" class="feature-link-card related" style="display:block; text-decoration:none; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px;">
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--foreground); margin:0 0 8px 0;">Promotions</h4>
                <p style="font-size: 12px; color: var(--muted-foreground); line-height:1.4; margin:0;">Automated promotional campaign tracking.</p>
              </a>
              <a href="${levelPrefix}features/brand-usability.html" class="feature-link-card related" style="display:block; text-decoration:none; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px;">
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--foreground); margin:0 0 8px 0;">Usability</h4>
                <p style="font-size: 12px; color: var(--muted-foreground); line-height:1.4; margin:0;">Standardized heuristic usability auditing.</p>
              </a>
            </div>
          </div>

          <div class="ecosystem-column">
            <h3 class="col-label" style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--jurnii-600); border-bottom: 1px solid var(--border); padding-bottom: 8px; margin: 0 0 16px 0;">Outcomes</h3>
            <div class="feature-link-grid" style="display:flex; flex-direction:column; gap:12px;">
              <a href="${levelPrefix}solutions/user-experience-benchmarking.html" class="feature-link-card solution" style="display:block; text-decoration:none; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px;">
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--foreground); margin:0 0 8px 0;">UX Benchmarking</h4>
                <p style="font-size: 12px; color: var(--muted-foreground); line-height:1.4; margin:0;">Heuristics-based experience index scores.</p>
              </a>
              <a href="${levelPrefix}solutions/competition-offers.html" class="feature-link-card solution" style="display:block; text-decoration:none; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px;">
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--foreground); margin:0 0 8px 0;">Competitor Intel</h4>
                <p style="font-size: 12px; color: var(--muted-foreground); line-height:1.4; margin:0;">Continuous surveillance of competitor campaigns.</p>
              </a>
            </div>
          </div>

          <div class="ecosystem-column">
            <h3 class="col-label" style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--jurnii-600); border-bottom: 1px solid var(--border); padding-bottom: 8px; margin: 0 0 16px 0;">Built For</h3>
            <div class="feature-link-grid" style="display:flex; flex-direction:column; gap:12px;">
              <a href="${levelPrefix}use-cases/roles/cmo.html" class="feature-link-card persona" style="display:block; text-decoration:none; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px;">
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--foreground); margin:0 0 8px 0;">CMO</h4>
                <p style="font-size: 12px; color: var(--muted-foreground); line-height:1.4; margin:0;">Growth strategy and campaigns ROI.</p>
              </a>
              <a href="${levelPrefix}use-cases/roles/cco.html" class="feature-link-card persona" style="display:block; text-decoration:none; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px;">
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--foreground); margin:0 0 8px 0;">CCO</h4>
                <p style="font-size: 12px; color: var(--muted-foreground); line-height:1.4; margin:0;">Margin defense and LTV protection.</p>
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  </main>

  <!-- Footer (Populated by script) -->
  <footer class="footer">
    <div class="container">
      <!-- Footer details injected by update_footer.js -->
    </div>
  </footer>

  <script>
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  </script>
</body>
</html>`;
}

// Generate the feature pages
featuresData.forEach(item => {
  const itemFilePath = path.join(root, item.slug);
  ensureDirectoryExistence(itemFilePath);
  const html = getPageHTML(item.fullName, item.lede, item.kicker, item.fullName, item.lede, item.manifesto, item.capabilities, '../', true);
  fs.writeFileSync(itemFilePath, html, 'utf8');
  console.log('Generated Feature LP:', item.slug);
});

// Generate the solution pages
solutionsData.forEach(item => {
  const itemFilePath = path.join(root, item.slug);
  ensureDirectoryExistence(itemFilePath);
  const html = getPageHTML(item.fullName, item.lede, item.kicker, item.fullName, item.lede, item.manifesto, item.capabilities, '../', false);
  fs.writeFileSync(itemFilePath, html, 'utf8');
  console.log('Generated Solution LP:', item.slug);
});

console.log('Successfully generated all 32 new features and solutions pages!');
