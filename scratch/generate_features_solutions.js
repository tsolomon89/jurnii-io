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

// Complete, rich, professional copywriting database for all 32 landing pages
const featuresData = [
  {
    slug: "features/competitor-promotions.html",
    name: "Promotions",
    fullName: "Competitor Promotions Tracking",
    kicker: "Competitor Core",
    lede: "Track live competitor sign-up offers, sports/casino bonuses, and wagering multiples in real-time.",
    manifesto: "Never let a competitor promotion go unnoticed. Jurnii monitors active sign-up offers across key regulated jurisdictions, helping operators calibrate margins and acquire players dynamically.",
    challenge: "In highly commoditised gaming jurisdictions, operators waste millions copying rival promo terms blind. Manual compilation takes weeks, leaving CRM teams two steps behind the market.",
    mechanics: "Using Jurnii 360's continuous tracking engine, Jurnii maps competitive bonus terms, welcome incentives, and CRM triggers across 35 regulated markets simultaneously. Our platform normalizes and scores offer generosity to deliver instant strategic clarity.",
    capabilities: [
      { title: "Wagering Hurdles Tracking", icon: "tag", desc: "Compare deposit wagering requirements, play-through multipliers, and spin constraints side-by-side to understand true player acquisition effort." },
      { title: "Geo-Targeted Audits", icon: "globe", desc: "Isolate regional campaign variations deployed by rival conglomerates in specific states, provinces, or countries to exploit promotional voids." },
      { title: "Active Signup Scanning", icon: "activity", desc: "Detect and log newly introduced welcome offers within minutes of launching to empower trading and CRM response teams instantly." }
    ],
    proofText: "Jurnii 360 tracks 100% of competitor moves automatically, scraping over 1,000 promotions weekly across key regions.",
    targetPersona: "Chief Commercial Officers utilize this feature to safeguard operator margins and maintain active market parity."
  },
  {
    slug: "features/competitor-positioning.html",
    name: "Positioning",
    fullName: "Competitor Positioning Analytics",
    kicker: "Competitor Core",
    lede: "Analyze rival market claims, value propositions, and unique landing page positioning hooks.",
    manifesto: "Identify how competitors differentiate themselves. Jurnii continuously maps promotional angles to highlight underserved positioning opportunities in sports and casino markets.",
    challenge: "Operators copy-paste generic slogans ('fast payouts', 'widest markets') without visual or textual distinction, driving customer acquisition costs (CAC) higher as bidding wars intensify.",
    mechanics: "Jurnii parses all on-site copy and homepage banner states, cataloging active value claims. It maps the visual dominance of competitive claims to identify untapped promotional angles.",
    capabilities: [
      { title: "Value Claim Analysis", icon: "award", desc: "Extract and index all digital copywriting claims, tracking the exact focus of competitor messaging across key landing zones." },
      { title: "Differentiated Angles", icon: "compass", desc: "Spot messaging voids in rival advertising matrices to launch highly unique counter-campaigns that stand out in saturated markets." },
      { title: "Competitive Matrix Maps", icon: "layers", desc: "Visualize brand placements based on pricing structures, visual premium qualities, and overall ease-of-use indicators." }
    ],
    proofText: "By analyzing 300+ global brands, Jurnii helps positioning strategy transition from subjective guesswork to objective data.",
    targetPersona: "Chief Marketing Officers deploy Jurnii positioning maps to defend brand share and optimize digital spend."
  },
  {
    slug: "features/competitor-comparison.html",
    name: "Comparison",
    fullName: "Competitor Comparison Engines",
    kicker: "Competitor Core",
    lede: "Compare player acquisition pathways, sign-up structures, and deposit requirements side-by-side.",
    manifesto: "Run detailed mathematical comparisons. Calibrate your operator margins by evaluating wagering rules and bonus depth directly against major regional operators.",
    challenge: "70-80% of players hold accounts with 3-5 operators simultaneously. If your signup requires two more clicks than a rival, players abandon the funnel permanently.",
    mechanics: "Jurnii Normalizes competitive flows into standardized user journey sequences. It maps steps, inputs, KYC checks, and payment integrations side-by-side with global best practices.",
    capabilities: [
      { title: "Side-by-Side Scoring", icon: "git-compare", desc: "Evaluate registration, verification (KYC), and payment pipelines against three chosen rivals simultaneously." },
      { title: "Bonus Calibration Matrix", icon: "gift", desc: "Compare wagering multipliers and free spin richness across target categories to determine competitive generosity." },
      { title: "Friction Auditing", icon: "filter", desc: "Compare click counts, form requirements, and page load delays across competitor checkout pathways." }
    ],
    proofText: "Identify and resolve friction bottlenecks using Jurnii UX audits that deliver 70+ commercially weighted recommendations in minutes.",
    targetPersona: "Heads of UX utilize Jurnii comparisons to justify interface updates and outpace regional platform benchmarks."
  },
  {
    slug: "features/competitor-analysis.html",
    name: "Analysis",
    fullName: "Competitor Analysis Sprints",
    kicker: "Competitor Core",
    lede: "Synthesize large-scale competitor marketing moves, promotional patterns, and timing frameworks.",
    manifesto: "Uncover competitor playbooks. Synthesize months of campaign data to identify launch frequencies, product milestones, and strategic market timing.",
    challenge: "Siloed data prevents executive alignment. Product, marketing, and commercial teams operate on separate gut-feels rather than shared market truths.",
    mechanics: "Jurnii compiles continuous market tracking into executive-ready dashboards and longitudinal reports, enabling strategic planning at 85% confidence rather than reactive 50% guesses.",
    capabilities: [
      { title: "Historical Sequencing", icon: "calendar", desc: "Chart competitor campaign durations over seasons to anticipate product updates and aggressive marketing spend pushes." },
      { title: "Margin Calibration Sprints", icon: "trending-up", desc: "Evaluate average competitor bonus payout metrics to benchmark your net yield efficiency and hold rates." },
      { title: "Executive Summaries", icon: "file-text", desc: "Generate board-ready competitor profiles, market generics, and compliance histories in a single click." }
    ],
    proofText: "Save 30+ hours per week in manual spreadsheet tracking, freeing commercial analysts to focus on active campaign yield management.",
    targetPersona: "Chief Executive Officers utilize Jurnii summaries to align board presentations and streamline M&A competitive due diligence."
  },
  {
    slug: "features/competitor-offer-feed.html",
    name: "Offer Feed",
    fullName: "Competitor Offer Feed Integrations",
    kicker: "Competitor Feed",
    lede: "Access continuous, structured data streams of active competitor promotional campaign terms.",
    manifesto: "Transform promotions into machine-readable data. Feed structured competitor promotion files directly into local modeling systems, pricing algorithms, or internal dashboards.",
    challenge: "Scraping competitor campaigns by hand is slow, error-prone, and cannot scale across 400+ weekly offers and 5,000+ monthly sports boosts.",
    mechanics: "Jurnii delivers direct API endpoints and webhook channels that stream normalized, structured campaign data into your database, CRM, or Marketing Mix Model (MMM).",
    capabilities: [
      { title: "Structured API Access", icon: "database", desc: "Feed clean competitor offer JSON data directly into your CRM or player platforms for dynamic margin pricing." },
      { title: "Historical Archive", icon: "archive", desc: "Access comprehensive records of expired competitor promos to research holiday trends and winter seasonal playbooks." },
      { title: "Wagering Decoders", icon: "code", desc: "Automatically translate complex bonus terms and conditions into clean data rows, including deposit matches, rollovers, and spin values." }
    ],
    proofText: "Streamlined data exports map directly into local attribution databases, eliminating the complexity of traditional manual scraping.",
    targetPersona: "Cortex models are enriched with always-on Jurnii 360 offer feeds to attribute campaign success with causal accuracy."
  },
  {
    slug: "features/competitor-live-feed.html",
    name: "Live Feed",
    fullName: "Competitor Live Feed Surveillance",
    kicker: "Competitor Feed",
    lede: "Monitor real-time product updates, page modifications, and creative updates.",
    manifesto: "Stay continuously connected to rival movements. Monitor live landing page visual edits and copywriting adjustments as they happen across multi-brand operators.",
    challenge: "Competitors launch aggressive welcome campaigns during major sporting events, catching your commercial team off-guard and eroding active market share.",
    mechanics: "Our scraper network crawls operator domains multiple times daily, tracking DOM shifts, image updates, CSS adjustments, and CTA copywriting edits.",
    capabilities: [
      { title: "Visual Shift Tracking", icon: "eye", desc: "Detect visual interface alterations, branding shifts, and structural design adjustments on competitive pages." },
      { title: "Real-time Monitors", icon: "refresh-cw", desc: "Run continuous server-side monitors to detect active page changes, pricing models, and affiliate links." },
      { title: "Changelog Reporting", icon: "clipboard", desc: "Compile daily logs detailing rival feature introductions, navigation shifts, and digital wallet integrations." }
    ],
    proofText: "Compress reaction time from weeks to hours, tracking competitor movements automatically the moment they are deployed.",
    targetPersona: "Heads of CRM use the Live Feed to monitor retention bonuses, adjusting internal rewards to prevent player churn."
  },
  {
    slug: "features/competitor-alerts.html",
    name: "Alerts",
    fullName: "Competitor Alerts Network",
    kicker: "Competitor Feed",
    lede: "Receive instant notifications when competitors launch new offers, adjust rates, or shift copy.",
    manifesto: "React instantly to market events. Receive direct slack or web notifications the exact moment a competitor adjustments their registration, deposit, or retention bonuses.",
    challenge: "Missing a rival’s major campaign shift means playing catch-up for weeks while high-value players defect to more generous platforms.",
    mechanics: "Configure threshold triggers based on bonus value, wagering multiples, or visual shifts, sending push updates to your commercial team channels.",
    capabilities: [
      { title: "Multi-channel Alerts", icon: "bell", desc: "Configure custom push alerts via Slack, Microsoft Teams, email, or direct webhook integrations." },
      { title: "Bonus Shift Detection", icon: "sliders", desc: "Trigger notifications only when wagering terms, deposit percentages, or free spin values shift." },
      { title: "Custom Thresholds", icon: "percent", desc: "Define triggers based on maximum bonus values or promotional payout richness indices to avoid spam." }
    ],
    proofText: "Always-on competitive surveillance ensures your team is never blindside by competitor campaigns.",
    targetPersona: "Chief Commercial Officers set up alerts for local competitor moves, ensuring their brand remains a market leader."
  },
  {
    slug: "features/competitor-ai-insights.html",
    name: "AI Insights",
    fullName: "Competitor AI Insights & Predictions",
    kicker: "Competitor Feed",
    lede: "Deploy advanced ML models to predict competitor marketing pushes and summarize campaign angles.",
    manifesto: "Gain predictive foresight. Leverage specialized neural nets to summarize massive campaign databases and predict rival product timing and advertising strategies.",
    challenge: "Raw competitor data is overwhelming. Sorting through thousands of sports boosts and copy variations prevents analysts from finding patterns.",
    mechanics: "Jurnii utilizes proprietary domain-specific ML models to digest competitive databases, classifying campaigns, detecting trends, and predicting launch windows.",
    capabilities: [
      { title: "Timing Prediction", icon: "brain", desc: "Anticipate rival marketing deployments and product launches using deep temporal predictive models." },
      { title: "Ad Copy Summaries", icon: "message-square", desc: "Utilize natural language processing to isolate winning competitor copywriting hooks and visual messaging angles." },
      { title: "Anomaly Spotting", icon: "alert-circle", desc: "Flag unusual competitor acquisition spikes, non-standard bonus structures, or regulatory compliance failures." }
    ],
    proofText: "Jurnii's domain-specific models are trained on 300+ top operators, avoiding the parity of generic AI wrappers.",
    targetPersona: "Chief Marketing Officers use AI Insights to allocate advertising budget toward highly defensive channels."
  },
  {
    slug: "features/brand-meta-scoring.html",
    name: "Meta Scoring",
    fullName: "Brand Meta Scoring Index",
    kicker: "Brand Core",
    lede: "Evaluate and aggregate overall user experience, visual quality, and compliance metrics into unified scores.",
    manifesto: "Establish a single metric for design. Aggregate visual, usability, speed, and onboarding indicators to score your brand portfolios side-by-side with global peers.",
    challenge: "Design discussions are plagued by subjectivity. Executive teams debate colors and fonts instead of focusing on verified conversion friction.",
    mechanics: "Jurnii UX normalizes hundreds of design and performance metrics into a single, authoritative, commercially weighted Meta Score for board reporting.",
    capabilities: [
      { title: "Unified Visual Index", icon: "sparkles", desc: "Combine multiple UX vectors, technical vitals, and accessibility factors into a single, board-ready brand grade." },
      { title: "Portfolio Scoring", icon: "layers", desc: "Score and compare internal sister brands and regional domains under one standard metric system." },
      { title: "Executive Benchmark Dashboards", icon: "bar-chart", desc: "Present high-fidelity design metrics directly to product, marketing, and compliance leadership." }
    ],
    proofText: "Over 300 global brands are indexed on the Jurnii UX database, establishing the benchmark standard for gaming portals.",
    targetPersona: "Chief Product Officers leverage Meta Scores to establish clear design standards across their entire operator portfolio."
  },
  {
    slug: "features/brand-market-trends.html",
    name: "Market Trends",
    fullName: "Brand Market Trends Auditing",
    kicker: "Brand Core",
    lede: "Benchmark industry design patterns, color systems, and interactive trends across major operators.",
    manifesto: "Adopt modern UX trends ahead of the competition. Track the evolution of gaming interfaces, dark mode styles, and betslip integrations across global markets.",
    challenge: "Product roadmaps are built in silos. Operators miss significant market shifts like digital wallets or instant KYC integrations until they lose share.",
    mechanics: "Jurnii constantly indexes visual and functional elements of leading operators, reporting on adoption speeds of new designs and UI patterns.",
    capabilities: [
      { title: "Design System Mapping", icon: "palette", desc: "Identify color palettes, border styling, and layout spacing systems gaining regional traction." },
      { title: "Feature Adoption Rates", icon: "check-square", desc: "Measure how fast rival operators deploy new digital wallet or quick-bet features to guide product prioritization." },
      { title: "Global Shift Analysis", icon: "globe", desc: "Review visual design trends in pioneering markets like Sweden, the UK, and Ontario to anticipate local shifts." }
    ],
    proofText: "Continuous benchmarking helps product teams design layouts backed by real-world competitive context.",
    targetPersona: "Heads of UX deploy trend reports to keep interfaces modern and aligned with evolving player expectations."
  },
  {
    slug: "features/brand-design-themes.html",
    name: "Design Themes",
    fullName: "Brand Design Themes Auditing",
    kicker: "Brand Core",
    lede: "Audit visual stylesheet systems, typography scale, and layout systems in use by rivals.",
    manifesto: "Standardize aesthetic measurements. Automatically catalog font families, button border-radius systems, and visual padding to understand contemporary iGaming design standards.",
    challenge: "Aesthetic consistency is hard to enforce across multiple regional brands, resulting in visual drift and a compromised premium feel.",
    mechanics: "Jurnii's CSS scraper normalizes styling properties, documenting typographic scales, font family combinations, spacing utilities, and visual variables.",
    capabilities: [
      { title: "Style Sheet Scraping", icon: "code", desc: "Scrape and log CSS variables, layout spacing, and visual styling properties across competitor domains." },
      { title: "Typography Analysis", icon: "type", desc: "Audit visual reading levels, typography hierarchy, and reading ease across player registration flows." },
      { title: "Theme Comparison Matrix", icon: "columns", desc: "Map brands across minimalist layouts, hyper-promotional patterns, or high-density gaming UIs." }
    ],
    proofText: "Proven visual analytics ensure your brands maintain design integrity, preserving a premium gaming environment.",
    targetPersona: "Design Systems Architects use Theme Auditing to establish strict tokens and prevent internal style drift."
  },
  {
    slug: "features/brand-promotion-analysis.html",
    name: "Promotion Analysis",
    fullName: "Brand Promotion Placement Analysis",
    kicker: "Brand Core",
    lede: "Correlate promotional structures and wagering richness to visual placement and layout design.",
    manifesto: "Optimize landing page conversion. Correlate promotional bonus richness directly with structural design, banner sizes, and copywriting placement to maximize player registration yields.",
    challenge: "Operators offer rich sign-up incentives but fail to convert players because the promotional design is cluttered, slow, or visually hard to read.",
    mechanics: "Jurnii maps promotional banner real estate and layout formats to active bonus richness, indicating which visual formats drive optimal signup yield.",
    capabilities: [
      { title: "Copywriting Optimization", icon: "edit-3", desc: "Correlate player conversion yields against headline text lengths and deposit CTA button positions." },
      { title: "Banner Size Audits", icon: "layout", desc: "Measure how visual real estate allocation on homepages influences registration success." },
      { title: "Creative Performance Logs", icon: "activity", desc: "Map historical competitor banner deployments against promotional click-through indicators." }
    ],
    proofText: "Aligning visual layout with promotional richness drives optimal player acquisition, maximizing marketing ROAS.",
    targetPersona: "Chief Marketing Officers use these insights to balance creative design with promotional yield expectations."
  },
  {
    slug: "features/brand-perfomance.html",
    name: "Perfomance",
    fullName: "Brand Technical Perfomance",
    kicker: "Brand Performance",
    lede: "Measure actual page loading metrics, core web vitals, and asset performance dynamically.",
    manifesto: "Eliminate latency before player abandonment. Measure and track core web vitals and mobile connection delays under simulated network loads directly against rivals.",
    challenge: "10% of players drive 80% of revenue, and these high-value players are highly sensitive to latency. A 1-second delay in page load causes immediate abandonment.",
    mechanics: "Jurnii simulates real-world mobile connection scenarios to test operator domains, cataloging LCP, FID, and CLS scores side-by-side with regional competitors.",
    capabilities: [
      { title: "Core Web Vitals Auditing", icon: "zap", desc: "Track LCP, FID, and CLS scores dynamically under low-bandwidth mobile environments." },
      { title: "Asset Size Monitoring", icon: "hard-drive", desc: "Monitor script file weights, asset packaging, and media optimization indicators." },
      { title: "Competitive Speed Index", icon: "gauge", desc: "Rank operator checkout and betslip speed side-by-side with regional industry competitors." }
    ],
    proofText: "Continuous technical diagnostics ensure your product is optimized for player retention and mobile conversion.",
    targetPersona: "Chief Operating Officers deploy speed metrics to eliminate infrastructure bottlenecks and defend NGR."
  },
  {
    slug: "features/brand-usability.html",
    name: "Usability",
    fullName: "Brand Usability Heuristics",
    kicker: "Brand Performance",
    lede: "Run exhaustive heuristic user experience evaluations on key player onboarding pathways.",
    manifesto: "Evaluate ease-of-use with mathematical objectivity. Identify friction points in sports betting checkout, payment selection, and document upload stages.",
    challenge: "Usability evaluations are slow, expensive, and subjective when conducted by traditional design agencies.",
    mechanics: "Jurnii UX runs automated heuristic audits mapped across four dimensions, providing ranked recommendations to clear onboarding pathways.",
    capabilities: [
      { title: "Heuristic Frameworks", icon: "check-circle", desc: "Evaluate experience against 12 core onboarding design criteria systematically." },
      { title: "Cognitive Load Evaluation", icon: "activity", desc: "Spot redundant form fields and interactive elements causing checkout and registration leakage." },
      { title: "Error Recovery Audits", icon: "alert-triangle", desc: "Analyze validation prompts, instruction clarity, and error feedback systems across player flows." }
    ],
    proofText: "Obtain 70+ commercially weighted UX recommendations in minutes, not weeks, to drive product sprint success.",
    targetPersona: "Chief Product Officers leverage usability scoring to prioritize features and accelerate development roadmaps."
  },
  {
    slug: "features/brand-preception.html",
    name: "Preception",
    fullName: "Brand Trust & Preception",
    kicker: "Brand Performance",
    lede: "Audit customer trust, security signals, and visual safety perceptions across key pipelines.",
    manifesto: "Enhance onboarding security confidence. Audit regulatory badges, terms visibility, and data privacy styling elements to maximize player signup success.",
    challenge: "Players drop out of verification (KYC) funnels because the secure screens look generic, causing a collapse in visual trust.",
    mechanics: "We audit trust signals, compliance badges, SSL visibility, and secure layout designs to ensure interfaces project maximum authority and safety.",
    capabilities: [
      { title: "Trust Signals Scraping", icon: "shield", desc: "Log compliance logos, regulatory text, and payout certifications across landing zones." },
      { title: "Security Styling Audits", icon: "lock", desc: "Optimize password forms, terms checkboxes, and account verification panels to reassure players." },
      { title: "Visual Safety Rankings", icon: "eye", desc: "Grade player onboarding trust perceptions side-by-side with premier operator portals." }
    ],
    proofText: "Building visual trust is a commercial necessity, directly driving conversion on high-security flows.",
    targetPersona: "Heads of CRM utilize trust scores to align customer messaging and defend brand retention."
  },
  {
    slug: "features/brand-recommendations.html",
    name: "Recommendations",
    fullName: "Brand Actionable Recommendations",
    kicker: "Brand Performance",
    lede: "Obtain automated, high-fidelity actionable suggestions to address UX deficiencies and outpace rivals.",
    manifesto: "Receive immediate development blueprints. Access step-by-step UI adjustments to resolve identified friction leaks and outpace adjacent operator competitors.",
    challenge: "Product teams struggle to prioritize bugs based on revenue, wasting development cycles on low-impact layout changes.",
    mechanics: "Jurnii ranks all audit findings by severity and commercial weight, providing a development checklist mapped to revenue consequences.",
    capabilities: [
      { title: "Actionable Sprints", icon: "clipboard-list", desc: "Obtain clean development task checklists to address identified user onboarding leaks." },
      { title: "Visual Reference Cards", icon: "image", desc: "Match recommended UI corrections to verified industry-leading interface layouts." },
      { title: "Yield Impact Mapping", icon: "dollar-sign", desc: "Prioritize design updates based on estimated player conversion and acquisition impact." }
    ],
    proofText: "Commercially weighted recommendations align product and business priorities around a shared roadmap.",
    targetPersona: "Chief Product Officers use Jurnii recommendations to build bulletproof roadmap sprints."
  }
];

