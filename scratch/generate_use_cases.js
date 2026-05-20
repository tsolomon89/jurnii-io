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
        lede: "Validate promotional ROI, model competitor campaign reactiveness, and target market gaps.",
        manifesto: "Jurnii parses competitor promotions and ad copy in real-time, giving Chief Marketing Officers the objective intelligence needed to maximize acquisition efficiency and justify marketing investment strategies.",
        challenge: "CMOs must defend market share and allocate budgets in highly competitive jurisdictions. Relying on last-click attribution masks the true causal impact of competitor promo shifts, while rising CPAs erode campaigns ROI.",
        mechanics: "Cortex ingests competitor promotions data from Jurnii 360 and visual UX scores from Jurnii UX, running causal modeling and marketing mix attribution. This isolates the true incremental lift of programmatics and search spends.",
        proofText: "Cortex verified +46% campaign yield and true marketing ROAS lift, validating performance on a real-world $17.1M budget.",
        targetPersona: "Chief Marketing Officers deploy Jurnii positioning maps and Cortex modeling to optimize media mix budgets and validate spend efficiency.",
        capabilities: [
          { title: "Attribution Modelling", icon: "network", desc: "Quantify competitor campaign impacts on your acquisition CAC and channel share." },
          { title: "Creative Analytics", icon: "megaphone", desc: "Monitor competitor banner messaging, creative hooks, and copywriting shifts instantly." },
          { title: "Promo Benchmarking", icon: "award", desc: "Evaluate rival bonus richness and wagering hurdles systematically across regions." }
        ]
      },
      {
        id: "coo",
        name: "COO",
        fullName: "Chief Operating Officer",
        slug: "use-cases/roles/coo.html",
        kicker: "Operational Excellence",
        lede: "Streamline digital product workflows, eliminate player journey friction, and secure conversions.",
        manifesto: "Operations leaders utilize Jurnii to align product, engineering, and marketing pipelines around objective UX indicators, eliminating manual competitive auditing and accelerating sprint impact.",
        challenge: "Hand-offs between product, marketing, and trading teams are slowed by opinion-driven disagreements. Manual tracking takes 30+ hours per week, while latency or onboarding friction at verification (KYC) steps causes silent player abandonment.",
        mechanics: "Jurnii normalizes competitor registration processes and deposit requirements, delivering automated heuristic maps that isolate actual UX bottlenecks and accelerate sprint alignment.",
        proofText: "Eliminate manual spreadsheet competitive auditing, saving 30+ hours per week across CRM and product teams.",
        targetPersona: "Chief Operating Officers deploy Jurnii automated surveillance to align technical pipelines and eliminate conversion latency.",
        capabilities: [
          { title: "Process Automation", icon: "settings", desc: "Eliminate manual competitive audits with automated active data feeds." },
          { title: "Friction Identification", icon: "alert-circle", desc: "Identify conversion leaks across registration, deposit, and verification pipelines." },
          { title: "Sprint Alignment", icon: "sliders", desc: "Map development roadmaps directly to verified industry usability standards." }
        ]
      },
      {
        id: "cco",
        name: "CCO",
        fullName: "Chief Commercial Officer",
        slug: "use-cases/roles/cco.html",
        kicker: "Margin Defence",
        lede: "Maximize margin and player lifetime value by systematically identifying conversion path leaks.",
        manifesto: "Commercial directors leverage Jurnii to protect yields, optimizing promotional richness and bonus wagering conditions based on continuous, automated market visibility.",
        challenge: "CCOs are responsible for Net Gaming Revenue (NGR), but over-generous player bonuses erode EBITDA margins. Without live visibility, CRM teams duplicate rival promos reactively, risking severe margin dilution.",
        mechanics: "Jurnii 360's Promo Richness Index standardizes wagering rules and deposit incentives. This enables CCOs to calibrate margin thresholds and defend player lifetime value (LTV).",
        proofText: "Jurnii 360 tracks 100% of competitor promotion moves automatically, scraping over 1,000 active campaigns weekly.",
        targetPersona: "Chief Commercial Officers leverage Jurnii promotions surveillance to balance customer acquisition generosity with strict yield safety.",
        capabilities: [
          { title: "Yield Optimisation", icon: "trending-up", desc: "Prevent margin erosion by calibrating deposit bonus and pricing richness against rivals." },
          { title: "LTV Protection", icon: "heart", desc: "Stop player churn before it starts by monitoring rival retention plays in real-time." },
          { title: "Leak Remediation", icon: "filter", desc: "Track and repair player progression leaks through high-value conversion funnels." }
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
        lede: "Scale player acquisition and secure regional market share without enterprise-level overheads.",
        manifesto: "Jurnii delivers rapid, high-impact intelligence tailored for emerging brands, allowing SMB operators to compete directly with global conglomerates by acting on precise, localized market facts.",
        challenge: "Squeezed by massive operator conglomerates, fast-growing challengers spend limited budgets copying market generics. Without clear competitive context, they miss micro-campaign opportunities and experience high client leakage.",
        mechanics: "Jurnii provides immediate, low-overhead competitor surveillance. Challenging operators can easily detect value claims and welcome offer gaps to deploy agile, highly targeted counter-campaigns.",
        proofText: "By analyzing 300+ global brands, Jurnii enables boutique operators to discover high-value market voids and lower acquisition CPA.",
        targetPersona: "Scaling Founders and C-Suite leaders at SMB operators use Jurnii's out-of-the-box dashboards to maintain parity without enterprise-level overheads.",
        capabilities: [
          { title: "Agile Positioning", icon: "zap", desc: "Exploit market gaps and creative opportunities left open by slower, institutional competitors." },
          { title: "Budget Efficiency", icon: "coins", desc: "Maximize every marketing dollar by analyzing and refining winning regional promotional frameworks." },
          { title: "Fast Implementation", icon: "check-circle", desc: "Access fully compiled competitive insights from day one with zero complex configurations." }
        ]
      },
      {
        id: "midmarket",
        name: "MidMarket",
        fullName: "Mid-Market Operators",
        slug: "use-cases/company-sizes/midmarket.html",
        kicker: "Scale & Expansion",
        lede: "Defend your territory and expand aggressively across new jurisdictions with structured intelligence.",
        manifesto: "Mid-market operators utilize Jurnii to transition from regional player to national leader. Systematize competitive tracking and align scaling executive teams around standardized indicators.",
        challenge: "Scaling operators face high operational friction when entering new regulated markets. Replatforming or launching new brands creates immense UX drift and exposes player onboarding funnels to massive drop-offs.",
        mechanics: "Jurnii automates customer journey audits and competitor indexing in target jurisdictions (e.g., Ontario, Sweden, UK), providing structured UX scores and promo tracking data to guide expansion roadmaps.",
        proofText: "Calibrating UX against Jurnii's global repository of 300+ brands ensures mid-market players scale acquisition cleanly.",
        targetPersona: "VP of Growth and Commercial Directors utilize Jurnii's regional maps to secure expansion margins and validate brand launches.",
        capabilities: [
          { title: "Jurisdictional Expansion", icon: "globe", desc: "Instantly understand player conversion loops and local UX expectations in new target markets." },
          { title: "Organizational Alignment", icon: "users", desc: "Establish a single-source-of-truth usability database across growing marketing and product departments." },
          { title: "Attribution Scaling", icon: "pie-chart", desc: "Model campaign causal impacts as marketing spend scales across diverse channels." }
        ]
      },
      {
        id: "enterprise",
        name: "Enterprise",
        fullName: "Enterprise Operators",
        slug: "use-cases/company-sizes/enterprise.html",
        kicker: "Market Domination",
        lede: "Benchmark multi-brand portfolios, streamline global compliance, and dominate major jurisdictions.",
        manifesto: "For top-tier multi-brand operators, Jurnii serves as the central intelligence layer. Harmonize UX scoring and competitor campaign scraping across complex, highly-regulated international markets.",
        challenge: "Multi-brand, multi-jurisdiction conglomerates operate in data siloes. Boards are flooded with subjective design feedback, while CRM teams manually scrape competitor welcome offers across 35 regulated markets.",
        mechanics: "Jurnii serves as the central competitive infrastructure. We stream normalized, structured API data directly into enterprise data warehouses, enabling automated multi-brand scoring and always-on compliance audits.",
        proofText: "Cortex causal engines processed a $17.1M real-world budget, surfacing $4.85M in inefficiency savings and 3x performance validation.",
        targetPersona: "Enterprise Chief Executive Officers and Boards leverage Jurnii Meta Scores to manage brand portfolios and defend global EBITDA.",
        capabilities: [
          { title: "Multi-Brand Benchmarking", icon: "layers", desc: "Evaluate and grade your entire portfolio of brands side-by-side under a unified metric system." },
          { title: "Regulatory Compliance", icon: "shield-check", desc: "Keep automated audit trails of promotional terms, active bonuses, and creative copy changes." },
          { title: "Enterprise Data Pipes", icon: "database", desc: "Feed structured, continuous competitor data directly into your local MMM and analytics warehouses." }
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
        lede: "Increase acquisition yields and build highly defensible cross-channel budget plans.",
        manifesto: "Eliminate subjectivity from marketing investments. Jurnii delivers the database, tracking, and attribution tools to optimize campaigns based on real-time competitor actions.",
        challenge: "Marketing managers operate under blind CPA metrics. Last-click attribution fails to account for competitor sports boosts or casino wagering shifts, leading to bad budget allocations during peak sporting seasons.",
        mechanics: "Jurnii 360 parses and indices competitor active banner creative, copy claims, and promo rich structures, syncing always-on competitor feeds with marketing mix models.",
        proofText: "Continuous automated tracking captures 400+ monthly campaigns, transforming raw competitive copy into predictive intelligence.",
        targetPersona: "Acquisition Heads and Media Buyers use Jurnii campaign timelines to optimize ad spends and improve paid media ROAS.",
        capabilities: [
          { title: "Campaign Scraping", icon: "tag", desc: "Track all competitor promotions, deposit matches, and free spins dynamically." },
          { title: "Ad Creative Intel", icon: "image", desc: "Review banner placements, positioning, and copywriting hooks across competitors." },
          { title: "Timing Optimization", icon: "calendar", desc: "Map historical deployment patterns to schedule campaigns during peak ROI windows." }
        ]
      },
      {
        id: "commercial",
        name: "Commercial",
        fullName: "Commercial Department",
        slug: "use-cases/departments/commercial.html",
        kicker: "Commercial Optimization",
        lede: "Calibrate pricing models, optimize promo richness, and defend net gaming revenues.",
        manifesto: "Commercial departments run on margins. Jurnii bridges the gap between player acquisition costs and gaming yields, supplying clear indices to evaluate pricing richness.",
        challenge: "Commercial teams struggle to balance player bonus incentives with net yield hold rates. Copying rival wagering thresholds by hand is slow, error-prone, and leads to margin erosion or sudden customer churn.",
        mechanics: "Jurnii models competitor payout curves across sports and casino verticals. By cataloging minimum deposit targets and affiliate terms, we protect NGR from competitive dilution.",
        proofText: "Normalizing promotion tracking across 35 markets saves 30+ hours of commercial analyst time every week.",
        targetPersona: "Commercial Analysts and CRM Directors leverage Jurnii margin calibrators to deploy high-yield loyalty rewards.",
        capabilities: [
          { title: "Promo Richness Index", icon: "bar-chart-3", desc: "Standardize the mathematical cost and yield margin impact of deposit and retention bonuses." },
          { title: "Churn Analytics", icon: "user-minus", desc: "Trace rival product changes and promotions causing customer leakage to competitors." },
          { title: "Revenue Auditing", icon: "activity", desc: "Identify conversion leaks and audits in affiliate reward structures and deposit funnels." }
        ]
      },
      {
        id: "product",
        name: "Product",
        fullName: "Product Department",
        slug: "use-cases/departments/product.html",
        kicker: "Product Excellence",
        lede: "Drive product sprint success, optimize user flows, and automate competitive UX audits.",
        manifesto: "Product managers utilize Jurnii to validate interface roadmaps. Base development sprints on objective heuristic rankings rather than ad-hoc specifications or subjective opinions.",
        challenge: "Product roadmaps are plagued by internal opinions. Usability reviews are slow and expensive, while B2B vendor platform constraints force product managers to ship features blindly without competitive context.",
        mechanics: "Jurnii UX delivers automated usability heuristics scoring across registration, KYC verification, and checkout funnels, supplying product teams with ranked, actionable updates.",
        proofText: "Jurnii UX audits deliver 70+ commercially weighted recommendations ranked by conversion yield impact in minutes.",
        targetPersona: "Chief Product Officers and Heads of UX deploy Jurnii heuristic scores to prioritize development cycles and outpace rival portals.",
        capabilities: [
          { title: "Heuristic UX Scoring", icon: "award", desc: "Automate user interface audits across core registration, verification, and deposit pipelines." },
          { title: "Journey Mapping", icon: "route", desc: "Visualize player navigation pathways and friction points objectively." },
          { title: "Benchmark Auditing", icon: "check-circle", desc: "Compare player journey speed and aesthetics side-by-side with global industry peers." }
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
        manifesto: "Jurnii is native to digital gaming. Empowering sportsbooks, casinos, and lotteries with real-time visibility into competitor player UX, deposit bonuses, and marketing attribution.",
        challenge: "High multi-homing rates (70-80% players holding 3-5 competitor accounts) mean player loyalty is extremely fragile. Saturated marketing channels, rising CPAs, and tight compliance rules restrict traditional growth.",
        mechanics: "Jurnii is native to digital gaming. We continuously monitor live casino and sportsbook onboarding pathways, tracking wagering hurdles and deposit multipliers dynamically.",
        proofText: "Scraping over 1,000 gaming promos weekly guarantees 100% visibility into target regulated markets.",
        targetPersona: "Chief Executive Officers at sportsbooks and casinos deploy Jurnii to secure player conversions and optimize net gaming yield.",
        capabilities: [
          { title: "iGaming Heuristics", icon: "dices", desc: "Track gaming registration, verification (KYC), deposit, and betslip usability." },
          { title: "Bonus Scraping", icon: "gift", desc: "Parse competitor sports and casino campaigns automatically as soon as they go live." },
          { title: "Compliance Tracking", icon: "globe", desc: "Keep tabs on competitor promo terms, active wagering multipliers, and layouts globally." }
        ]
      },
      {
        id: "ecommerce",
        name: "eCommerce",
        fullName: "eCommerce Brands",
        slug: "use-cases/sectors/ecommerce.html",
        kicker: "Conversion Scaling",
        lede: "Maximize checkout conversions, audit checkout friction, and outpace competitor pricing.",
        manifesto: "High-volume digital brands utilize Jurnii to map player purchase journeys, identify cart abandonment causes, and benchmark promotional campaign effectiveness.",
        challenge: "eCommerce platforms suffer from severe cart abandonment at checkouts and payment gateway selections. Traditional analytics show *where* players drop off, but fail to explain the visual layout errors causing cognitive fatigue.",
        mechanics: "Jurnii maps checkout grids, button placement, and copywriting clarity, benchmarking transaction states against leading high-converting digital portals.",
        proofText: "Repairing transaction journey friction dramatically increases customer conversion rate and purchase yields.",
        targetPersona: "Heads of eCommerce and Digital Merchandising utilize journey mapping to streamline multi-step checkouts and increase LTV.",
        capabilities: [
          { title: "Checkout Optimization", icon: "shopping-cart", desc: "Pinpoint interaction and UI friction causing cart abandonment in high-value flows." },
          { title: "Price Benchmarking", icon: "tag", desc: "Track competitor discounting, coupon codes, and loyalty perks in real time." },
          { title: "User Flow Mapping", icon: "map", desc: "Model cart additions, payment gateway selections, and multi-step checkouts objectively." }
        ]
      },
      {
        id: "fintech",
        name: "FinTech",
        fullName: "FinTech & Finance",
        slug: "use-cases/sectors/fintech.html",
        kicker: "Financial Platforms",
        lede: "Streamline onboarding verification pipelines, minimize onboarding dropoffs, and build platform trust.",
        manifesto: "FinTech platforms leverage Jurnii to secure high-security customer registration, audit KYC and AML processing delays, and design conversion-optimized banking interfaces.",
        challenge: "FinTech applications face extreme signup drop-offs during high-security AML, KYC, and document verification steps. Players lose trust when secure interfaces look generic, outdated, or confusing.",
        mechanics: "Jurnii audits security styling, compliance signals, and input validation messages to ensure onboarding paths project maximum credibility and safety.",
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
function getPageHTML(metaTitle, metaDesc, kicker, title, lede, manifesto, capabilities, relatedLinks, levelPrefix, challenge, mechanics, proofText, targetPersona) {
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
            <div style="border-top: 1px solid var(--border); padding-top: 20px; font-size: 13px; font-style: italic; color: var(--jurnii-700); font-weight: 600;">
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
          <div style="background: #1c2217; border-radius: 16px; padding: 40px; color: #fff;">
            <span style="font-family: var(--font-mono); font-size: 10px; color: var(--jurnii-400); text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Attribution Results</span>
            <h3 style="font-size: 40px; font-weight: 800; color: #fff; margin: 0 0 8px 0;">+46%</h3>
            <p style="font-size: 13.5px; color: rgba(255,255,255,0.7); line-height: 1.5; margin: 0 0 24px 0;">
              Attributed campaign yield and marketing ROAS lift achieved through Cortex causal models.
            </p>
            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; font-size: 13.5px; color: rgba(255,255,255,0.6); line-height: 1.4;">
              ${proofText}
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
      item.targetPersona
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
