const fs = require('fs');
const path = require('path');

const root = process.cwd();

// Complete, rich, professional use case ontology and copy database
const useCasesData = {
  roles: {
    title: "Roles",
    slug: "use-cases/roles.html",
    description: "Align critical commercial, operational, and marketing leaders around single-source market facts.",
    kicker: "Executive Personas",
    imageClass: "roles-bg",
    items: [
      {
        id: "cmo",
        name: "CMO",
        fullName: "Chief Marketing Officer",
        slug: "use-cases/roles/cmo.html",
        kicker: "Growth Attribution",
        lede: "Eliminate last-click attribution leaks, isolate campaign incrementality, and align media mix budgets with Jurnii 360 competitive intelligence and Cortex causal modeling.",
        manifesto: "Jurnii ingests competitor promotions and ad copy in real-time, giving Chief Marketing Officers the objective intelligence needed to maximize acquisition efficiency, defend market share, and justify marketing investment strategies to the board. By feeding real-time competitor promo data directly into Media Mix Modeling (MMM) frameworks, CMOs can transform raw competitive copy into predictive intelligence that powers ROAS.",
        challenge: "CMOs must defend market share and allocate budgets in highly competitive jurisdictions where player multi-homing rates reach 70–80%. Saturated paid search and programmatic channels lead to astronomical CPAs that erode campaign ROI. Relying on outdated, last-click attribution models masks the true causal impact of competitor promo shifts, causing marketers to chase ghost conversions while competitor wagering adjustments capture player loyalty silently. Without live visibility, CRM teams duplicate rival promotions reactively, risking severe margin dilution.",
        mechanics: "Jurnii 360 tracks 100% of competitor moves automatically, cataloging over 1,000 active campaigns weekly. Cortex ingests competitor promotions data from Jurnii 360 across 21 feature areas and integrates them into causal models. This eliminates last-click attribution leaks and isolates the true incremental lift of programmatic and search spends against competitor actions. It allows CMOs to calibrate acquisition thresholds, predict churn, and model competitor campaign reactiveness across 35 markets monitored simultaneously.",
        proofText: "Cortex verified +46% campaign yield and true marketing ROAS lift, validating performance on a real-world $17.1M budget, surfacing $4.85M in savings.",
        targetPersona: "Chief Marketing Officers deploy Jurnii positioning maps and Cortex modeling to optimize media mix budgets and validate spend efficiency.",
        capabilities: [
          { title: "Attribution Modelling", icon: "network", desc: "Isolate true incremental campaign yield and eliminate last-click attribution leaks by feeding competitor promotional data directly into causal Media Mix Modeling." },
          { title: "Creative Analytics", icon: "megaphone", desc: "Monitor competitor banner messaging, active creative hooks, and positioning shifts instantly across 35 markets monitored simultaneously." },
          { title: "Promo Benchmarking", icon: "award", desc: "Analyze rival welcome bonus structures, sports odds boosts, and wagering hurdles systematically using the Promo Richness Index." }
        ]
      },
      {
        id: "coo",
        name: "COO",
        fullName: "Chief Operating Officer",
        slug: "use-cases/roles/coo.html",
        kicker: "Operational Excellence",
        lede: "Accelerate product development cycles, eliminate player onboarding friction, and align cross-functional engineering and product pipelines with Jurnii UX automated scoring.",
        manifesto: "Operations leaders deploy Jurnii to align product, engineering, and marketing pipelines around objective usability indicators, eliminating manual competitive auditing and accelerating sprint impact. By establishing a single-source-of-truth usability database across scaling teams, COOs can bypass B2B vendor platform constraints and drive evidence-based development cycles that protect operator margins.",
        challenge: "Cross-functional hand-offs between product, marketing, and trading teams are slowed by opinion-driven disagreements and manual auditing workflows that waste 30+ hours per week. Operational friction is compounded when operators enter new regulated markets or undergo platform migrations. Subtle user interface drop-offs during KYC verification and transaction deposit steps cause silent player abandonment that bleeds GGR, yet teams lack the structured metrics to prioritize the engineering roadmap.",
        mechanics: "Jurnii UX runs automated, server-side heuristic audits across four key UX dimensions, producing 70+ commercially weighted recommendations per audit. Jurnii normalizes competitor registration processes and deposit requirements, delivering ranked usability heuristics that isolate actual funnel bottlenecks. This allows operations to replace subjective opinion with verified digital facts and guide development cycles by conversion yield impact.",
        proofText: "Eliminate manual spreadsheet competitive auditing, saving 30+ hours per week while aligning sprints around 70+ ranked UX recommendations.",
        targetPersona: "Chief Operating Officers deploy Jurnii automated surveillance to align technical pipelines and eliminate conversion latency.",
        capabilities: [
          { title: "Process Automation", icon: "settings", desc: "Replace slow manual spreadsheet competitor audits with automated active data feeds and continuous heuristic scoring." },
          { title: "Friction Identification", icon: "alert-circle", desc: "Isolate and repair conversion leaks across high-value registration, document verification (KYC), and payment deposit pipelines." },
          { title: "Sprint Alignment", icon: "sliders", desc: "Map developmental sprint roadmaps directly to verified industry usability standards, ranking updates by revenue impact." }
        ]
      },
      {
        id: "cco",
        name: "CCO",
        fullName: "Chief Commercial Officer",
        slug: "use-cases/roles/cco.html",
        kicker: "Margin Defence",
        lede: "Protect EBITDA yields, calibrate promotional richness, and defend player lifetime value by systematically identifying conversion path leaks.",
        manifesto: "Commercial directors leverage Jurnii to protect yields, optimizing promotional richness and bonus wagering conditions based on continuous, automated market visibility. By bridging the gap between customer acquisition cost (CAC) and player lifetime value (LTV), Jurnii ensures commercial teams balance competitor positioning with strict margin preservation.",
        challenge: "CCOs are responsible for Net Gaming Revenue (NGR) and Gross Gaming Revenue (GGR), but player multi-homing rates of 70–80% make customer loyalty highly fragile. To prevent player churn, CRM teams reactively deploy over-generous player bonuses, resulting in severe CRM margin dilution. Without live, automated competitor offer tracking, commercial analysts spend hours compiling competitor welcome offers, leaving the operator blind to the Promo Richness Index of the market.",
        mechanics: "Jurnii 360's Promo Richness Index standardizes wagering rules and deposit incentives. This enables CCOs to calibrate margin thresholds, model competitor payout curves across verticals, and defend player lifetime value (LTV). Jurnii 360 tracks 100% of competitor promotion moves automatically, scraping over 1,000 active campaigns weekly to prevent margin erosion.",
        proofText: "Jurnii 360 tracks 100% of competitor promotion moves automatically, saving 30+ hours per week across CRM and commercial teams.",
        targetPersona: "Chief Commercial Officers leverage Jurnii promotions surveillance to balance customer acquisition generosity with strict yield safety.",
        capabilities: [
          { title: "Yield Optimisation", icon: "trending-up", desc: "Calibrate deposit matches and pricing richness against competitor bonus structures using the Promo Richness Index." },
          { title: "LTV Protection", icon: "heart", desc: "Prevent player churn before it starts by monitoring rival retention plays, active casino campaigns, and sportsbook boosts in real-time." },
          { title: "Leak Remediation", icon: "filter", desc: "Track and repair player progression leaks through high-value conversion funnels, registration steps, and withdrawal workflows." }
        ]
      }
    ]
  },
  companySizes: {
    title: "Company Size",
    slug: "use-cases/company-sizes.html",
    description: "Modular intelligence pipelines sized perfectly for emerging brands up to multi-brand conglomerates.",
    kicker: "Scaling Levels",
    imageClass: "sizes-bg",
    items: [
      {
        id: "smb",
        name: "SMB",
        fullName: "Small & Midsize Business",
        slug: "use-cases/company-sizes/smb.html",
        kicker: "Market Penetration",
        lede: "Scale player acquisition, secure regional market share, and compete directly with global conglomerates without enterprise-level overheads.",
        manifesto: "Jurnii delivers rapid, high-impact intelligence tailored for emerging brands, allowing fast-scaling challenger operators to compete directly with global conglomerates by acting on precise, localized market facts. By providing immediate competitive tracking, Jurnii enables boutique operators to capture high-value market voids and lower acquisition CPA.",
        challenge: "Squeezed by massive operator conglomerates, fast-growing challengers spend limited budgets copying market generics. Without clear competitive context, they miss micro-campaign opportunities, experience high player leakage, and struggle with high CPAs. Manual competitive auditing is impossible at their scale, while hiring expensive consulting agencies to benchmark their experience takes weeks they cannot afford.",
        mechanics: "Jurnii provides immediate, low-overhead competitor surveillance by tracking competitor welcome offers and usability states across target jurisdictions. Operators leverage Jurnii's global repository of 300+ brands analysed to identify welcome offer gaps, and deploy agile, highly targeted counter-campaigns that maximize every dollar spent on paid channels.",
        proofText: "Leverage Jurnii's repository of 300+ brands analysed to identify high-value market voids and lower acquisition CPA.",
        targetPersona: "Scaling Founders and C-Suite leaders at SMB operators use Jurnii's out-of-the-box dashboards to maintain parity without enterprise-level overheads.",
        capabilities: [
          { title: "Agile Positioning", icon: "zap", desc: "Exploit local market gaps, welcome offer voids, and creative messaging opportunities left open by slower competitor conglomerates." },
          { title: "Budget Efficiency", icon: "coins", desc: "Maximize limited marketing budgets by analyzing and refining winning regional promotional frameworks and bonus wagering thresholds." },
          { title: "Fast Implementation", icon: "check-circle", desc: "Access fully compiled competitor insights from day one, with zero complex database integrations or custom coding required." }
        ]
      },
      {
        id: "midmarket",
        name: "MidMarket",
        fullName: "Mid-Market Operators",
        slug: "use-cases/company-sizes/midmarket.html",
        kicker: "Scale & Expansion",
        lede: "Secure expansion margins, defend home territory, and expand aggressively across new regulated jurisdictions with structured market intelligence.",
        manifesto: "Mid-market operators utilize Jurnii to transition from regional player to national leader. By systematizing competitive tracking and aligning scaling executive teams around standardized indicators, growing operators can enter new jurisdictions with complete competitive visibility and locked-in acquisition margins.",
        challenge: "Scaling operators face high operational friction when entering new regulated markets (e.g., Ontario, Sweden, UK). Launching new brands or undergoing platform migrations creates immense UX drift and exposes player onboarding funnels to massive drop-offs. At this scale, teams become siloed; product managers ship features blindly without competitive context, while CRM teams copy rival promotions reactively, risking severe margin dilution.",
        mechanics: "Jurnii automates competitor journey indexing and promotion scraping in target jurisdictions, supplying structured UX scores and promo tracking data to guide expansion. By calibrating UX against Jurnii's global repository of 300+ brands analysed across 4 key UX dimensions, mid-market operators prevent funnel leakage and secure expansion margins.",
        proofText: "Align scaling product and CRM teams around a single-source-of-truth competitive database, saving 30+ hours per week.",
        targetPersona: "VP of Growth and Commercial Directors utilize Jurnii's regional maps to secure expansion margins and validate brand launches.",
        capabilities: [
          { title: "Jurisdictional Expansion", icon: "globe", desc: "Map player conversion loops, compliance terms, and local UX expectations across 35 markets monitored simultaneously." },
          { title: "Organizational Alignment", icon: "users", desc: "Establish a single-source-of-truth usability database across growing marketing, commercial, and product departments." },
          { title: "Attribution Scaling", icon: "pie-chart", desc: "Model campaign causal impacts and ROAS lift as marketing spend scales across diverse programmatic and search channels." }
        ]
      },
      {
        id: "enterprise",
        name: "Enterprise",
        fullName: "Enterprise Operators",
        slug: "use-cases/company-sizes/enterprise.html",
        kicker: "Market Domination",
        lede: "Benchmark multi-brand portfolios, streamline global compliance, and dominate major jurisdictions with a unified commercial intelligence layer.",
        manifesto: "For top-tier multi-brand operators, Jurnii serves as the central intelligence layer. We harmonize UX scoring and competitor campaign scraping across complex, highly-regulated international markets, streaming normalized, structured API data directly into enterprise data warehouses to enable automated multi-brand scoring and causal budget optimization.",
        challenge: "Multi-brand, multi-jurisdiction conglomerates operate in data siloes where boards are flooded with subjective design feedback and manual reporting. Squeezed by player multi-homing rates of 70–80% across 35 regulated markets, teams struggle to track 1,000+ weekly competitor offers, leading to last-click attribution leaks and massive CRM margin dilution.",
        mechanics: "Jurnii streams structured, continuous competitor data directly into enterprise data warehouses. Cortex causal engines process multi-million dollar budgets to isolate campaign incrementality and true ROAS. Simultaneously, Jurnii UX automates usability audits across all portfolio brands, delivering 70+ commercially weighted recommendations ranked by conversion yield impact.",
        proofText: "Cortex causal engines processed a $17.1M real-world budget, surfacing $4.85M in inefficiency savings and 3x performance validation.",
        targetPersona: "Enterprise Chief Executive Officers and Boards leverage Jurnii Meta Scores to manage brand portfolios and defend global EBITDA.",
        capabilities: [
          { title: "Multi-Brand Benchmarking", icon: "layers", desc: "Evaluate, rank, and grade your entire portfolio of brands side-by-side under a unified, commercially weighted metric system." },
          { title: "Regulatory Compliance", icon: "shield-check", desc: "Maintain automated audit trails of competitor promotional terms, active welcome bonuses, and creative copy changes." },
          { title: "Enterprise Data Pipes", icon: "database", desc: "Feed structured, continuous competitor promo and UX data directly into local MMM and analytics warehouses via robust APIs." }
        ]
      }
    ]
  },
  departments: {
    title: "Departments",
    slug: "use-cases/departments.html",
    description: "Align product, trading, and marketing teams around objective competitive indicators.",
    kicker: "Functional Teams",
    imageClass: "depts-bg",
    items: [
      {
        id: "marketing",
        name: "Marketing",
        fullName: "Marketing Department",
        slug: "use-cases/departments/marketing.html",
        kicker: "Growth Strategy",
        lede: "Increase acquisition yields, eliminate last-click attribution errors, and build highly defensible cross-channel budget plans based on market facts.",
        manifesto: "Eliminate subjectivity from marketing investments. Jurnii delivers the database, tracking, and attribution tools to optimize campaigns based on real-time competitor actions. By syncing continuous competitor promotional feeds with causal Media Mix Modeling, marketing teams can defend budgets and maximize acquisition efficiency.",
        challenge: "Marketing managers operate under blind CPA metrics. Last-click attribution fails to account for competitor sports boosts or casino wagering shifts, leading to bad budget allocations during peak sporting seasons. Saturated channels and player multi-homing rates of 70–80% make traditional marketing inefficient, while creative ad copywriting shifts go unnoticed.",
        mechanics: "Jurnii 360 parses and indexes competitor active banner creative, copy claims, and promo rich structures. This data is fed into Cortex to run causal modeling and marketing mix attribution, isolating the true incremental lift of programmatics and search spends against competitor actions and campaigns across 35 markets monitored simultaneously.",
        proofText: "Continuous automated tracking captures 1,000+ offers weekly, transforming raw competitive copy into predictive intelligence.",
        targetPersona: "Acquisition Heads and Media Buyers use Jurnii campaign timelines to optimize ad spends and improve paid media ROAS.",
        capabilities: [
          { title: "Campaign Scraping", icon: "tag", desc: "Track all competitor welcome offers, deposit matches, and free spins dynamically as soon as they go live." },
          { title: "Ad Creative Intel", icon: "image", desc: "Review competitor homepage banner placements, promotional sliders, and creative hooks across your competitive set." },
          { title: "Timing Optimization", icon: "calendar", desc: "Map historical competitor deployment patterns to schedule campaigns during peak commercial ROI windows." }
        ]
      },
      {
        id: "commercial",
        name: "Commercial",
        fullName: "Commercial Department",
        slug: "use-cases/departments/commercial.html",
        kicker: "Commercial Optimization",
        lede: "Calibrate pricing models, optimize promo richness, and defend Net Gaming Revenue from competitive dilution.",
        manifesto: "Commercial departments run on margins. Jurnii bridges the gap between player acquisition costs and gaming yields, supplying clear indices to evaluate pricing richness. By automating competitor offer tracking, commercial teams can optimize loyalty rewards without risking CRM margin dilution.",
        challenge: "Commercial teams struggle to balance player bonus incentives with net yield hold rates. Copying rival wagering thresholds by hand is slow, error-prone, and leads to margin erosion or sudden customer churn. Squeezed by player multi-homing rates of 70–80%, CRM teams duplicate rival promos reactively, causing severe margin dilution.",
        mechanics: "Jurnii models competitor payout curves across sports and casino verticals. Jurnii 360's Promo Richness Index standardizes wagering rules and deposit incentives. This enables commercial analysts to calibrate margin thresholds, protect NGR from competitive dilution, and optimize player lifetime value (LTV) across 35 markets monitored simultaneously.",
        proofText: "Normalizing promotion tracking across 35 markets saves 30+ hours of commercial analyst time every single week.",
        targetPersona: "Commercial Analysts and CRM Directors leverage Jurnii margin calibrators to deploy high-yield loyalty rewards.",
        capabilities: [
          { title: "Promo Richness Index", icon: "bar-chart-3", desc: "Standardize the mathematical cost and yield margin impact of competitor deposit matches and retention bonuses." },
          { title: "Churn Analytics", icon: "user-minus", desc: "Trace rival product changes and promotions causing high player leakage and multi-homing defection." },
          { title: "Revenue Auditing", icon: "activity", desc: "Identify conversion leaks and audits in affiliate reward structures, deposit funnels, and registration pathways." }
        ]
      },
      {
        id: "product",
        name: "Product",
        fullName: "Product Department",
        slug: "use-cases/departments/product.html",
        kicker: "Product Excellence",
        lede: "Drive product sprint success, optimize user conversion funnels, and automate competitive UX audits with objective usability heuristics.",
        manifesto: "Product managers utilize Jurnii to validate interface roadmaps. Base development sprints on objective heuristic rankings rather than ad-hoc specifications or subjective opinions. By automating user experience audits, product teams can bypass B2B platform constraints and build high-converting player journeys.",
        challenge: "Product roadmaps are plagued by internal opinions. Usability reviews are slow and expensive, while B2B vendor platform constraints force product managers to ship features blindly without competitive context. Subtle user interface drop-offs during KYC verification and transaction deposit steps cause silent player abandonment that bleeds GGR, yet teams lack the structured metrics to prioritize the engineering roadmap.",
        mechanics: "Jurnii UX delivers automated usability heuristics scoring across 4 key UX dimensions (registration, KYC verification, checkout, and account management). The platform generates 70+ commercially weighted recommendations per audit, ranking findings by revenue impact and allowing product teams to prioritize development cycles objectively.",
        proofText: "Jurnii UX audits deliver 70+ commercially weighted recommendations ranked by conversion yield impact in minutes.",
        targetPersona: "Chief Product Officers and Heads of UX deploy Jurnii heuristic scores to prioritize development cycles and outpace rival portals.",
        capabilities: [
          { title: "Heuristic UX Scoring", icon: "award", desc: "Automate user interface audits across core registration, verification, and deposit pipelines." },
          { title: "Journey Mapping", icon: "route", desc: "Visualize player navigation pathways, visual UX scores, and friction points objectively." },
          { title: "Benchmark Auditing", icon: "check-circle", desc: "Compare player journey speed and aesthetics side-by-side with 300+ global industry peers analysed." }
        ]
      }
    ]
  },
  sectors: {
    title: "Sectors",
    slug: "use-cases/sectors.html",
    description: "Deep, industry-specific heuristic scoring tailored to exact transactional conversion loops.",
    kicker: "Target Verticals",
    imageClass: "sectors-bg",
    items: [
      {
        id: "igaming",
        name: "iGaming",
        fullName: "iGaming Operators",
        slug: "use-cases/sectors/igaming.html",
        kicker: "iGaming Excellence",
        lede: "Automate player conversion, track competitive campaigns, and dominate highly regulated jurisdictions.",
        manifesto: "Jurnii is native to digital gaming, empowering sportsbooks, casinos, and lotteries with real-time visibility into competitor player UX, deposit bonuses, and marketing attribution. By analyzing competitor promotions and interface friction, Jurnii enables digital gaming operators to optimize net gaming yield and secure player conversions.",
        challenge: "iGaming operators face extreme competition where player multi-homing rates reach 70–80% (players holding 3–5 competitor accounts simultaneously). Saturated marketing channels, rising CPAs, tight compliance rules, and commoditized B2B platforms make acquisition highly difficult. Subtle friction during registration, deposit, or KYC verification steps causes immediate abandonment to rivals, while manual promotional tracking is impossible to scale.",
        mechanics: "Jurnii continuously monitors live casino and sportsbook onboarding pathways, tracking wagering hurdles and deposit multipliers dynamically. Jurnii 360's Promo Richness Index standardizes wagering rules across competitors, while Jurnii UX automates usability audits across registration, verification, and deposit funnels. This data feeds into Cortex for causal attribution, explaining ROAS lift against competitor movements.",
        proofText: "Scraping over 1,000 gaming promos weekly guarantees 100% visibility into target regulated markets and saves 30+ hours per week.",
        targetPersona: "Chief Executive Officers at sportsbooks and casinos deploy Jurnii to secure player conversions and optimize net gaming yield.",
        capabilities: [
          { title: "iGaming Heuristics", icon: "dices", desc: "Track gaming registration, document verification (KYC), deposit, and betslip usability across 300+ brands analysed." },
          { title: "Bonus Scraping", icon: "gift", desc: "Parse competitor sports boosts and casino promotions automatically as soon as they go live." },
          { title: "Compliance Tracking", icon: "globe", desc: "Keep tabs on competitor promotional terms, active wagering multipliers, and layouts globally." }
        ]
      },
      {
        id: "ecommerce",
        name: "eCommerce",
        fullName: "eCommerce Brands",
        slug: "use-cases/sectors/ecommerce.html",
        kicker: "Conversion Scaling",
        lede: "Maximize checkout conversions, audit transactional friction, and outpace competitor promotion strategies.",
        manifesto: "High-volume digital brands utilize Jurnii to map player purchase journeys, identify cart abandonment causes, and benchmark promotional campaign effectiveness. By translating visual layout errors and cognitive fatigue into ranked heuristic recommendations, Jurnii ensures eCommerce operators maximize transaction yields and customer lifetime value.",
        challenge: "eCommerce platforms suffer from severe cart abandonment at checkouts and payment gateway selections. Traditional analytics show *where* players drop off, but fail to explain the visual layout errors, confusing input validation messages, or pricing friction causing cognitive fatigue. Teams spend days debating design updates without objective data, while competitors adjust pricing and promotional codes dynamically.",
        mechanics: "Jurnii maps checkout grids, button placement, and copywriting clarity, benchmarking transaction states against leading high-converting digital portals. Jurnii UX audits security signals, payment gateways, and input validation to deliver commercially weighted recommendations that streamline checkout flows and increase purchase yields.",
        proofText: "Repairing transaction journey friction dramatically increases customer conversion rate and purchase yields.",
        targetPersona: "Heads of eCommerce and Digital Merchandising utilize journey mapping to streamline multi-step checkouts and increase LTV.",
        capabilities: [
          { title: "Checkout Optimization", icon: "shopping-cart", desc: "Pinpoint interaction and UI friction causing cart abandonment in high-value purchase and checkout flows." },
          { title: "Price Benchmarking", icon: "tag", desc: "Track competitor pricing, coupon codes, and loyalty perks in real-time across 35 markets monitored simultaneously." },
          { title: "User Flow Mapping", icon: "map", desc: "Model cart additions, payment gateway selections, and multi-step checkouts objectively." }
        ]
      },
      {
        id: "fintech",
        name: "FinTech",
        fullName: "FinTech & Finance",
        slug: "use-cases/sectors/fintech.html",
        kicker: "Financial Platforms",
        lede: "Streamline onboarding verification pipelines, minimize registration drop-offs, and build platform trust.",
        manifesto: "FinTech platforms leverage Jurnii to secure high-security customer registration, audit KYC and AML processing delays, and design conversion-optimized banking interfaces. By optimizing trust elements and mobile load speeds, Jurnii prevents registration funnel leakage and stabilizes acquisition costs.",
        challenge: "FinTech applications face extreme signup drop-offs during high-security AML, KYC, and document verification steps. Players lose trust when secure interfaces look generic, outdated, or confusing. Standard analytics tools cannot measure how layout security signals and compliance branding affect user confidence, leading to high abandonment rates and lost acquisition spends.",
        mechanics: "Jurnii audits security styling, compliance signals, and input validation messages across FinTech registration funnels. By comparing onboarding flows with industry best practices and 300+ analysed brands, Jurnii UX delivers commercially weighted improvements to ensure onboarding paths project maximum credibility, compliance, and safety.",
        proofText: "Optimizing trust elements and mobile load speeds prevents registration funnel leakage and stabilizes acquisition costs.",
        targetPersona: "VP of Risk and Product Leads at FinTech platforms deploy Jurnii perception scores to secure compliance conversions.",
        capabilities: [
          { title: "Onboarding Friction Audits", icon: "user-check", desc: "Optimize and accelerate high-security AML, KYC, and document upload pipelines." },
          { title: "Trust Elements Evaluation", icon: "lock", desc: "Measure visual security indicators, compliance badges, and customer trust perception levels." },
          { title: "Mobile Performance Scoring", icon: "smartphone", desc: "Ensure instant financial application loading and response speeds across mobile networks." }
        ]
      }
    ]
  }
};