const solutionsData = [
  {
    slug: "solutions/competition-discovery.html",
    name: "Discovery",
    fullName: "Competition Discovery Solutions",
    kicker: "Competition",
    lede: "Identify emerging operators and new brand launches entering your target jurisdictions automatically.",
    manifesto: "Maintain total market awareness. Jurnii continuously maps regional operators, tracking fresh multi-brand conglomerates and boutique platforms before they claim market share.",
    challenge: "Boutique operators enter regulated markets quietly, bidding up player acquisition keywords and eroding your regional market share before you notice.",
    mechanics: "Jurnii scans regional licensing databases and ad registries, notifying you the moment a new brand launches welcome offers in your jurisdiction.",
    capabilities: [
      { title: "Operator Mapping", icon: "map", desc: "Map active gaming and casino sites inside regulated regional boundaries." },
      { title: "New Entrant Alerts", icon: "alert-circle", desc: "Receive immediate notifications the moment a new brand launches welcome offers in your region." },
      { title: "Jurisdictional Audits", icon: "globe", desc: "Audit regional operator saturation across Ontario, Sweden, UK, and emerging states." }
    ],
    proofText: "Continuous automated scanning prevents competitive blind spots across 35 monitored markets.",
    targetPersona: "Chief Executive Officers use discovery solutions to maintain strategic market leadership."
  },
  {
    slug: "solutions/competition-offers.html",
    name: "Offers",
    fullName: "Competition Offers Intelligence",
    kicker: "Competition",
    lede: "Standardize competitor promotion tracking to continuously deploy winning acquisition campaigns.",
    manifesto: "Eliminate promotional speculation. Systematize tracking of deposit bonus percentages, spin counts, and sports betting boosts across your competitors.",
    challenge: "CRM teams duplicate competitor promotions reactively without knowing if those mechanics actually drive incrementality.",
    mechanics: "Jurnii normalizes competitor sports and casino offers, scoring their generosity using the proprietary Promo Richness Index.",
    capabilities: [
      { title: "Bonus Richness Index", icon: "gift", desc: "Standardize bonus yield calculations based on active wagering hurdles." },
      { title: "Ad Campaign Parsing", icon: "tag", desc: "Extract competitor banner messaging, creative headers, and copy hooks dynamically." },
      { title: "Holiday Trend Logs", icon: "calendar", desc: "Review competitor Christmas, World Cup, and Super Bowl promotional timelines." }
    ],
    proofText: "Track competitor campaigns automatically, saving 30+ hours per week per commercial team.",
    targetPersona: "Chief Commercial Officers deploy offers intelligence to align CRM strategy with real-world market context."
  },
  {
    slug: "solutions/competition-pricing.html",
    name: "Pricing",
    fullName: "Competition Pricing Calibration",
    kicker: "Competition",
    lede: "Calibrate player margins, deposit rules, and wagering requirements against real-time market data.",
    manifesto: "Protect operator margin while remaining highly competitive. Align welcome offers and player rewards with continuous, structured regional metrics.",
    challenge: "Over-generous sign-up bonuses erode operator margins, while overly restrictive wagering rules kill player acquisition.",
    mechanics: "We model payout curves and margin impact across different spin multipliers and wagering requirements to find the commercial sweet spot.",
    capabilities: [
      { title: "Margin Defense Tools", icon: "dollar-sign", desc: "Prevent margin erosion by tracking minimum deposit and payout limits across competitors." },
      { title: "Wagering Calibrators", icon: "sliders", desc: "Model payout curves across different spin multipliers and sports wagering terms." },
      { title: "ROI Auditing Engine", icon: "activity", desc: "Audit rival affiliate rewards and player acquisition pipelines automatically." }
    ],
    proofText: "Calibrating margins prevents promotional spend erosion, directly defending operator EBITDA.",
    targetPersona: "Chief Commercial Officers use pricing calibration to defend yield thresholds across target markets."
  },
  {
    slug: "solutions/competition-postitioning.html",
    name: "Postitioning",
    fullName: "Competition Postitioning Strategy",
    kicker: "Competition",
    lede: "Discover untapped marketing hooks and value claims by mapping rival operator positioning.",
    manifesto: "Differentiate with absolute precision. Isolate positioning angles left open by competitor marketing layouts to establish highly defensive campaigns.",
    challenge: "Acquisition campaigns collapse when operators fail to stand out, forcing them to rely on price Generosity alone.",
    mechanics: "Jurnii maps the copywriting and messaging space, signaling where competitors have left visual or conceptual voids.",
    capabilities: [
      { title: "Value Claim Maps", icon: "compass", desc: "Graph active brands based on core value propositions, speed, or bonus size." },
      { title: "Copywriting Auditing", icon: "file-text", desc: "Parse competitor landing page copy to identify dominant positioning themes." },
      { title: "Segment Expansion", icon: "crosshair", desc: "Target player personas ignored by slow-moving regional operators." }
    ],
    proofText: "Objective positioning strategies lower CPA by avoiding direct competition on generic value claims.",
    targetPersona: "Chief Marketing Officers deploy positioning strategy to optimize ROAS across paid media channels."
  },
  {
    slug: "solutions/user-interface-benchmarking.html",
    name: "User Interface",
    fullName: "User Interface Benchmarking",
    kicker: "Benchmarking",
    lede: "Grade aesthetic layouts, grid structure, and visual clarity against leading global operators.",
    manifesto: "Establish visual excellence without subjective debates. Benchmark stylesheet setups, typographic layouts, and visual real estate side-by-side with global peers.",
    challenge: "Subjective design reviews delay product releases by weeks and often fail to fix the layout errors that actually block players.",
    mechanics: "We run automated visual audits, scoring layout spacing, color contrast accessibility, and grid balance against industry best practice.",
    capabilities: [
      { title: "Aesthetic Scoring", icon: "layout", desc: "Grade interface quality, layout spacing, and grid balance using structural analysis." },
      { title: "Design System Logs", icon: "palette", desc: "Scrape and archive rival typographic scales, border systems, and color systems." },
      { title: "Contrast Integrity Checks", icon: "eye", desc: "Assert readability and styling accessibility requirements across player flows." }
    ],
    proofText: "Normalizing UI scoring aligns designers, product managers, and developers around a shared objective standard.",
    targetPersona: "Design Systems Architects use UI Benchmarking to enforce brand guidelines and visual consistency."
  },
  {
    slug: "solutions/user-experience-benchmarking.html",
    name: "User Experience",
    fullName: "User Experience Benchmarking",
    kicker: "Benchmarking",
    lede: "Automate user flow assessments across core player registration, verification, and deposit funnels.",
    manifesto: "Calibrate player friction objectively. Replace sluggish, manual usability audits with automated heuristic evaluation of your key transactional pathways.",
    challenge: "Manual UX audits are slow, retrospective, and fail to scale across multi-brand and multi-market operator portfolios.",
    mechanics: "Jurnii UX runs automated usability scans across key player journeys, grading each against 12 core onboarding heuristics.",
    capabilities: [
      { title: "Heuristic Benchmarks", icon: "smile", desc: "Benchmark player flows against 12 core onboarding design principles." },
      { title: "Cognitive Fatigue Audits", icon: "zap", desc: "Isolate interaction points and redundant inputs causing player dropoffs during signup." },
      { title: "Onboarding Flow Scores", icon: "route", desc: "Grade transaction flow paths against leading global sportsbooks." }
    ],
    proofText: "Deliver board-ready comparative UX scores in minutes, not weeks, with Jurnii UX's AI-powered engine.",
    targetPersona: "Chief Product Officers leverage UX benchmarking to prioritize development sprints and vindicate roadmaps."
  },
  {
    slug: "solutions/customer-journey-benchmarking.html",
    name: "Customer Journey",
    fullName: "Customer Journey Benchmarking",
    kicker: "Benchmarking",
    lede: "Visualize player transition states and identify interaction friction points in high-value checkouts.",
    manifesto: "Optimize the path to first bet. Map complete player progression pathways from landing page to successful deposit to repair leakage funnels.",
    challenge: "Players abandon transactions at secure verification and wallet selection steps, but analytics logs fail to show the visual cause.",
    mechanics: "Jurnii models the visual flow of transactions, documenting friction thresholds and identifying design bottlenecks.",
    capabilities: [
      { title: "Transition State Maps", icon: "milestone", desc: "Model user progress through verification (KYC), wallet selection, and checkouts." },
      { title: "Friction Point Logs", icon: "alert-triangle", desc: "Flag redundant form entries, laggy inputs, and validation obstacles." },
      { title: "Dropoff Analytics", icon: "filter", desc: "Track where high-value customers abandon onboarding steps." }
    ],
    proofText: "Quantifying visual friction allows product teams to clear funnels, boosting conversion rate and player lifetime value.",
    targetPersona: "Heads of UX deploy journey benchmarking to repair leaky pipelines and secure player loyalty."
  },
  {
    slug: "solutions/market-positioning-benchmarking.html",
    name: "Market Positioning",
    fullName: "Market Positioning Benchmarking",
    kicker: "Benchmarking",
    lede: "Quantify design quality and promotional value to identify regional market growth opportunities.",
    manifesto: "Secure regional market share. Map your portfolio's visual UX grade and bonus structures against target competitors to identify strategic regional growth zones.",
    challenge: "Entering a new jurisdiction is high-risk when operators are blind to the exact design expectations and promotional rules of the local market.",
    mechanics: "We analyze local competitors, mapping their visual scores and Promo Richness Index positions to outline regional growth blueprints.",
    capabilities: [
      { title: "Regional Strategy Matrix", icon: "globe", desc: "Map competitor strength and design grades across target states and countries." },
      { title: "Market Gaps Detection", icon: "plus-circle", desc: "Spot underserved visual preferences or promotional voids in target regions." },
      { title: "Competitor Strength Index", icon: "shield", desc: "Identify highly entrenched operators to refine acquisition spend strategies." }
    ],
    proofText: "Calibrating products against regional benchmarks accelerates time-to-market and stabilizes acquisition.",
    targetPersona: "Chief Executive Officers deploy market benchmarking to guide international expansion budgets."
  },
  {
    slug: "solutions/marketing-roi-attribution.html",
    name: "Marketing ROI",
    fullName: "Marketing ROI Attribution",
    kicker: "Attribution",
    lede: "Correlate marketing yield directly with competitor promotions and onboarding design changes.",
    manifesto: "Isolate true campaign impact. Determine how competitor deposit boosts and copywriting pivots influence your regional acquisition yield and CPA rates.",
    challenge: "Marketing attribution is broken, relying on last-click attribution that ignores competitor promotions and regional UX quality.",
    mechanics: "Cortex correlates competitor promotional richness and internal UX scores with campaign yield to reveal true marketing contribution.",
    capabilities: [
      { title: "CPA Correlation Engine", icon: "pie-chart", desc: "Correlate customer acquisition cost fluctuations against competitor campaign shifts." },
      { title: "Promo Richness Modeling", icon: "gift", desc: "Measure player acquisition yields against rival bonus and wagering conditions." },
      { title: "Yield Protection Planning", icon: "shield", desc: "Refine campaign budgets when competitor promo richness spikes." }
    ],
    proofText: "Cortex models have proven their efficiency, surfacing massive attribution corrections on millions of dollars of budget.",
    targetPersona: "Chief Marketing Officers use Cortex to justify marketing mix updates and defend acquisition budgets."
  },
  {
    slug: "solutions/cross-channel-attribution.html",
    name: "Cross-Channel",
    fullName: "Cross-Channel Attribution",
    kicker: "Attribution",
    lede: "Model competitor campaign impacts across digital programmatic, social, and search channels.",
    manifesto: "Gain complete cross-channel foresight. Map competitor campaign footprints to understand where acquisition spend is most defensive and high-yielding.",
    challenge: "Programmatic, affiliate, and search budgets operate in siloes, leaving operators blind to the combined impact of competitive moves.",
    mechanics: "Cortex integrates competitor promotion streams with cross-channel spend data to model the defensive strength of each channel.",
    capabilities: [
      { title: "Channel Footprint Analysis", icon: "split", desc: "Map competitor campaign footprints across programmatic, search, and social." },
      { title: "Spend Efficiency Audits", icon: "dollar-sign", desc: "Identify channels where rival promo richness is driving customer acquisition spikes." },
      { title: "Defensive Budgeting", icon: "sliders", desc: "Calibrate cross-channel spend strategies based on real-time competitor campaign shifts." }
    ],
    proofText: "Optimizing multi-channel allocation ensures operators preserve player acquisition yields in aggressive markets.",
    targetPersona: "Heads of Acquisition use Jurnii cross-channel data to balance programmatic bids with CRM retention campaigns."
  },
  {
    slug: "solutions/marketing-mix-modeling-attribution.html",
    name: "Marketing Mix Modeling",
    fullName: "Marketing Mix Modeling Attribution",
    kicker: "Attribution",
    lede: "Feed structured, clean competitor promotional metrics directly into local analytics data warehouses.",
    manifesto: "Build automated, data-driven marketing models. Streamline competitor promotional tracking data to feed custom predictive models and yield optimization boards.",
    challenge: "Data scientists waste 80% of their time scraping and normalizing competitor data instead of modeling budget allocation.",
    mechanics: "Jurnii streams clean competitor data straight into local data warehouses, ready for direct MMM processing.",
    capabilities: [
      { title: "Structured Data Pipes", icon: "database", desc: "Export competitor campaign histories via automated JSON or CSV feeds." },
      { title: "Predictive Spend Engines", icon: "bar-chart-3", desc: "Model acquisition yields based on historical regional competitor promo patterns." },
      { title: "Cortex API Integration", icon: "network", desc: "Synchronize local player analytics databases with comprehensive competitor datasets." }
    ],
    proofText: "Seamless API integrations eliminate manual data compilation, supplying robust modeling data instantly.",
    targetPersona: "Chief Marketing Officers use Cortex MMM pipes to provide board-ready marketing yield models."
  },
  {
    slug: "solutions/market-growth-attribution.html",
    name: "Market Growth",
    fullName: "Market Growth Attribution",
    kicker: "Attribution",
    lede: "Attribute regional user acquisition and market share gains to visual design updates.",
    manifesto: "Prove design return on investment. Quantify how resolved player journey friction directly translates into market share gains and user onboarding yields.",
    challenge: "Design and product teams struggle to prove the direct revenue contribution of usability improvements to the board.",
    mechanics: "Cortex models player signup yield fluctuations against resolved Jurnii UX audit findings, proving design ROI.",
    capabilities: [
      { title: "UX ROI Attribution", icon: "trending-up", desc: "Correlate design system improvements directly with customer onboarding rates." },
      { title: "Regional Growth Logs", icon: "globe", desc: "Audit market share growth following targeted usability and visual refinement sprints." },
      { title: "Executive Yield Summaries", icon: "award", desc: "Present structured design and commercial conversion correlations directly to product leadership." }
    ],
    proofText: "Proving design contribution aligns product development goals directly with operator revenue expansion.",
    targetPersona: "Chief Product Officers deploy UX ROI models to secure investment for core product infrastructure."
  },
  {
    slug: "solutions/conversion-rate-optimization.html",
    name: "Conversion Rate",
    fullName: "Conversion Rate Optimization",
    kicker: "Optimization",
    lede: "Isolate and repair player conversion leaks inside high-security registration and deposit funnels.",
    manifesto: "Maximize player signup yields. Calibrate checkout fields, security badges, and layout aesthetics to minimize abandonment and accelerate active conversions.",
    challenge: "Minor UX details in registration and KYC checkpoints cause silent abandonment, draining marketing budgets.",
    mechanics: "Jurnii UX identifies exact usability issues, ranking them by severity so development teams can clear funnels immediately.",
    capabilities: [
      { title: "Friction Minimization", icon: "percent", desc: "Isolate and remove fields causing player dropoffs during verification." },
      { title: "Checkout Redesigns", icon: "layout", desc: "Adopt verified, high-converting checkout grids and deposit button configurations." },
      { title: "A/B Benchmark Sprints", icon: "check-circle", desc: "Validate interface revisions directly against leading sportsbook portals." }
    ],
    proofText: "Targeted usability adjustments recover lost players, directly boosting campaign acquisition yields.",
    targetPersona: "Heads of UX use conversion optimization to optimize mobile flows and outpace competitors."
  },
  {
    slug: "solutions/life-time-value-optimization.html",
    name: "Life Time Value",
    fullName: "Life Time Value Optimization",
    kicker: "Optimization",
    lede: "Boost player loyalty and retention by auditing layout usability and visual experience.",
    manifesto: "Protect customer lifetime value. Audit post-login betting boards, loyalty perks UI, and deposit ease to build deep visual trust and engagement.",
    challenge: "iGaming players hold multiple accounts, and will immediately defect if their post-login betting experience is slow or confusing.",
    mechanics: "Jurnii UX benchmarks post-login dashboards and reward pages, highlighting layout upgrades that secure player loyalty.",
    capabilities: [
      { title: "Retention Audits", icon: "heart", desc: "Isolate usability friction points causing player churn post-registration." },
      { title: "Loyalty UI Evaluation", icon: "award", desc: "Optimize presentation of player clubs, loyalty milestones, and reward claims." },
      { title: "Engagement Logs", icon: "activity", desc: "Monitor betslip usability and payout speed parameters systematically." }
    ],
    proofText: "Optimizing layouts fosters visual trust, encouraging recurring deposits and securing LTV.",
    targetPersona: "Heads of CRM use usability audits to build high-converting reward pages and VIP dashboards."
  },
  {
    slug: "solutions/churn-rate-optimization.html",
    name: "Churn Rate",
    fullName: "Churn Rate Optimization",
    kicker: "Optimization",
    lede: "Identify and prevent customer loss by analyzing competitor promotions and onboarding updates.",
    manifesto: "Combat player churn proactively. Track competitor retention campaigns and usability enhancements that are pulling players away from your platform.",
    challenge: "Traditional retention strategies are reactive, attempting to recover players only after they have already defected.",
    mechanics: "Jurnii 360 warns CRM teams when competitors deploy highly generous retention offers, enabling timely defensive pricing.",
    capabilities: [
      { title: "Competitor Move Warnings", icon: "user-minus", desc: "Receive alerts when rivals introduce high-richness loyalty promos in your region." },
      { title: "Product Gap Analysis", icon: "plus-circle", desc: "Isolate product features rivals are deploying to secure active customer retention." },
      { title: "Margin Calibration Sprints", icon: "sliders", desc: "Re-calibrate payout metrics to protect yields when competitor churn triggers spike." }
    ],
    proofText: "Defending player retention proactively preserves long-term net gaming revenue.",
    targetPersona: "Chief Commercial Officers deploy churn alerts to protect active margins in aggressive markets."
  },
  {
    slug: "solutions/customer-aquistion-cost-optimization.html",
    name: "Customer Aquistion Cost",
    fullName: "Customer Aquistion Cost Optimization",
    kicker: "Optimization",
    lede: "Decrease player acquisition costs by resolving player onboarding friction and optimizing layouts.",
    manifesto: "Achieve acquisition efficiency. Lower overall customer acquisition cost by securing registration pathways and optimizing welcome offer layouts using data-backed designs.",
    challenge: "High customer acquisition costs (CAC) drain marketing budgets, eroding operator NGR in highly competitive regions.",
    mechanics: "Jurnii UX and 360 optimize landing pages and signup paths, ensuring every click translates to a successful conversion.",
    capabilities: [
      { title: "CPA Reduction Engine", icon: "shopping-bag", desc: "Correlate resolved player journey friction directly with reduced marketing CPA." },
      { title: "Welcome Page Optimization", icon: "layout", desc: "Refine landing zone layouts, button spacing, and trust badges systematically." },
      { title: "Promo Calibrators", icon: "sliders", desc: "Deploy ideal signup bonuses and wagering rules calculated to lower customer CAC." }
    ],
    proofText: "Improving landing page conversion recovers acquisition spend, directly boosting promotional ROI.",
    targetPersona: "Chief Marketing Officers use CAC optimization to optimize digital campaigns and improve media ROAS."
  }
];