// Rich, multi-section layout template for Use Cases
function getPageHTML(metaTitle, metaDesc, kicker, title, lede, manifesto, capabilities, relatedLinks, levelPrefix, challenge, mechanics, proofText, targetPersona, slug) {
  let metricStripHTML = '';
  const combined = ((slug || '') + ' ' + (targetPersona || '')).toLowerCase();
  
  const cortexRegex = /(cmo|marketing|enterprise|roi|attribution|spend|budget)/i;
  const uxRegex = /(coo|product|smb|ecommerce|fintech|ux|usability|journey|friction)/i;
  
  if (cortexRegex.test(combined)) {
    metricStripHTML = `
          <div class="metric-strip-item">
            <span class="metric-strip-num">+46%</span>
            <span class="metric-strip-label">True Marketing ROI Lift</span>
          </div>
          <div class="metric-strip-item">
            <span class="metric-strip-num">$4.85M</span>
            <span class="metric-strip-label">Budget Reallocated</span>
          </div>
          <div class="metric-strip-item">
            <span class="metric-strip-num">3x</span>
            <span class="metric-strip-label">Attribution Speed</span>
          </div>
          <div class="metric-strip-item">
            <span class="metric-strip-num">40x</span>
            <span class="metric-strip-label">ROI on Platform Investment</span>
          </div>
    `;
  } else if (uxRegex.test(combined)) {
    metricStripHTML = `
          <div class="metric-strip-item">
            <span class="metric-strip-num">300+</span>
            <span class="metric-strip-label">Brands Analysed</span>
          </div>
          <div class="metric-strip-item">
            <span class="metric-strip-num">70+</span>
            <span class="metric-strip-label">Recommendations per Audit</span>
          </div>
          <div class="metric-strip-item">
            <span class="metric-strip-num">4</span>
            <span class="metric-strip-label">Key UX Dimensions</span>
          </div>
          <div class="metric-strip-item">
            <span class="metric-strip-num">Mins</span>
            <span class="metric-strip-label">Time to Full Audit</span>
          </div>
    `;
  } else {
    metricStripHTML = `
          <div class="metric-strip-item">
            <span class="metric-strip-num">1,000+</span>
            <span class="metric-strip-label">Offers Tracked Weekly</span>
          </div>
          <div class="metric-strip-item">
            <span class="metric-strip-num">35</span>
            <span class="metric-strip-label">Regulated Markets Monitored</span>
          </div>
          <div class="metric-strip-item">
            <span class="metric-strip-num">21</span>
            <span class="metric-strip-label">Feature Areas Scanned</span>
          </div>
          <div class="metric-strip-item">
            <span class="metric-strip-num">30+</span>
            <span class="metric-strip-label">Hours Saved per Week</span>
          </div>
    `;
  }

  return `<!doctype html>
<html data-theme="light" lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${metaTitle} — Jurnii Use Cases</title>
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

    <!-- Metric Strip Component -->
    <div class="metric-strip-wrapper">
      <div class="container">
        <div class="metric-strip-grid">
          ${metricStripHTML}
        </div>
      </div>
    </div>

    <!-- Manifesto & Context -->
    <section class="feature-manifesto" id="details" style="padding: 60px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--card);">
      <div class="container" style="max-width: 900px; text-align: center;">
        <p style="font-size: 20px; font-weight: 500; line-height: 1.7; color: var(--foreground); margin: 0; font-family: var(--font-sans);">${manifesto}</p>
      </div>
    </section>

    <!-- The iGaming Commercial Challenge Section -->
    <section class="challenge-section" style="padding: 100px 0; background: var(--background);">
      <div class="container" style="max-width: 1100px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;">
          <div>
            <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">The Commercial Challenge</span>
            <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 20px 0; color: var(--foreground); line-height: 1.2;">Operating Blind in a Saturated Market</h2>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6; margin-bottom: 16px;">
              ${challenge}
            </p>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6;">
              When betting portals share the same suppliers, customer experience is the only durable barrier to player defection. Failing to benchmark your flow speed and copywriting clarity against competitor movements leaves your team fighting fires reactively.
            </p>
          </div>
          <div style="background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
            <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(148,255,150,0.12); color: var(--jurnii-700); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <i data-lucide="shield-alert" style="width: 20px; height: 20px;"></i>
            </div>
            <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">How Jurnii Solves This</h3>
            <p style="font-size: 14.5px; color: var(--muted-foreground); line-height: 1.5; margin: 0 0 24px 0;">
              ${mechanics}
            </p>
            <div class="implication-callout">
              <div class="implication-callout-header">
                <i data-lucide="trending-up" style="width: 14px; height: 14px;"></i> Commercial Implication
              </div>
              <p class="implication-callout-body">
                Friction in onboarding and mismatched promotion structures dilutes Net Gaming Revenue (<b>NGR</b>) and increases Customer Acquisition Cost (<b>CAC</b>) by up to <b>35%</b>.
              </p>
            </div>
            <div style="border-top: 1px solid var(--border); padding-top: 20px; margin-top: 20px; font-size: 13px; font-style: italic; color: var(--jurnii-700); font-weight: 600;">
              ${targetPersona}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Capability Cards Section -->
    <section class="feature-capability-section theme-dark" style="padding: 100px 0; background: #252c1e; color: #fff;">
      <div class="container" style="max-width: 1100px;">
        <div class="section-head" style="margin-bottom: 56px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 24px;">
          <h2 class="h2-section" style="font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin: 0 0 12px 0;">Strategic Capabilities</h2>
          <p style="font-size: 16px; color: rgba(255,255,255,0.7); max-width: 600px; margin: 0;">Objective tools designed to replace subjective opinion with verified digital and commercial facts.</p>
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

    <!-- Competitor Benchmark Table Section -->
    <section class="benchmark-section">
      <div class="container" style="max-width: 1100px;">
        <div class="section-head centered">
          <span class="eyebrow"><span class="dot"></span>Performance Matrix</span>
          <h2 class="h2-section">How Jurnii Outpaces the Market</h2>
          <p class="section-lede" style="margin-left: auto; margin-right: auto;">A side-by-side comparison of automated intelligence versus traditional retrospective manual setups.</p>
        </div>
        <div class="benchmark-table-card">
          <table class="benchmark-table">
            <thead>
              <tr>
                <th>Capabilities Matrix</th>
                <th class="jurnii-col">Jurnii Intelligence</th>
                <th>Legacy Analytics</th>
                <th>Manual Agencies</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="feature-name">Audit Frequency</td>
                <td class="jurnii-col"><span class="benchmark-badge success">Continuous Real-Time</span></td>
                <td>Ad-Hoc / Event Triggered</td>
                <td>Monthly / Retrospective</td>
              </tr>
              <tr>
                <td class="feature-name">Attribution Logic</td>
                <td class="jurnii-col"><span class="benchmark-badge success">Cortex Causal Models</span></td>
                <td>First-Click / Last-Click Errors</td>
                <td>Subjective / Gut Feel</td>
              </tr>
              <tr>
                <td class="feature-name">Data Structure</td>
                <td class="jurnii-col"><span class="benchmark-badge success">Normalized Promo Richness</span></td>
                <td>Raw Text Snippets</td>
                <td>Scattered Spreadsheets</td>
              </tr>
              <tr>
                <td class="feature-name">UX Recommendations</td>
                <td class="jurnii-col"><span class="benchmark-badge success">70+ Ranked Heuristics</span></td>
                <td>Simple Funnel Dropout Counts</td>
                <td>High-Level Consultant Slideware</td>
              </tr>
              <tr>
                <td class="feature-name">Jurisdictional Coverage</td>
                <td class="jurnii-col"><span class="benchmark-badge success">35 Simultaneous Markets</span></td>
                <td>Single Market / Restricted</td>
                <td>Local Only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Cortex Integration & Proof Points Section -->
    <section class="cortex-section" style="padding: 100px 0; background: var(--card); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
      <div class="container" style="max-width: 1100px;">
        <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 64px; align-items: center;">
          <div>
            <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Cortex Attribution & Yield Impact</span>
            <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 20px 0; color: var(--foreground); line-height: 1.2;">Causal ROI Optimization</h2>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6; margin-bottom: 16px;">
              All data harvested by Jurnii UX and Jurnii 360 is normalized and streamed directly into Cortex, our causal modeling and marketing mix attribution engine. Cortex eliminates last-click errors to attribute campaign success with statistical accuracy.
            </p>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6;">
              By cataloging competitor promotions, pricing richness, and interface friction, Jurnii enables your data scientists to export MMM-ready datasets. Model the defensive strength of programmatic and search channels in real-time.
            </p>
          </div>
          
          <!-- Dashboard Mock Panel -->
          <div class="dashboard-mockup-wrapper">
            <div class="dashboard-mockup-header">
              <span class="dashboard-mockup-title">
                <span class="dashboard-mockup-dot"></span> Jurnii Cortex Live Benchmarks
              </span>
              <span style="color: var(--jurnii-400); font-family: var(--font-mono); font-size: 11px; font-weight: 700;">Active Feed</span>
            </div>
            <div class="dashboard-mockup-grid">
              <!-- Column 1: Promo Richness Index Card -->
              <div class="dashboard-card-inner">
                <div class="promo-index-header">
                  <h4 class="promo-index-title">Promo Richness Index</h4>
                  <span class="promo-index-value">84</span>
                </div>
                <div style="margin-bottom: 12px;">
                  <span class="promo-index-comparison">+4.2% vs Market Avg</span>
                </div>
                <div class="dashboard-mini-chart">
                  <div class="mini-chart-bar" style="height: 35%;"></div>
                  <div class="mini-chart-bar" style="height: 48%;"></div>
                  <div class="mini-chart-bar" style="height: 60%;"></div>
                  <div class="mini-chart-bar active" style="height: 84%;"></div>
                  <div class="mini-chart-bar" style="height: 72%;"></div>
                  <div class="mini-chart-bar" style="height: 68%;"></div>
                  <div class="mini-chart-bar active" style="height: 80%;"></div>
                </div>
              </div>
              
              <!-- Column 2: Onboarding Funnel Progress -->
              <div class="dashboard-card-inner">
                <h4 class="onboarding-funnel-header">Player Onboarding Funnel</h4>
                <div class="funnel-step">
                  <div class="funnel-step-meta">
                    <span class="funnel-step-name">Registration</span>
                    <span>98%</span>
                  </div>
                  <div class="funnel-step-bar-bg">
                    <div class="funnel-step-bar-fill jurnii-fill" style="width: 98%;"></div>
                  </div>
                </div>
                <div class="funnel-step">
                  <div class="funnel-step-meta">
                    <span class="funnel-step-name">KYC Checkpoint</span>
                    <span style="color: #ff6b6b; font-weight: 600;">82% (Friction Leak)</span>
                  </div>
                  <div class="funnel-step-bar-bg">
                    <div class="funnel-step-bar-fill leak-fill" style="width: 82%;"></div>
                  </div>
                </div>
                <div class="funnel-step">
                  <div class="funnel-step-meta">
                    <span class="funnel-step-name">First Deposit</span>
                    <span>64%</span>
                  </div>
                  <div class="funnel-step-bar-bg">
                    <div class="funnel-step-bar-fill jurnii-fill" style="width: 64%;"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 24px; padding-top: 20px; font-size: 13.5px; color: rgba(255,255,255,0.6); line-height: 1.5;">
              <span style="color: var(--jurnii-300); font-weight: 700; display: block; margin-bottom: 4px;">Cortex Attribution Yield Result: +46% ROAS Lift</span>
              ${proofText}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Editorial Testimonial Section -->
    <section style="padding: 60px 0 100px; background: var(--background);">
      <div class="container" style="max-width: 900px;">
        <div class="editorial-testimonial-card">
          <blockquote class="editorial-quote">
            <em>"Before Jurnii, we calibrated our player onboarding bonuses and VIP tiers on subjective guesswork. Having normalized competitive feeds and causal attribution models shifted our growth playbook completely."</em>
          </blockquote>
          <div class="editorial-author-meta">
            <div class="editorial-author-avatar">GM</div>
            <div class="editorial-author-details">
              <cite class="editorial-author-name">General Manager, Europe iGaming Conglomerate</cite>
              <span class="editorial-author-title">Integrated Portfolio Operations</span>
            </div>
          </div>
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
              <a href="${levelPrefix}features/brand-usability.html" class="feature-link-card related" style="display:block; text-decoration:none; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px;">
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--foreground); margin:0 0 8px 0;">Usability</h4>
                <p style="font-size: 12px; color: var(--muted-foreground); line-height:1.4; margin:0;">Standardized heuristic usability auditing.</p>
              </a>
              <a href="${levelPrefix}features/competitor-promotions.html" class="feature-link-card related" style="display:block; text-decoration:none; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px;">
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--foreground); margin:0 0 8px 0;">Promotions</h4>
                <p style="font-size: 12px; color: var(--muted-foreground); line-height:1.4; margin:0;">Automate promotional campaign tracking.</p>
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
              ${relatedLinks.map(link => `
              <a href="${levelPrefix}${link.slug}" class="feature-link-card persona" style="display:block; text-decoration:none; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:16px;">
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--foreground); margin:0 0 8px 0;">${link.name}</h4>
                <p style="font-size: 12px; color: var(--muted-foreground); line-height:1.4; margin:0;">${link.sub}</p>
              </a>
              `).join('')}
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

// Group Hub landing page HTML
function getHubHTML(title, kicker, lede, description, items, levelPrefix) {
  return `<!doctype html>
<html data-theme="light" lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} Hub — Jurnii Market Intelligence</title>
  <meta name="description" content="${description}">
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
        <!-- Injected by update_nav.js -->
      </div>
    </div>
  </nav>

  <main>
    <section class="solution-hero" style="background: linear-gradient(180deg, var(--jurnii-50) 0%, transparent 100%); padding: 80px 0 60px;">
      <div class="container" style="max-width: 1100px;">
        <p class="page-hero-kicker" style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;">${kicker}</p>
        <h1 class="h1-page" style="font-size: 48px; font-weight: 800; letter-spacing: -0.03em; margin: 12px 0 24px;">Use Cases for ${title}</h1>
        <p class="page-hero-lede" style="font-size: 18px; color: var(--muted-foreground); max-width: 720px; line-height: 1.6; margin: 0;">${lede}</p>
      </div>
    </section>

    <section style="padding: 40px 0 100px;">
      <div class="container" style="max-width: 1100px;">
        <div class="resources-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
          ${items.map(item => `
          <a href="${item.slug.substring('use-cases/'.length)}" class="resource-card" style="text-decoration: none; color: inherit; display: block; border: 1px solid var(--border); border-radius: 12px; padding: 32px; background: var(--card); transition: transform 150ms ease;">
            <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(148,255,150,0.12); color: var(--jurnii-700); display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <i data-lucide="${item.capabilities[0].icon || 'circle'}" style="width: 20px; height: 20px;"></i>
            </div>
            <h3 style="font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">${item.name}</h3>
            <p style="font-size: 14.5px; color: var(--muted-foreground); line-height: 1.5; margin: 0 0 24px 0;">${item.lede}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13.5px; font-weight: 600; color: var(--jurnii-600);">
              <span>Explore Solution</span>
              <i data-lucide="arrow-right" style="width:14px; height:14px;"></i>
            </div>
          </a>
          `).join('')}
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container">
      <!-- Injected by update_footer.js -->
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