// Rich, multi-section layout template
function getPageHTML(metaTitle, metaDesc, kicker, title, lede, manifesto, capabilities, levelPrefix, isFeature, challenge, mechanics, proofText, targetPersona) {
  const typeLabel = isFeature ? "Feature" : "Solution";
  const parentName = isFeature ? "Features" : "Solutions";
  const parentSlug = isFeature ? "features" : "solutions";
  const sectionHead = isFeature ? "Strategic Capabilities" : "Operational Capabilities";
  
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

    <!-- The iGaming Commercial Challenge Section -->
    <section class="challenge-section" style="padding: 100px 0; background: var(--background);">
      <div class="container" style="max-width: 1100px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;">
          <div>
            <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">The iGaming Challenge</span>
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
          <h2 class="h2-section" style="font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin: 0 0 12px 0;">${sectionHead}</h2>
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
            <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Cortex Attribution & NGR Impact</span>
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
  const html = getPageHTML(item.fullName, item.lede, item.kicker, item.fullName, item.lede, item.manifesto, item.capabilities, '../', true, item.challenge, item.mechanics, item.proofText, item.targetPersona);
  fs.writeFileSync(itemFilePath, html, 'utf8');
  console.log('Generated Feature LP:', item.slug);
});

// Generate the solution pages
solutionsData.forEach(item => {
  const itemFilePath = path.join(root, item.slug);
  ensureDirectoryExistence(itemFilePath);
  const html = getPageHTML(item.fullName, item.lede, item.kicker, item.fullName, item.lede, item.manifesto, item.capabilities, '../', false, item.challenge, item.mechanics, item.proofText, item.targetPersona);
  fs.writeFileSync(itemFilePath, html, 'utf8');
  console.log('Generated Solution LP:', item.slug);
});

console.log('Successfully generated all 32 expanded features and solutions pages!');