// Master Index Page HTML Refactored
function getMasterIndexHTML() {
  return `<!doctype html>
<html data-theme="light" lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Use Cases Directory — Jurnii iGaming Market Intelligence</title>
  <meta name="description" content="Discover how Jurnii structures market intelligence, automated UX scoring, and campaign attribution tailored across roles, company sizes, departments, and sectors.">
  <link rel="icon" href="../assets/jurnii-icon-light.svg">
  <link rel="stylesheet" href="../assets/site.css">
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
</head>
<body>

  <!-- Navigation (Populated by script) -->
  <nav class="nav">
    <div class="container nav-inner">
      <div class="nav-brand">
        <a href="../index.html"><img src="../assets/jurnii-dark-full.svg" alt="Jurnii Logo" class="logo-light"></a>
      </div>
      <div class="nav-links">
        <!-- Injected by update_nav.js -->
      </div>
    </div>
  </nav>

  <main>
    <!-- Use Cases Hero -->
    <section class="solution-hero" style="background: linear-gradient(180deg, var(--jurnii-50) 0%, transparent 100%); padding: 80px 0 60px;">
      <div class="container" style="max-width: 1100px;">
        <p class="page-hero-kicker" style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;">Structure</p>
        <h1 class="h1-page" style="font-size: 48px; font-weight: 800; letter-spacing: -0.03em; margin: 12px 0 24px;">Use Cases & Segments</h1>
        <p class="page-hero-lede" style="font-size: 18px; color: var(--muted-foreground); max-width: 720px; line-height: 1.6; margin: 0;">
          Jurnii delivers modular digital intelligence tailored around executive roles, operating sizes, functional departments, and industry verticals. Select your segment to explore.
        </p>
      </div>
    </section>

    <!-- Use Cases Directory Master Grid -->
    <section style="padding: 40px 0 100px;">
      <div class="container" style="max-width: 1100px;">
        <div class="resources-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
          
          <!-- Column 1: Roles -->
          <div style="background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; display: flex; flex-direction: column;">
            <a href="roles.html" style="text-decoration: none; display: block; margin-bottom: 16px;">
              <h3 style="font-size: 18px; font-weight: 800; color: var(--foreground); text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 8px; border-bottom: 1px dotted var(--border); margin:0;">Roles</h3>
            </a>
            <p style="font-size: 13px; color: var(--muted-foreground); line-height: 1.4; margin: 0 0 20px 0;">Executive personas and yield leaders.</p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <a href="roles/cmo.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="megaphone" style="width:14px;height:14px;"></i> CMO</a>
              <a href="roles/coo.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="briefcase" style="width:14px;height:14px;"></i> COO</a>
              <a href="roles/cco.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="coins" style="width:14px;height:14px;"></i> CCO</a>
            </div>
          </div>

          <!-- Column 2: Company Size -->
          <div style="background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; display: flex; flex-direction: column;">
            <a href="company-sizes.html" style="text-decoration: none; display: block; margin-bottom: 16px;">
              <h3 style="font-size: 18px; font-weight: 800; color: var(--foreground); text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 8px; border-bottom: 1px dotted var(--border); margin:0;">Company Size</h3>
            </a>
            <p style="font-size: 13px; color: var(--muted-foreground); line-height: 1.4; margin: 0 0 20px 0;">Sized exactly for SMB to Multi-Brand.</p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <a href="company-sizes/smb.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="store" style="width:14px;height:14px;"></i> SMB</a>
              <a href="company-sizes/midmarket.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="building" style="width:14px;height:14px;"></i> MidMarket</a>
              <a href="company-sizes/enterprise.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="building-2" style="width:14px;height:14px;"></i> Enterprise</a>
            </div>
          </div>

          <!-- Column 3: Departments -->
          <div style="background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; display: flex; flex-direction: column;">
            <a href="departments.html" style="text-decoration: none; display: block; margin-bottom: 16px;">
              <h3 style="font-size: 18px; font-weight: 800; color: var(--foreground); text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 8px; border-bottom: 1px dotted var(--border); margin:0;">Departments</h3>
            </a>
            <p style="font-size: 13px; color: var(--muted-foreground); line-height: 1.4; margin: 0 0 20px 0;">Cross-functional pipeline groups.</p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <a href="departments/marketing.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="users" style="width:14px;height:14px;"></i> Marketing</a>
              <a href="departments/commercial.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="trending-up" style="width:14px;height:14px;"></i> Commercial</a>
              <a href="departments/product.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="layout" style="width:14px;height:14px;"></i> Product</a>
            </div>
          </div>

          <!-- Column 4: Sectors -->
          <div style="background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; display: flex; flex-direction: column;">
            <a href="sectors.html" style="text-decoration: none; display: block; margin-bottom: 16px;">
              <h3 style="font-size: 18px; font-weight: 800; color: var(--foreground); text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 8px; border-bottom: 1px dotted var(--border); margin:0;">Sectors</h3>
            </a>
            <p style="font-size: 13px; color: var(--muted-foreground); line-height: 1.4; margin: 0 0 20px 0;">Target conversion verticals.</p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <a href="sectors/igaming.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="dices" style="width:14px;height:14px;"></i> iGaming</a>
              <a href="sectors/ecommerce.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="shopping-bag" style="width:14px;height:14px;"></i> eCommerce</a>
              <a href="sectors/fintech.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="credit-card" style="width:14px;height:14px;"></i> FinTech</a>
            </div>
          </div>

        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container">
      <!-- Injected by update_footer.js -->
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

// Ensure Directories Exist
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

// Generate the Hub index pages
const groupsKeys = Object.keys(useCasesData);
groupsKeys.forEach(gKey => {
  const group = useCasesData[gKey];
  const hubFilePath = path.join(root, group.slug);
  ensureDirectoryExistence(hubFilePath);

  const hubHTML = getHubHTML(group.title, group.kicker, group.description, group.description, group.items, '../');
  fs.writeFileSync(hubFilePath, hubHTML, 'utf8');
  console.log('Generated Group Hub LP:', group.slug);

  // Generate the child pages
  group.items.forEach(item => {
    const itemFilePath = path.join(root, item.slug);
    ensureDirectoryExistence(itemFilePath);

    // Build unique Built For items links relative to this type
    const builtForItems = group.items.filter(sib => sib.id !== item.id).map(sib => ({
      name: sib.name,
      slug: sib.slug,
      sub: sib.fullName
    }));

    const pageHTML = getPageHTML(
      item.fullName,
      item.lede,
      item.kicker,
      item.fullName,
      item.lede,
      item.manifesto,
      item.capabilities,
      builtForItems,
      '../../',
      item.challenge,
      item.mechanics,
      item.proofText,
      item.targetPersona,
      item.slug
    );
    fs.writeFileSync(itemFilePath, pageHTML, 'utf8');
    console.log('Generated Sub-Group LP:', item.slug);
  });
});

// Generate Master use-cases/index.html
const masterFilePath = path.join(root, 'use-cases/index.html');
ensureDirectoryExistence(masterFilePath);
fs.writeFileSync(masterFilePath, getMasterIndexHTML(), 'utf8');
console.log('Generated Refactored Master Hub Page: use-cases/index.html');

console.log('Use case structure successfully built and populated!');
