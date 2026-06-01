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
    manifesto: "Never let a competitor promotion go unnoticed. Jurnii monitors active sign-up offers across key regulated jurisdictions, helping operators calibrate margins, protect Net Gaming Revenue (NGR), and acquire players dynamically in high-volatility environments.",
    challenge: "In highly commoditised gaming jurisdictions where B2B platform stacks converge, operators waste millions copying rival promo terms blind. Manual compilation of wagering requirements and bonus values takes weeks, leaving CRM and trading teams two steps behind the market and causing severe margin dilution.",
    mechanics: "Using Jurnii 360's continuous tracking engine, Jurnii maps competitive bonus terms, welcome incentives, and CRM triggers across 35 regulated markets simultaneously. Our platform normalizes and scores offer generosity through the proprietary Promo Richness Index to deliver instant strategic clarity.",
    capabilities: [
      { title: "Wagering Hurdles Tracking", icon: "tag", desc: "Compare deposit wagering requirements, play-through multipliers, and spin constraints side-by-side to understand true player acquisition effort and protect operator hold rates." },
      { title: "Geo-Targeted Audits", icon: "globe", desc: "Isolate regional campaign variations deployed by rival conglomerates in specific states, provinces, or countries to exploit promotional voids and optimize local customer acquisition cost." },
      { title: "Active Signup Scanning", icon: "activity", desc: "Detect and log newly introduced welcome offers within minutes of launching to empower trading, CRM, and customer marketing response teams instantly." }
    ],
    proofText: "Jurnii 360 tracks 100% of competitor moves automatically, scraping over 1,000 promotions weekly across key regulated jurisdictions.",
    targetPersona: "Chief Commercial Officers utilize this feature to safeguard operator margins and maintain active market parity."
  },
  {
    slug: "features/competitor-positioning.html",
    name: "Positioning",
    fullName: "Competitor Positioning Analytics",
    kicker: "Competitor Core",
    lede: "Analyze rival market claims, value propositions, and unique landing page positioning hooks.",
    manifesto: "Identify how competitors differentiate themselves in saturated markets. Jurnii continuously maps promotional angles and copywriting claims to highlight underserved positioning opportunities in sports and casino markets, driving acquisition yield higher.",
    challenge: "Operators copy-paste generic slogans like 'fast payouts' or 'widest markets' without visual or textual distinction. This lack of differentiation drives customer acquisition costs (CAC) higher as bidding wars intensify on identical copy hooks.",
    mechanics: "Jurnii parses all on-site copy and homepage banner states, cataloging active value claims and layout structures. It maps the visual dominance of competitive claims to identify untapped promotional angles and copywriting vulnerabilities.",
    capabilities: [
      { title: "Value Claim Analysis", icon: "award", desc: "Extract and index all digital copywriting claims, tracking the exact focus of competitor messaging across key player landing zones and signup funnels." },
      { title: "Differentiated Angles", icon: "compass", desc: "Spot messaging voids in rival advertising matrices to launch highly unique counter-campaigns that stand out in saturated market segments." },
      { title: "Competitive Matrix Maps", icon: "layers", desc: "Visualize brand placements based on pricing structures, visual premium qualities, and overall ease-of-use indicators relative to regulatory frameworks." }
    ],
    proofText: "By analyzing 300+ global brands, Jurnii helps positioning strategy transition from subjective guesswork to objective, data-backed evidence.",
    targetPersona: "Chief Marketing Officers deploy Jurnii positioning maps to defend brand share and optimize digital spend."
  },
  {
    slug: "features/competitor-comparison.html",
    name: "Comparison",
    fullName: "Competitor Comparison Engines",
    kicker: "Competitor Core",
    lede: "Compare player acquisition pathways, sign-up structures, and deposit requirements side-by-side.",
    manifesto: "Run detailed mathematical comparisons of competitive player flows. Calibrate your operator margins by evaluating wagering rules and bonus depth directly against major regional operators on a single canvas.",
    challenge: "With 70-80% of players holding accounts with 3-5 operators simultaneously, loyalty is fragile. If your signup requires two more clicks or has slower KYC checks than a rival, players abandon the funnel permanently.",
    mechanics: "Jurnii Normalizes competitive flows into standardized user journey sequences. It maps steps, inputs, KYC checks, and payment integrations side-by-side with global best practices to pinpoint conversion rate leaks.",
    capabilities: [
      { title: "Side-by-Side Scoring", icon: "git-compare", desc: "Evaluate registration, verification (KYC), and payment pipelines against three chosen rivals simultaneously under real-world mobile network conditions." },
      { title: "Bonus Calibration Matrix", icon: "gift", desc: "Compare wagering multipliers and free spin richness across target categories to determine competitive generosity and prevent CRM margin dilution." },
      { title: "Friction Auditing", icon: "filter", desc: "Compare click counts, form requirements, and page load delays across competitor checkout pathways to identify strategic interface vulnerabilities." }
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
    manifesto: "Uncover competitor playbooks systematically. Synthesize months of competitive campaign data to identify launch frequencies, product milestones, and strategic market timing across multiple regulated markets.",
    challenge: "Siloed data prevents executive alignment. Product, marketing, and commercial teams operate on separate gut-feels rather than shared market truths, leading to bad budget allocations during peak sporting seasons.",
    mechanics: "Jurnii compiles continuous market tracking into executive-ready dashboards and longitudinal reports, enabling strategic planning at 85% confidence rather than reactive 50% guesses.",
    capabilities: [
      { title: "Historical Sequencing", icon: "calendar", desc: "Chart competitor campaign durations over seasons to anticipate product updates, mobile updates, and aggressive marketing spend pushes." },
      { title: "Margin Calibration Sprints", icon: "trending-up", desc: "Evaluate average competitor bonus payout metrics to benchmark your net yield efficiency and hold rates against regional peers." },
      { title: "Executive Summaries", icon: "file-text", desc: "Generate board-ready competitor profiles, market generics, and compliance histories in a single click for fast corporate planning." }
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
    manifesto: "Transform promotions into machine-readable data. Feed structured competitor promotion files directly into local modeling systems, pricing algorithms, or internal dashboards for always-on visibility.",
    challenge: "Scraping competitor campaigns by hand is slow, error-prone, and cannot scale across 400+ weekly offers and 5,000+ monthly sports boosts. This leaves data science teams starved of timely modeling datasets.",
    mechanics: "Jurnii delivers direct API endpoints and webhook channels that stream normalized, structured campaign data into your database, CRM, or Marketing Mix Model (MMM) for rapid processing.",
    capabilities: [
      { title: "Structured API Access", icon: "database", desc: "Feed clean competitor offer JSON data directly into your CRM or player platforms for dynamic margin pricing and acquisition calibration." },
      { title: "Historical Archive", icon: "archive", desc: "Access comprehensive records of expired competitor promos to research holiday trends and winter seasonal playbooks across jurisdictions." },
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
    manifesto: "Stay continuously connected to rival movements. Monitor live landing page visual edits and copywriting adjustments as they happen across multi-brand operators to preserve your competitive edge.",
    challenge: "Competitors launch aggressive welcome campaigns during major sporting events, catching your commercial team off-guard and eroding active market share in a matter of hours.",
    mechanics: "Our scraper network crawls operator domains multiple times daily, tracking DOM shifts, image updates, CSS adjustments, and CTA copywriting edits under simulated user flows.",
    capabilities: [
      { title: "Visual Shift Tracking", icon: "eye", desc: "Detect visual interface alterations, branding shifts, and structural design adjustments on competitive pages the moment they go live." },
      { title: "Real-time Monitors", icon: "refresh-cw", desc: "Run continuous server-side monitors to detect active page changes, pricing models, payment portals, and affiliate links." },
      { title: "Changelog Reporting", icon: "clipboard", desc: "Compile daily logs detailing rival feature introductions, navigation shifts, digital wallet integrations, and verification alterations." }
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
    manifesto: "React instantly to market events. Receive direct alerts the exact moment a competitor adjusts their registration, deposit, or retention bonuses to maintain absolute parity.",
    challenge: "Missing a rival’s major campaign shift means playing catch-up for weeks while high-value players (who drive 80% of revenue) defect to more generous platforms.",
    mechanics: "Configure threshold triggers based on bonus value, wagering multiples, or visual shifts, sending push updates to your commercial team channels via Slack or webhooks.",
    capabilities: [
      { title: "Multi-channel Alerts", icon: "bell", desc: "Configure custom push alerts via Slack, Microsoft Teams, email, or direct webhook integrations into trading platforms." },
      { title: "Bonus Shift Detection", icon: "sliders", desc: "Trigger notifications only when wagering terms, deposit percentages, or free spin values shift beyond predefined thresholds." },
      { title: "Custom Thresholds", icon: "percent", desc: "Define triggers based on maximum bonus values or promotional payout richness indices to avoid alert fatigue." }
    ],
    proofText: "Always-on competitive surveillance ensures your team is never blindsided by competitor campaigns.",
    targetPersona: "Chief Commercial Officers set up alerts for local competitor moves, ensuring their brand remains a market leader."
  },
  {
    slug: "features/competitor-ai-insights.html",
    name: "AI Insights",
    fullName: "Competitor AI Insights & Predictions",
    kicker: "Competitor Feed",
    lede: "Deploy advanced ML models to predict competitor marketing pushes and summarize campaign angles.",
    manifesto: "Gain predictive foresight in competitive markets. Leverage specialized neural nets to summarize massive campaign databases and predict rival product timing and advertising strategies.",
    challenge: "Raw competitor data is overwhelming. Sorting through thousands of sports boosts, casino offers, and copy variations manually prevents analysts from identifying real strategic patterns.",
    mechanics: "Jurnii utilizes proprietary domain-specific ML models to digest competitive databases, classifying campaigns, detecting trends, and predicting launch windows with 85% confidence.",
    capabilities: [
      { title: "Timing Prediction", icon: "brain", desc: "Anticipate rival marketing deployments and product launches using deep temporal predictive models trained on historical operator behaviors." },
      { title: "Ad Copy Summaries", icon: "message-square", desc: "Utilize natural language processing to isolate winning competitor copywriting hooks and visual messaging angles across landing zones." },
      { title: "Anomaly Spotting", icon: "alert-circle", desc: "Flag unusual competitor acquisition spikes, non-standard bonus structures, or regulatory compliance failures instantly." }
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
    manifesto: "Establish a single metric for design and conversion quality. Aggregate visual, usability, speed, and onboarding indicators to score your brand portfolios side-by-side with global peers.",
    challenge: "Design discussions are plagued by subjectivity. Executive teams debate colors and fonts instead of focusing on verified conversion friction that drains acquisition efficiency.",
    mechanics: "Jurnii UX normalizes hundreds of design, compliance, and performance metrics into a single, authoritative, commercially weighted Meta Score for board reporting.",
    capabilities: [
      { title: "Unified Visual Index", icon: "sparkles", desc: "Combine multiple UX vectors, technical vitals, and accessibility factors into a single, board-ready brand grade." },
      { title: "Portfolio Scoring", icon: "layers", desc: "Score and compare internal sister brands and regional domains under one standard metric system to track performance." },
      { title: "Executive Benchmark Dashboards", icon: "bar-chart", desc: "Present high-fidelity design metrics directly to product, marketing, and compliance leadership with absolute clarity." }
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
    manifesto: "Adopt modern UX trends ahead of the competition. Track the evolution of gaming interfaces, dark mode styles, and betslip integrations across global markets to ensure design relevance.",
    challenge: "Product roadmaps are built in silos. Operators miss significant market shifts like digital wallets or instant KYC integrations until they have already lost strategic market share.",
    mechanics: "Jurnii constantly indexes visual and functional elements of leading operators, reporting on adoption speeds of new designs and UI patterns to guide product priorities.",
    capabilities: [
      { title: "Design System Mapping", icon: "palette", desc: "Identify color palettes, border styling, and layout spacing systems gaining regional traction across key demographics." },
      { title: "Feature Adoption Rates", icon: "check-square", desc: "Measure how fast rival operators deploy new digital wallet or quick-bet features to guide product prioritization decisions." },
      { title: "Global Shift Analysis", icon: "globe", desc: "Review visual design trends in pioneering markets like Sweden, the UK, and Ontario to anticipate local structural shifts." }
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
    manifesto: "Standardize aesthetic measurements across competitors. Automatically catalog font families, button border-radius systems, and visual padding to understand contemporary iGaming design standards.",
    challenge: "Aesthetic consistency is hard to enforce across multiple regional brands, resulting in visual drift, technical debt, and a compromised premium brand feel.",
    mechanics: "Jurnii's CSS scraper normalizes styling properties, documenting typographic scales, font family combinations, spacing utilities, and visual variables automatically.",
    capabilities: [
      { title: "Style Sheet Scraping", icon: "code", desc: "Scrape and log CSS variables, layout spacing, and visual styling properties across competitor domains to benchmark technical execution." },
      { title: "Typography Analysis", icon: "type", desc: "Audit visual reading levels, typography hierarchy, and reading ease across player registration flows to prevent cognitive fatigue." },
      { title: "Theme Comparison Matrix", icon: "columns", desc: "Map brands across minimalist layouts, hyper-promotional patterns, or high-density gaming UIs to locate styling voids." }
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
    challenge: "Operators offer rich sign-up incentives but fail to convert players because the promotional design is cluttered, slow, or visually hard to read, diluting marketing spend.",
    mechanics: "Jurnii maps promotional banner real estate and layout formats to active bonus richness, indicating which visual formats drive optimal signup yield and lower acquisition CPA.",
    capabilities: [
      { title: "Copywriting Optimization", icon: "edit-3", desc: "Correlate player conversion yields against headline text lengths, CTA button positions, and terms visibility." },
      { title: "Banner Size Audits", icon: "layout", desc: "Measure how visual real estate allocation on homepages and affiliate landing zones influences player registration success." },
      { title: "Creative Performance Logs", icon: "activity", desc: "Map historical competitor banner deployments against promotional click-through indicators to model layout efficiency." }
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
    manifesto: "Eliminate latency before player abandonment. Measure and track core web vitals and mobile connection delays under simulated network loads directly against rivals to preserve NGR.",
    challenge: "10% of players drive 80% of revenue, and these high-value players are highly sensitive to latency. A 1-second delay in page load on checkout or betslip causes immediate abandonment.",
    mechanics: "Jurnii simulates real-world mobile connection scenarios to test operator domains, cataloging LCP, FID, and CLS scores side-by-side with regional competitors.",
    capabilities: [
      { title: "Core Web Vitals Auditing", icon: "zap", desc: "Track LCP, FID, and CLS scores dynamically under low-bandwidth mobile environments to catch performance drift." },
      { title: "Asset Size Monitoring", icon: "hard-drive", desc: "Monitor script file weights, asset packaging, and media optimization indicators to eliminate engineering bloat." },
      { title: "Competitive Speed Index", icon: "gauge", desc: "Rank operator checkout and betslip speed side-by-side with regional industry competitors to maintain speed supremacy." }
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
    challenge: "Usability evaluations are slow, expensive, and highly subjective when conducted by traditional design agencies, delaying sprint cycles by weeks.",
    mechanics: "Jurnii UX runs automated heuristic audits mapped across four dimensions, providing ranked recommendations to clear player onboarding pathways.",
    capabilities: [
      { title: "Heuristic Frameworks", icon: "check-circle", desc: "Evaluate experience against 12 core onboarding design criteria systematically to replace opinions with facts." },
      { title: "Cognitive Load Evaluation", icon: "activity", desc: "Spot redundant form fields, confusing terms layouts, and interactive elements causing checkout and registration leakage." },
      { title: "Error Recovery Audits", icon: "alert-triangle", desc: "Analyze validation prompts, instruction clarity, and error feedback systems across player signup flows." }
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
    challenge: "Players drop out of verification (KYC) funnels because the secure screens look generic, outdated, or confusing, causing a total collapse in visual trust.",
    mechanics: "We audit trust signals, compliance badges, SSL visibility, and secure layout designs to ensure interfaces project maximum authority and safety.",
    capabilities: [
      { title: "Trust Signals Scraping", icon: "shield", desc: "Log compliance logos, regulatory text, and payout certifications across landing zones to ensure regulatory safety." },
      { title: "Security Styling Audits", icon: "lock", desc: "Optimize password forms, terms checkboxes, and account verification panels to reassure players during security steps." },
      { title: "Visual Safety Rankings", icon: "eye", desc: "Grade player onboarding trust perceptions side-by-side with premier operator portals to locate visual drop-offs." }
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
    challenge: "Product and engineering teams struggle to prioritize bugs based on revenue, wasting development cycles on low-impact layout changes.",
    mechanics: "Jurnii ranks all audit findings by severity and commercial weight, providing a development checklist mapped directly to revenue consequences.",
    capabilities: [
      { title: "Actionable Sprints", icon: "clipboard-list", desc: "Obtain clean development task checklists to address identified user onboarding leaks with zero guesswork." },
      { title: "Visual Reference Cards", icon: "image", desc: "Match recommended UI corrections to verified industry-leading interface layouts for fast developer implementation." },
      { title: "Yield Impact Mapping", icon: "dollar-sign", desc: "Prioritize design updates based on estimated player conversion, acquisition impact, and NGR recovery potential." }
    ],
    proofText: "Commercially weighted recommendations align product and business priorities around a shared roadmap.",
    targetPersona: "Chief Product Officers use Jurnii recommendations to build bulletproof roadmap sprints."
  },
  {
    slug: "features/usability.html",
    name: "Usability",
    fullName: "Onboarding Usability Diagnostics",
    kicker: "UX Intelligence",
    lede: "Identify and eliminate registration and deposit funnel obstacles through automated heuristic mapping.",
    manifesto: "Optimize the first-mile experience. Jurnii UX usability audits replace subjective debates with structured, commercially weighted diagnostics that flag cognitive friction and technical blockers in player signup pathways.",
    challenge: "Operators lose up to 45% of prospective players during account verification and first deposit. Product teams struggle with vague analytics that indicate dropout locations but fail to reveal the root interface or cognitive causes, leading to misdirected development work.",
    mechanics: "Jurnii runs automated heuristic engines across player registration sequences, evaluating form complexity, field constraints, visual guidance, and error recovery states against 12 core design criteria.",
    capabilities: [
      { title: "Cognitive Load Reduction", icon: "activity", desc: "Detect excessive text inputs, confusing checkboxes, and redundant steps that fatigue players during registration." },
      { title: "Friction Point Scoring", icon: "bar-chart", desc: "Quantify and rank user flow interface hurdles mathematically based on conversion severity and NGR impact." },
      { title: "Validation Guidance Assert", icon: "check-square", desc: "Ensure inline form field verification instructions are clean, context-sensitive, and error-proof under mobile screens." }
    ],
    proofText: "Recover lost players and lower acquisition CPA by identifying key conversion leaks automatically.",
    targetPersona: "Heads of UX deploy usability diagnostics to align developer sprints with high-impact registration upgrades."
  },
  {
    slug: "features/performance.html",
    name: "Performance",
    fullName: "Core Web Vitals Speed Tracking",
    kicker: "UX Intelligence",
    lede: "Audit latency, page load speed, and script weight fluctuations under mobile network environments.",
    manifesto: "Speed is a critical commercial buffer. Jurnii monitors technical vitals across transactional pipelines to ensure that slow assets, heavy images, and unoptimized libraries do not compromise player holds.",
    challenge: "High-value players are highly sensitive to delay. A 1-second lag in betslip interaction or checkout load causes immediate customer defection to regional competitors, bleeding GGR silently.",
    mechanics: "Jurnii simulates real-world mobile network speeds, constantly auditing LCP, FID, and CLS across player landing zones, registration pipelines, and betslip portals.",
    capabilities: [
      { title: "Core Web Vitals Scans", icon: "zap", desc: "Monitor Largest Contentful Paint, First Input Delay, and Cumulative Layout Shift under restricted mobile bandwidth." },
      { title: "Asset Weight Auditing", icon: "hard-drive", desc: "Analyze CSS variables, script sizes, and image weights to locate optimization targets and eliminate engineering bloat." },
      { title: "LCP Attrition Correlator", icon: "trending-down", desc: "Correlate platform latency delays directly with funnel abandonment and player conversion drop-offs." }
    ],
    proofText: "Compressing page load limits player attrition, securing consistent NGR hold rates.",
    targetPersona: "Chief Operating Officers deploy performance tracking to defend transaction speed and prevent revenue leakage."
  },
  {
    slug: "features/journeys.html",
    name: "Journeys",
    fullName: "End-to-End Player Onboarding Journeys",
    kicker: "UX Intelligence",
    lede: "Map entire player conversion sequences from landing zone to verification and first deposit.",
    manifesto: "Understand player behavior across every touchpoint. Visualize transitions, KYC checkpoints, and payment gates as a single, continuous user journey to discover conversion leakage.",
    challenge: "Analytics platforms capture disconnected page hits, leaving teams blind to the actual visual states and interaction obstacles that players experience during verification.",
    mechanics: "Jurnii UX captures flow pathways, modeling transitions, KYC document upload prompts, and wallet setups into visual user journey maps.",
    capabilities: [
      { title: "Transition State Mapping", icon: "milestone", desc: "Model player progression stages from initial landing, through verification, to successful transactional funding." },
      { title: "Funnel Leak Auditing", icon: "filter", desc: "Isolate exact fields, buttons, or validation rules where registration momentum stalls and drop-off spikes." },
      { title: "Onboarding Path Compare", icon: "git-compare", desc: "Benchmark onboarding flow stages directly against three regional operators to identify competitive friction." }
    ],
    proofText: "Optimizing transitions heals leaky registration funnels, increasing player acquisition efficiency.",
    targetPersona: "Chief Product Officers utilize journey mapping to identify strategic conversion opportunities."
  },
  {
    slug: "features/indices.html",
    name: "Indices",
    fullName: "Cortex Intelligence Indices",
    kicker: "Cortex Core",
    lede: "Evaluate brand experience, visual design quality, and promotional value through normalized metrics.",
    manifesto: "Drive decisions from objective ratings. Cortex indexes hundreds of usability, technical speed, and campaign generosity variables into standardized benchmarks.",
    challenge: "Executive discussions about digital platforms suffer from subjective design opinions and marketing assumptions, leading to bad budget allocations.",
    mechanics: "Our intelligence engine crawls operators, converting visual, technical, and campaign attributes into normalized index scores.",
    capabilities: [
      { title: "Experience Scoring", icon: "sparkles", desc: "Combine usability, speed, and trust indicators into a board-ready Experience Index to track product growth." },
      { title: "Generosity Ratings", icon: "gift", desc: "Score competitor welcome incentives mathematically based on active wagering hurdles and rollover requirements." },
      { title: "Market Position Mapping", icon: "map", desc: "Visualize operator rankings across regional segments to identify strategic promotional and usability voids." }
    ],
    proofText: "Standardized indices replace subjective opinions with objective, board-ready facts.",
    targetPersona: "Chief Executive Officers utilize Jurnii indices to align board presentations and guide corporate growth."
  },
  {
    slug: "features/scenario-planning.html",
    name: "Scenario Planning",
    fullName: "Cortex Scenario Planning & Forecasts",
    kicker: "Cortex Core",
    lede: "Model the commercial yield effect of prospective budget reallocations and welcome offer shifts.",
    manifesto: "Test strategic decisions before deployment. Cortex simulates Net Gaming Revenue impact, hold rates, and acquisition CPA across multiple market scenarios.",
    challenge: "CMOs and CFOs allocate multi-million dollar campaign budgets blindly, relying on historical spreadsheet models that fail to account for active competitor surges.",
    mechanics: "Jurnii integrates active competitor promotions data with local player acquisition history to build forward predictive market simulations.",
    capabilities: [
      { title: "Causal Budget Simulators", icon: "sliders", desc: "Simulate NGR lift, player acquisition counts, and hold yield variations across prospective channel budget updates." },
      { title: "Generosity Volatility Models", icon: "activity", desc: "Model acquisition drop-off rates if regional rivals suddenly spike free spins or drop wagering requirements." },
      { title: "Defensive Pricing Tools", icon: "shield", desc: "Calculate the minimum bonus match and rollover target needed to defend regional market share during peaks." }
    ],
    proofText: "Simulating scenario forecasts ensures strategic confidence and protects operator margins.",
    targetPersona: "Chief Marketing Officers deploy scenario forecasting to secure campaign budgets and protect ROAS."
  },
  {
    slug: "features/ai-analytics-assistant.html",
    name: "AI Assistant",
    fullName: "Cortex AI Analytics Assistant",
    kicker: "Cortex Core",
    lede: "Query massive competitor campaign databases and internal attribution tables via natural language.",
    manifesto: "Get instant strategic answers. Our specialized, domain-trained AI parses market data to produce board-ready summaries and margin recommendations.",
    challenge: "Extracting clean competitor metrics or campaign attribution statistics requires weeks of manual database parsing and analyst coordination.",
    mechanics: "We utilize advanced domain-specific NLP models trained on historical iGaming metrics to translate complex data queries into clean reports.",
    capabilities: [
      { title: "Natural Language Querying", icon: "message-square", desc: "Query active competitive offers, regional speed metrics, and attribution models in plain conversational English." },
      { title: "Automated Report Builders", icon: "file-text", desc: "Compile high-fidelity, board-ready competitor summaries and marketing attribution sheets in a single click." },
      { title: "Predictive Alerts Feed", icon: "brain", desc: "Receive automated notifications on predicted competitor promotions and budget opportunities generated by ML." }
    ],
    proofText: "Domain-specific models save hours of database scripting, delivering instant clarity.",
    targetPersona: "Heads of CRM use the AI Assistant to model retention rules and prevent customer churn."
  },
  {
    slug: "features/market-segmentation-targeting-analysis.html",
    name: "Targeting",
    fullName: "Market Segmentation & Targeting Analysis",
    kicker: "Cortex Core",
    lede: "Isolate highly valuable player personas and regional niches through predictive yield modeling.",
    manifesto: "Optimize customer acquisition yields. Segment target markets by player value, visual design tastes, and bonus sensitivity to maximize marketing efficiency.",
    challenge: "Operators run uniform campaigns that treat all players identically, resulting in low conversion, high acquisition costs, and wasted marketing spend.",
    mechanics: "Cortex groups player behavior, design preferences, and regional competitor promotions data to pinpoint high-converting audience segments.",
    capabilities: [
      { title: "Yield Modeling Grid", icon: "crosshair", desc: "Map audience segments against estimated lifetime value, promotional responsiveness, and overall acquisition CPA." },
      { title: "Design Taste Profiles", icon: "palette", desc: "Identify visual themes, layout preferences, and usability thresholds that drive conversion within target age groups." },
      { title: "Niche Opportunities Detector", icon: "compass", desc: "Spot regional demographic clusters underserved by competitor welcome offers to deploy high-yield campaigns." }
    ],
    proofText: "Targeting high-yield audience niches drives customer acquisition cost down, protecting margins.",
    targetPersona: "Chief Commercial Officers deploy segment targeting to balance acquisition targets and marketing spend."
  },
  {
    slug: "features/banner-creative-messaging-intelligence.html",
    name: "Creative Messaging",
    fullName: "Banner Creative & Messaging Intelligence",
    kicker: "Cortex Core",
    lede: "Audit visual banner layouts, value proposition claims, and copywriting formats dynamically.",
    manifesto: "Differentiate your brand. Track competitor banner designs, typographic priorities, and advertising claims to optimize marketing conversions.",
    challenge: "Creative teams design landing page banners and copywriting hooks in isolation, resulting in layout generics that fail to stand out.",
    mechanics: "We crawl competitor registration page states, logging banner sizes, primary copywriting hooks, CTA colors, and terms layout formats.",
    capabilities: [
      { title: "Copy Claim Tracking", icon: "edit-3", desc: "Index all copywriting claims, tracking the exact focus of competitor advertising hooks across jurisdictions." },
      { title: "Visual Real Estate Maps", icon: "layout", desc: "Audit how rival designers distribute page layout space between bonus terms and imagery." },
      { title: "Design Grid Auditing", icon: "columns", desc: "Benchmark design frameworks, color palettes, and typographic reading levels against industry top-performers." }
    ],
    proofText: "Designing banners backed by competitive context increases digital marketing yields.",
    targetPersona: "Chief Marketing Officers utilize messaging intelligence to refine copywriting hooks and lower CPA."
  },
  {
    slug: "features/promo-richness-index.html",
    name: "Promo Richness",
    fullName: "Promo Richness Index Calibrations",
    kicker: "Cortex Core",
    lede: "Calculate true promotional generosity mathematically based on wagering hurdles and rules.",
    manifesto: "Understand competitor generosity with absolute precision. Normalize deposits, wagering rollovers, and spin rules into a single comparable value score.",
    challenge: "Evaluating competitor welcome offers manually leads to bad margin pricing because the true promotional cost differs from the nominal bonus.",
    mechanics: "Our proprietary index weights bonus amounts, wagering play-through multipliers, and expiration rules to determine actual operator generosity.",
    capabilities: [
      { title: "Wagering Normalizers", icon: "sliders", desc: "Convert complex deposit matches and play-through terms into standardized mathematical operator generosity metrics." },
      { title: "Generosity Shift Triggers", icon: "trending-up", desc: "Detect when rival welcome offers suddenly become more generous, threatening regional player acquisition." },
      { title: "Hold Yield Modelers", icon: "dollar-sign", desc: "Model operator hold yields against different wagering targets to optimize promotional re-investment rates." }
    ],
    proofText: "Calibrating welcome offers prevents margin erosion, defending long-term operator EBITDA.",
    targetPersona: "Chief Commercial Officers use the Richness Index to refine CRM loyalty programs and welcome targets."
  },
  {
    slug: "features/brand-performance.html",
    name: "Brand Performance",
    fullName: "Brand Technical Performance Speed",
    kicker: "Brand Performance",
    lede: "Measure page load speeds and technical core web vitals under real mobile connections.",
    manifesto: "Protect player holds from technical friction. Jurnii monitors page rendering delays and layout shifts across transactional paths to keep customer conversions high.",
    challenge: "Product and engineering teams suffer from slow feedback cycles, failing to catch script bloat or heavy assets that trigger player drop-off.",
    mechanics: "We simulate regional mobile network latency to test operator domains, grading LCP, FID, and CLS scores side-by-side with rivals.",
    capabilities: [
      { title: "Core Vitals Monitoring", icon: "zap", desc: "Track mobile Largest Contentful Paint and Cumulative Layout Shift in low-bandwidth regional environments." },
      { title: "Script Payload Scans", icon: "hard-drive", desc: "Audit layout CSS weight, script libraries, and uncompressed graphics to eliminate conversion-killing latency." },
      { title: "Technical Speed Index", icon: "gauge", desc: "Rank operator registration and transaction speed directly against regional competitors to maintain speed supremacy." }
    ],
    proofText: "Eliminating latency drops player attrition, stabilizing Net Gaming Revenue during traffic sweeps.",
    targetPersona: "Chief Operating Officers deploy technical audits to protect checkout pathways and secure holds."
  },
  {
    slug: "features/brand-perception.html",
    name: "Brand Perception",
    fullName: "Brand Perception & Visual Safety",
    kicker: "Brand Performance",
    lede: "Audit safety signals, regulatory trust badges, and data privacy layouts across secure flows.",
    manifesto: "Maximize verification conversions by projecting authority. Audit how compliance badges, secure SSL signals, and checkbox styling impact player signup trust.",
    challenge: "Prospects abandon KYC sequences because verification forms look generic, outdated, or lack visible security indicators, causing a collapse in trust.",
    mechanics: "Jurnii audits trust indicators, privacy styling, and secure layout signals side-by-side with premier operator portals to locate visual drop-offs.",
    capabilities: [
      { title: "Trust Signals Indexing", icon: "shield", desc: "Audit presence of compliance badges, licensing logos, and secure certifications across landing zones." },
      { title: "KYC Security Styling", icon: "lock", desc: "Optimize password inputs, verification prompts, and legal checkboxes to reassure players during signup steps." },
      { title: "Visual Authority Score", icon: "eye", desc: "Benchmark your brand trust presentation directly against leading regional competitors to ensure security compliance." }
    ],
    proofText: "Building visible safety directly drives conversion on high-security transactional funnels.",
    targetPersona: "Heads of CRM deploy trust benchmarking to improve player retention and secure verification funnels."
  },
  {
    slug: "features/ai-snapshot-reports.html",
    name: "AI Reports",
    fullName: "AI Snapshot Competitor Reports",
    kicker: "Cortex Core",
    lede: "Generate board-ready competitor campaign intelligence summaries with a single click.",
    manifesto: "Stay aligned across departments. AI Snapshot compiles continuous competitor monitoring into executive-ready reports, summarizing campaign trends.",
    challenge: "Commercial analysts waste hours copying metrics into slides before board meetings, delaying strategy and limiting active response times.",
    mechanics: "We synthesize complex market tracking files, copywriting changes, and index scores into comprehensive corporate briefings.",
    capabilities: [
      { title: "One-Click Summaries", icon: "file-text", desc: "Create high-fidelity strategic summaries detailing competitor promotion adjustments and styling pivots." },
      { title: "NGR Volatility Forecasts", icon: "trending-up", desc: "Estimate the EBITDA risk of competitor welcome offer upgrades across key regional jurisdictions." },
      { title: "Cross-Team Syncing", icon: "share-2", desc: "Distribute structured PDF or HTML competitor briefings straight to product, marketing, and trading desks." }
    ],
    proofText: "Board-ready competitor profiles streamline M&A due diligence and align corporate strategy.",
    targetPersona: "Chief Executive Officers use AI Snapshot to align board presentations and competitive strategy."
  },
  {
    slug: "features/causal-impact-mmm-attribution.html",
    name: "Causal Impact",
    fullName: "Causal Impact & MMM Attribution",
    kicker: "Cortex Core",
    lede: "Feed structured competitor promotions variables into local analytics data warehouses.",
    manifesto: "Isolate campaign contribution accurately. Feed clean competitor promotional tracking data directly into Marketing Mix Models (MMM).",
    challenge: "Data science teams spend 80% of their time manual-scraping and cleaning competitor promotions datasets instead of modeling budget attribution.",
    mechanics: "Cortex exports machine-readable CSV or JSON datasets of competitor welcome matches, play-throughs, and active spin counts.",
    capabilities: [
      { title: "Structured Promotions Feed", icon: "database", desc: "Export clean, structured historical competitor campaigns data straight into local predictive data repositories." },
      { title: "LTV Contribution Modeling", icon: "bar-chart", desc: "Model player value fluctuations against rival welcome bonus shifts to optimize promotional allocations." },
      { title: "Causal Modeling Endpoints", icon: "code", desc: "Feed verified pricing and generosity indices into local attribution neural networks via clean APIs." }
    ],
    proofText: "Structured promotional datasets eliminate the complexity of manual web scraping.",
    targetPersona: "Chief Marketing Officers utilize causal impact modeling to validate multi-million dollar programmatic channels."
  },
  {
    slug: "features/competitor-promotion-tracking.html",
    name: "Competitor Promos",
    fullName: "Competitor Promotion Auditing",
    kicker: "Competitor Core",
    lede: "Monitor competitor welcome bonuses, active sign-up targets, and wagering rollovers.",
    manifesto: "Never let a competitor move impact your conversions. Jurnii continuously maps sign-up offers across key regional markets to defend your margins.",
    challenge: "Operators waste millions copy-pasting rival sign-up terms without knowing their true player value, eroding yields.",
    mechanics: "Jurnii captures active sign-up offers, deposit requirements, and spins across operators in 35 regulated markets.",
    capabilities: [
      { title: "Active Offer Monitoring", icon: "tag", desc: "Log competitor sports boosts and welcome match modifications within minutes of deployment." },
      { title: "Regional Campaign Scans", icon: "globe", desc: "Track regional offer tweaks across key regulated states to identify localized promo gaps." },
      { title: "Wagering Decoder Engine", icon: "sliders", desc: "Translate complex promotional terms into structured play-through multipliers and deposit requirements." }
    ],
    proofText: "Track competitor campaigns automatically, compressing active reaction times.",
    targetPersona: "Chief Commercial Officers use promotions tracking to safeguard margins and secure holds."
  },
  {
    slug: "features/cross-channel-gantt-planning.html",
    name: "Gantt Planning",
    fullName: "Cross-Channel Gantt Planning",
    kicker: "Cortex Core",
    lede: "Visualize competitor promotional duration and launch frequency on a unified timeline.",
    manifesto: "Anticipate competitive marketing sweeps. Map seasonal campaign patterns across rivals to calibrate budget schedules.",
    challenge: "Marketing and CRM teams schedule seasonal pushes in silos, leaving them vulnerable to rival promotion sweeps during peak sporting events.",
    mechanics: "We organize months of historical competitor marketing deployments into structured interactive chronological timelines.",
    capabilities: [
      { title: "Chronological Maps", icon: "calendar", desc: "Chart rival campaign timelines over seasonal windows to predict mobile updates and advertising pushes." },
      { title: "Duration Tracking", icon: "clock", desc: "Measure average competitor welcome offer lifespans to optimize regional CRM re-investment timing." },
      { title: "Defensive Schedulers", icon: "sliders", desc: "Align your retention and sportsbook boost campaigns to exploit competitive market voids." }
    ],
    proofText: "Longitudinal campaign modeling turns reactive guesses into defensible timing strategy.",
    targetPersona: "Chief Marketing Officers deploy timeline models to allocate advertising spend with timing confidence."
  },
  {
    slug: "features/finance-reconciliation-reporting.html",
    name: "Reconciliation",
    fullName: "Finance Reconciliation Reporting",
    kicker: "Cortex Core",
    lede: "Attribute fluctuations in player acquisition yields directly to competitor bonus surges.",
    manifesto: "Verify marketing cost efficiency. Reconcile player acquisition yields directly against competitor wagering matches.",
    challenge: "Finance teams struggle to attribute drops in player conversions, blaming internal product roadmaps when the cause is a competitor promotion surge.",
    mechanics: "Cortex correlates player sign-up flows with competitor generosity index surges to prove attribution factors.",
    capabilities: [
      { title: "EBITDA Protection Logs", icon: "shield", desc: "Isolate campaign cost spikes triggered by defensive promo matches, stabilizing marketing ROI metrics." },
      { title: "Yield Contribution Mapping", icon: "trending-up", desc: "Proportionally allocate conversion changes between internal product quality and competitor activities." },
      { title: "Margin Calibration Summaries", icon: "dollar-sign", desc: "Export board-ready financial reports that vindicate product and promotional budgets." }
    ],
    proofText: "Financial attribution modeling protects marketing spend integrity and operator margins.",
    targetPersona: "Chief Commercial Officers utilize finance reports to align budget allocations with the board."
  },
  {
    slug: "features/historical-database-reporting.html",
    name: "Historical Database",
    fullName: "Historical Promotions Database",
    kicker: "Cortex Core",
    lede: "Access historical campaign records and design styling properties across global operators.",
    manifesto: "Research past competitor moves systematically. Access exhaustive archives of competitor promotions, welcome layouts, and pricing histories.",
    challenge: "Product and creative teams struggle to find visual references of rival promotions from past seasons, copying ideas blindly.",
    mechanics: "We index years of global operator welcome layouts, copywriting claims, and campaign structures in a structured repository.",
    capabilities: [
      { title: "Longitudinal Campaign Search", icon: "search", desc: "Search historical welcome offers by operator name, state, and wagering requirements." },
      { title: "Visual Styling Archives", icon: "image", desc: "Access stylesheets, typographic setups, and banner design patterns deployed by rivals in past years." },
      { title: "Generosity Index Logs", icon: "trending-up", desc: "Map historical welcome offer generosity shifts to identify long-term structural market margins." }
    ],
    proofText: "Structured historical context enables product teams to design layouts with strategic confidence.",
    targetPersona: "Design Systems Architects deploy historical archives to establish strict brand benchmarks."
  },
  {
    slug: "features/journey-effectiveness.html",
    name: "Journey Effectiveness",
    fullName: "UX Journey Effectiveness Scoring",
    kicker: "UX Intelligence",
    lede: "Grade player transition momentum and friction levels across core transaction paths.",
    manifesto: "Benchmark player journey efficiency. Quantify ease-of-use, cognitive load levels, and error recovery across multi-brand funnels.",
    challenge: "Operators manage multiple brands across jurisdictions with no shared standard for user experience quality, causing high friction.",
    mechanics: "Jurnii UX measures steps, input rules, and delays across target sequences to grade journey success.",
    capabilities: [
      { title: "Conversion Momentum Index", icon: "activity", desc: "Grade registration, verification, and deposit ease into a single board-ready experience indicator." },
      { title: "Redundant Field Detection", icon: "user-minus", desc: "Flag form fields, legal panels, or validation checks that trigger cognitive fatigue and abandonment." },
      { title: "Competitor Flow Comparisons", icon: "git-compare", desc: "Compare player transition pathways side-by-side with regional top-performers to guide updates." }
    ],
    proofText: "Quantifying visual friction allows product teams to clear funnels and boost loyalty.",
    targetPersona: "Chief Product Officers leverage effectiveness scores to prioritize feature sprints."
  },
  {
    slug: "features/mmm-ready-data-export.html",
    name: "MMM Export",
    fullName: "MMM-Ready Data Export Pipes",
    kicker: "Cortex Core",
    lede: "Streamline competitor campaign indices directly into internal modeling databases.",
    manifesto: "Feed structured market variables straight to data science workflows. Access raw, normalized datasets for advanced modeling.",
    challenge: "Scraping and normalizing competitor promo histories manually blocks analytics teams, causing months of delay.",
    mechanics: "We deliver direct API webhooks and data exports that stream normalized promotional records into local environments.",
    capabilities: [
      { title: "Normalized JSON / CSV Feeds", icon: "database", desc: "Access structured historical competitor promotions data ready for direct attribution modeling." },
      { title: "Always-on API Pipes", icon: "refresh-cw", desc: "Integrate real-time competitor campaign shifts and index scores directly with local databases." },
      { title: "Attribution Calibration Models", icon: "network", desc: "Calibrate player lifetime values and hold yields with robust external competitive context." }
    ],
    proofText: "Structured data pipes eliminate developer overhead, supplying clean datasets instantly.",
    targetPersona: "Chief Marketing Officers deploy data exports to justify marketing reallocations."
  },
  {
    slug: "features/offer-benchmarking.html",
    name: "Offer Benchmarking",
    fullName: "UX Welcome Offer Benchmarking",
    kicker: "UX Intelligence",
    lede: "Assess the layout layout styling and visual presentation of welcome promo banners.",
    manifesto: "Optimize welcome banner yield. Correlate promotional matching variables with visual button positions and read levels.",
    challenge: "Operators deploy rich sign-up incentives but fail to convert players because the design layout is slow or cluttered.",
    mechanics: "We map competitor landing zone banner sizes, copywriting hooks, and checkbox setups to active conversions.",
    capabilities: [
      { title: "Copy Readability Audits", icon: "type", desc: "Audit text sizes, typographic contrasts, and legibility on competitor registration landing zones." },
      { title: "CTA Layout Diagnostics", icon: "layout", desc: "Measure how button visual weights, spacing, and page placements affect welcome flow conversion." },
      { title: "Creative Optimization Sprints", icon: "sparkles", desc: "Obtain ranked layout modifications to ensure your sign-up offers stand out from rival platforms." }
    ],
    proofText: "Improving welcome design layout translates to lower CPA and higher marketing yields.",
    targetPersona: "Chief Marketing Officers use design auditing to balance visual brand quality and conversion."
  },
  {
    slug: "features/perception.html",
    name: "UX Perception",
    fullName: "UX Trust & Safety Signals Auditing",
    kicker: "UX Intelligence",
    lede: "Heuristically analyze brand authority, compliance layout, and user trust indicators.",
    manifesto: "Build absolute player trust during KYC verification. Optimize licensing logos, legal checkbox styling, and payment visibility.",
    challenge: "High-value players abandon verification flows because insecure screens look generic, outdated, or confusing.",
    mechanics: "We grade operator security badges, terms readability, and payment pathways to suggest visual confidence upgrades.",
    capabilities: [
      { title: "Authority Badge Scraping", icon: "shield", desc: "Verify the presence and visual placement of licensing seals across player flows." },
      { title: "Compliance Layout Checks", icon: "check-circle", desc: "Assert readability of terms and conditions pages and legal checkboxes on mobile screens." },
      { title: "Verification Confidence Grades", icon: "lock", desc: "Score player trust perceptions across onboarding funnels to optimize KYC document uploads." }
    ],
    proofText: "Building visual trust is a commercial necessity, driving onboarding conversions.",
    targetPersona: "Chief Product Officers leverage trust auditing to satisfy compliance and secure registration."
  },
  {
    slug: "features/promotions.html",
    name: "Promotions Dashboard",
    fullName: "Generic Promotions Tracking Dashboard",
    kicker: "Competitor Core",
    lede: "Continuous surveillance of rival welcome offers and wagering multipliers.",
    manifesto: "Calibrate operator margin while remaining highly competitive. Monitor wagering rules, deposit splits, and bonus depth.",
    challenge: "Manual compilation of competitor promotions takes weeks, leaving CRM and commercial teams blind to active market parities.",
    mechanics: "Jurnii scraper bots log competitive deposit bonus values, spin count adjustments, and active sports boosts.",
    capabilities: [
      { title: "Wagering Hurdle Indexes", icon: "tag", desc: "Compare Deposit play-through multiples side-by-side to protect operator hold rates." },
      { title: "Welcome Incentives Surveillance", icon: "gift", desc: "Log freshly deployed sign-up offers within minutes of competitor deployment." },
      { title: "Regional Offer Mapping", icon: "globe", desc: "Track promotional variations deployed by competitors in target regulated states." }
    ],
    proofText: "Always-on promotions tracking defends operator NGR from aggressive rival campaign spikes.",
    targetPersona: "Chief Commercial Officers deploy promotions dashboards to defend market margins."
  },
  {
    slug: "features/real-time-alerts.html",
    name: "Real-Time Alerts",
    fullName: "Real-Time Competitor Alerts Network",
    kicker: "Competitor Core",
    lede: "Receive immediate notifications when competitors adjust bonuses, rates, or value claims.",
    manifesto: "React instantly to market events. Receive direct push alerts the exact moment a competitor adjusts welcoming terms.",
    challenge: "Missing a rival welcome campaign tweak causes player churn to more generous platforms before your CRM can respond.",
    mechanics: "Configure custom trigger channels based on maximum bonus values or promotional payout indexes.",
    capabilities: [
      { title: "Slack & Webhook Integrations", icon: "bell", desc: "Push critical competitive moves straight to trading desk channels and email databases." },
      { title: "Threshold Triggering", icon: "percent", desc: "Set triggers based on wagering hurdles or free spin value shifts to avoid alert fatigue." },
      { title: "Parity Defense Updates", icon: "shield", desc: "Protect regional conversions through real-time notifications of regional competitor campaigns." }
    ],
    proofText: "Always-on competitive surveillance ensures your commercial team is never blindsided.",
    targetPersona: "Chief Commercial Officers set up real-time alerts to defend active regional market share."
  },
  {
    slug: "features/release-timing-insights.html",
    name: "Release Timing",
    fullName: "Competitor Product Release Timing",
    kicker: "Cortex Core",
    lede: "Anticipate rival product deployments, mobile app changes, and campaign launch windows.",
    manifesto: "Gain predictive advantage. Track the release intervals, styling modifications, and feature updates deployed by competitors.",
    challenge: "Operators launch defensive campaigns reactively, playing catch-up after competitors have already captured peak seasonal traffic.",
    mechanics: "Jurnii models historical competitor styling iterations and feature updates to predict upcoming launch windows.",
    capabilities: [
      { title: "Product Launch Forecasts", icon: "brain", desc: "Anticipate competitor software updates and welcome offer changes using temporal predictive models." },
      { title: "Styling Adjustment Alerts", icon: "refresh-cw", desc: "Track when rivals begin testing styling, new payment options, or quick bet features." },
      { title: "Market Gap Trackers", icon: "compass", desc: "Identify when competitors are undergoing transitions, creating timing opportunities for aggressive acquisitions." }
    ],
    proofText: "Predictive temporal models turn reactive scrambles into robust defensive planning.",
    targetPersona: "Chief Marketing Officers use timing analytics to plan paid search and media schedules."
  },
  {
    slug: "features/trend-spotting-market-shifts.html",
    name: "Trend Spotting",
    fullName: "Trend-Spotting & Market Shifts",
    kicker: "Cortex Core",
    lede: "Detect emerging industry stylesheet trends, visual color systems, and payment portals.",
    manifesto: "Adopt winning designs before the market converges. Track global usability themes and checkout frameworks to maintain aesthetic leadership.",
    challenge: "Product teams work in silos, missing regional adoptions of digital wallets or instant KYC updates until players start defection.",
    mechanics: "We crawl pioneering markets, indexing visual grids, border systems, and typography standards to outline design trends.",
    capabilities: [
      { title: "Styling Systems Audits", icon: "palette", desc: "Identify color palettes, border-radius sets, and card styling gaining traction in major gaming hubs." },
      { title: "Feature Adoption Scans", icon: "check-square", desc: "Measure adoption velocities of new interface components across competitors to guide updates." },
      { title: "Global Spacing Auditing", icon: "globe", desc: "Identify visual styling standards in pioneering jurisdictions to guide local mobile redesigns." }
    ],
    proofText: "Continuous aesthetic auditing keeps your platform design modern and highly engaging.",
    targetPersona: "Design Systems Architects deploy trend audits to maintain a premium visual environment."
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
      { title: "Operator Mapping", icon: "map", desc: "Map active gaming and casino sites inside regulated regional boundaries automatically to preserve market share." },
      { title: "New Entrant Alerts", icon: "alert-circle", desc: "Receive immediate notifications the moment a new brand launches welcome offers or CRM campaigns in your region." },
      { title: "Jurisdictional Audits", icon: "globe", desc: "Audit regional operator saturation across Ontario, Sweden, UK, and emerging states to identify market voids." }
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
    challenge: "CRM and trading teams duplicate competitor promotions reactively without knowing if those mechanics actually drive incrementality, causing margin dilution.",
    mechanics: "Jurnii normalizes competitor sports and casino offers, scoring their generosity using the proprietary Promo Richness Index.",
    capabilities: [
      { title: "Bonus Richness Index", icon: "gift", desc: "Standardize bonus yield calculations based on active wagering hurdles and rollover requirements." },
      { title: "Ad Campaign Parsing", icon: "tag", desc: "Extract competitor banner messaging, creative headers, and copywriting hooks dynamically across landing zones." },
      { title: "Holiday Trend Logs", icon: "calendar", desc: "Review competitor Christmas, World Cup, and Super Bowl promotional timelines to anticipate spend." }
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
    challenge: "Over-generous sign-up bonuses erode operator margins, while overly restrictive wagering rules kill player acquisition and drive players to rivals.",
    mechanics: "We model payout curves and margin impact across different spin multipliers and wagering requirements to find the commercial sweet spot.",
    capabilities: [
      { title: "Margin Defense Tools", icon: "dollar-sign", desc: "Prevent margin erosion by tracking minimum deposit and payout limits across competitors in real-time." },
      { title: "Wagering Calibrators", icon: "sliders", desc: "Model payout curves across different spin multipliers and sports wagering terms to optimize yields." },
      { title: "ROI Auditing Engine", icon: "activity", desc: "Audit rival affiliate rewards and player acquisition pipelines automatically to detect pricing shifts." }
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
    manifesto: "Differentiate with absolute precision. Isolate positioning angles left open by competitor marketing layouts to establish highly defensive, low-CPA campaigns.",
    challenge: "Acquisition campaigns collapse when operators fail to stand out, forcing them to rely on price generosity and bonus size alone.",
    mechanics: "Jurnii maps the copywriting and messaging space, signaling where competitors have left visual or conceptual voids.",
    capabilities: [
      { title: "Value Claim Maps", icon: "compass", desc: "Graph active brands based on core value propositions, speed, safety, or bonus size." },
      { title: "Copywriting Auditing", icon: "file-text", desc: "Parse competitor landing page copy to identify dominant positioning themes and messaging voids." },
      { title: "Segment Expansion", icon: "crosshair", desc: "Target high-value player personas ignored by slow-moving regional operators with custom copy." }
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
    challenge: "Subjective design reviews delay product releases by weeks and often fail to fix the layout errors that actually block players and kill conversion.",
    mechanics: "We run automated visual audits, scoring layout spacing, color contrast accessibility, and grid balance against industry best practice.",
    capabilities: [
      { title: "Aesthetic Scoring", icon: "layout", desc: "Grade interface quality, layout spacing, and grid balance using automated structural analysis." },
      { title: "Design System Logs", icon: "palette", desc: "Scrape and archive rival typographic scales, border systems, and color systems for fast engineering reuse." },
      { title: "Contrast Integrity Checks", icon: "eye", desc: "Assert readability and styling accessibility requirements across player flows to satisfy compliance." }
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
      { title: "Heuristic Benchmarks", icon: "smile", desc: "Benchmark player flows against 12 core onboarding design principles to replace opinion with facts." },
      { title: "Cognitive Fatigue Audits", icon: "zap", desc: "Isolate interaction points and redundant inputs causing player dropoffs during signup." },
      { title: "Onboarding Flow Scores", icon: "route", desc: "Grade transaction flow paths against leading global sportsbooks to guide sprint updates." }
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
      { title: "Transition State Maps", icon: "milestone", desc: "Model user progress through verification (KYC), wallet selection, and checkouts systematically." },
      { title: "Friction Point Logs", icon: "alert-triangle", desc: "Flag redundant form entries, laggy inputs, and validation obstacles across multi-brand setups." },
      { title: "Dropoff Analytics", icon: "filter", desc: "Track where high-value customers abandon onboarding steps to target UX updates." }
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
      { title: "Regional Strategy Matrix", icon: "globe", desc: "Map competitor strength and design grades across target states and countries dynamically." },
      { title: "Market Gaps Detection", icon: "plus-circle", desc: "Spot underserved visual preferences or promotional voids in target regions to launch counter-campaigns." },
      { title: "Competitor Strength Index", icon: "shield", desc: "Identify highly entrenched operators to refine acquisition spend strategies and protect margins." }
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
    challenge: "Marketing attribution is broken, relying on last-click attribution that ignores competitor promotions and regional UX quality, causing massive budget waste.",
    mechanics: "Cortex correlates competitor promotional richness and internal UX scores with campaign yield to reveal true marketing contribution.",
    capabilities: [
      { title: "CPA Correlation Engine", icon: "pie-chart", desc: "Correlate customer acquisition cost fluctuations against competitor campaign shifts and bonus variables." },
      { title: "Promo Richness Modeling", icon: "gift", desc: "Measure player acquisition yields against rival bonus and wagering conditions using proprietary Cortex models." },
      { title: "Yield Protection Planning", icon: "shield", desc: "Refine campaign budgets when competitor promo richness spikes to protect overall marketing ROAS." }
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
    challenge: "Programmatic, affiliate, and search budgets operate in siloes, leaving operators blind to the combined impact of competitive moves across channels.",
    mechanics: "Cortex integrates competitor promotion streams with cross-channel spend data to model the defensive strength of each channel.",
    capabilities: [
      { title: "Channel Footprint Analysis", icon: "split", desc: "Map competitor campaign footprints across programmatic, search, and social dynamically." },
      { title: "Spend Efficiency Audits", icon: "dollar-sign", desc: "Identify channels where rival promo richness is driving customer acquisition spikes to re-allocate funds." },
      { title: "Defensive Budgeting", icon: "sliders", desc: "Calibrate cross-channel spend strategies based on real-time competitor campaign shifts to defend market share." }
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
    challenge: "Data scientists waste 80% of their time scraping and normalizing competitor data instead of modeling budget allocation and incrementality.",
    mechanics: "Jurnii streams clean competitor data straight into local data warehouses, ready for direct MMM processing.",
    capabilities: [
      { title: "Structured Data Pipes", icon: "database", desc: "Export competitor campaign histories via automated JSON or CSV feeds into local datastores." },
      { title: "Predictive Spend Engines", icon: "bar-chart-3", desc: "Model acquisition yields based on historical regional competitor promo patterns and media footprints." },
      { title: "Cortex API Integration", icon: "network", desc: "Synchronize local player analytics databases with comprehensive competitor datasets for causal modeling." }
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
    challenge: "Design and product teams struggle to prove the direct revenue contribution of usability improvements to the board, stalling investment.",
    mechanics: "Cortex models player signup yield fluctuations against resolved Jurnii UX audit findings, proving design ROI.",
    capabilities: [
      { title: "UX ROI Attribution", icon: "trending-up", desc: "Correlate design system improvements directly with customer onboarding rates and registration yields." },
      { title: "Regional Growth Logs", icon: "globe", desc: "Audit market share growth following targeted usability and visual refinement sprints in specific states." },
      { title: "Executive Yield Summaries", icon: "award", desc: "Present structured design and commercial conversion correlations directly to product and finance leadership." }
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
    challenge: "Minor UX details in registration and KYC checkpoints cause silent abandonment, draining marketing budgets and driving up CPA.",
    mechanics: "Jurnii UX identifies exact usability issues, ranking them by severity so development teams can clear funnels immediately.",
    capabilities: [
      { title: "Friction Minimization", icon: "percent", desc: "Isolate and remove fields causing player dropoffs during verification, KYC, and first deposit." },
      { title: "Checkout Redesigns", icon: "layout", desc: "Adopt verified, high-converting checkout grids and deposit button configurations to clear paths." },
      { title: "A/B Benchmark Sprints", icon: "check-circle", desc: "Validate interface revisions directly against leading sportsbook portals under real user conditions." }
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
    challenge: "iGaming players hold multiple accounts, and will immediately defect if their post-login betting experience is slow, laggy, or confusing.",
    mechanics: "Jurnii UX benchmarks post-login dashboards and reward pages, highlighting layout upgrades that secure player loyalty.",
    capabilities: [
      { title: "Retention Audits", icon: "heart", desc: "Isolate usability friction points causing player churn post-registration during daily active bet cycles." },
      { title: "Loyalty UI Evaluation", icon: "award", desc: "Optimize presentation of player clubs, loyalty milestones, and reward claims to maximize engagement." },
      { title: "Engagement Logs", icon: "activity", desc: "Monitor betslip usability, payout speed parameters, and deposit pathways systematically." }
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
    challenge: "Traditional retention strategies are reactive, attempting to recover players with expensive bonus cash only after they have already defected.",
    mechanics: "Jurnii 360 warns CRM teams when competitors deploy highly generous retention offers, enabling timely defensive pricing and margin calibration.",
    capabilities: [
      { title: "Competitor Move Warnings", icon: "user-minus", desc: "Receive alerts when rivals introduce high-richness loyalty promos or sports boosts in your region." },
      { title: "Product Gap Analysis", icon: "plus-circle", desc: "Isolate product features rivals are deploying to secure active customer retention and prevent churn." },
      { title: "Margin Calibration Sprints", icon: "sliders", desc: "Re-calibrate payout metrics to protect yields and NGR when competitor churn triggers spike." }
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
    challenge: "High customer acquisition costs (CAC) drain marketing budgets, eroding operator NGR and GGR in highly competitive regions.",
    mechanics: "Jurnii UX and Jurnii 360 optimize landing pages and signup paths, ensuring every marketing click translates to a successful active player conversion.",
    capabilities: [
      { title: "CPA Reduction Engine", icon: "shopping-bag", desc: "Correlate resolved player journey friction directly with reduced marketing CPA and higher yields." },
      { title: "Welcome Page Optimization", icon: "layout", desc: "Refine landing zone layouts, button spacing, typographic clarity, and trust badges systematically." },
      { title: "Promo Calibrators", icon: "sliders", desc: "Deploy ideal signup bonuses and wagering rules calculated to lower customer CAC while protecting margins." }
    ],
    proofText: "Improving landing page conversion recovers acquisition spend, directly boosting promotional ROI.",
    targetPersona: "Chief Marketing Officers use CAC optimization to optimize digital campaigns and improve media ROAS."
  },
  {
    slug: "solutions/competitor-intelligence.html",
    name: "Competitor Intelligence",
    fullName: "Competitor Intelligence Solutions",
    kicker: "Competition",
    lede: "Track competitor promotions, value claims, and active sign-up incentives to defend GGR.",
    manifesto: "Gain complete competitive market visibility. Automate the tracking of competitorwelcome matches, sports boosts, and wagering rollovers across jurisdictions.",
    challenge: "Operators lose millions copying rival welcome terms blindly. Manual scrapes are slow and fail to catch newly introduced welcome offers in real-time, resulting in severe margin drops.",
    mechanics: "Jurnii scraper bots log active sign-up offers, deposit rollovers, and CRM incentives across 35 regulated markets.",
    capabilities: [
      { title: "Generosity Benchmarks", icon: "gift", desc: "Evaluate rival welcoming generosity mathematically through the Promo Richness Index." },
      { title: "Active Scan Alerts", icon: "bell", desc: "Receive immediate notifications the moment a regional competitor tweaks welcome rollovers." },
      { title: "Parity Optimization", icon: "shield", desc: "Optimize regional player acquisition rates through structured, real-time market parities." }
    ],
    proofText: "Always-on promotions surveillance protects operator hold rates and campaigns yield.",
    targetPersona: "Chief Commercial Officers utilize competitor intelligence to defend GGR holds."
  },
  {
    slug: "solutions/conversion-optimisation.html",
    name: "Conversion Optimisation",
    fullName: "Conversion Optimisation Solutions",
    kicker: "Optimization",
    lede: "Identify and resolve friction bottlenecks across player registration, verification, and checkouts.",
    manifesto: "Heal registration funnels objectively. Optimize signup grids, security indicators, and terms readability to lower CPA.",
    challenge: "Minor stylesheet errors and form redundancies cause silent player abandonment, diluting media budgets and increasing CPA.",
    mechanics: "Jurnii UX runs automated usability scans, ranking friction points by severity to guide sprint updates.",
    capabilities: [
      { title: "Funnel Optimization", icon: "percent", desc: "Minimize field requirements and KYC blocks to accelerate first-mile player conversions." },
      { title: "Trust Audits", icon: "shield", desc: "Enhance visual authority during verification steps by auditing compliance layouts." },
      { title: "Performance Benchmarking", icon: "zap", desc: "Benchmark page speed technical vitals side-by-side with industry top-performers." }
    ],
    proofText: "Improving interface flow recovers acquired marketing clicks, maximizing promotional ROI.",
    targetPersona: "Heads of UX deploy conversion optimization sprints to heal leaky paths."
  },
  {
    slug: "solutions/marketing-attribution.html",
    name: "Marketing Attribution",
    fullName: "Marketing Attribution Solutions",
    kicker: "Attribution",
    lede: "Attribute player lifetime value and acquisitions directly to design updates and competitor moves.",
    manifesto: "Establish causal campaign attribution. Cortex integrates competitor promotions with organic flows to isolate marketing contribution.",
    challenge: "Traditional last-click models misattribute conversions, leaving operators blind to competitor generosity sweeps during sports peaks.",
    mechanics: "We model marketing contribution curves against external competitor campaigns variables and internal UX scores.",
    capabilities: [
      { title: "Causal ROI Attribution", icon: "pie-chart", desc: "Isolate true campaign yield lift relative to competitor pricing and active promo variables." },
      { title: "Attribution Reallocation", icon: "sliders", desc: "Identify underperforming programmatic or search loops to redirect spend towards high-yield channels." },
      { title: "Reconciliation Reporting", icon: "file-text", desc: "Synthesize board-ready attribution data to justify marketing mix updates." }
    ],
    proofText: "Attributing campaign success with causal accuracy avoids massive spreadsheet bloat.",
    targetPersona: "Chief Marketing Officers deploy Cortex attribution to secure campaign ROAS."
  },
  {
    slug: "solutions/marketing-mix-modelling.html",
    name: "Marketing Mix Modelling",
    fullName: "Marketing Mix Modelling Solutions",
    kicker: "Attribution",
    lede: "Streamline competitor promotions datasets directly into local analytics modeling networks.",
    manifesto: "Empower analytics workflows. Cortex pipes normalized competitor welcome matches and rollovers history for direct processing.",
    challenge: "Analysts waste 80% of their time manual-compiling competitor data instead of modeling media contribution models.",
    mechanics: "We export clean CSV or JSON datasets of competitor campaign histories ready for Marketing Mix Modeling integration.",
    capabilities: [
      { title: "Structured Exports", icon: "database", desc: "Pipes structured promotional campaigns variables directly into local predictive servers." },
      { title: "Predictive Models", icon: "brain", desc: "Model seasonal campaigns contribution based on years of competitor welcome and design histories." },
      { title: "Cortex API Integration", icon: "code", desc: "Integrate regional pricing datasets and UX grades with player databases." }
    ],
    proofText: "Structured promotions exports eliminate developer manual scraping overhead.",
    targetPersona: "Chief Marketing Officers deploy Cortex data streams to provide board-ready yield forecasts."
  },
  {
    slug: "solutions/retention-intelligence.html",
    name: "Retention Intelligence",
    fullName: "Retention Intelligence Solutions",
    kicker: "Optimization",
    lede: "Combat player churn by correlating CRM triggers with competitor promotions pressure.",
    manifesto: "Protect customer lifetime value. Cortex detects when competitor generosity spikes, enabling defensive CRM response loops.",
    challenge: "CRM teams operate in isolation, attempting to recover lost players with costly bonuses only after defection has occurred.",
    mechanics: "We map competitor welcome match generosity to internal player engagement drops, alerting retention desks instantly.",
    capabilities: [
      { title: "Churn Risk Prevention", icon: "heart", desc: "Detect player attrition flags triggered by competitor promotional surges." },
      { title: "Defensive Bonus Calibrating", icon: "sliders", desc: "Calibrate regional loyalty rewards to neutralize rival acquisition campaigns." },
      { title: "Active Parity Calibrations", icon: "shield", desc: "Stabilize player holds through contextual competitor CRM surveillance." }
    ],
    proofText: "Proactive CRM calibrations lower active customer attrition and preserve margins.",
    targetPersona: "Heads of CRM deploy retention intelligence to balance VIP loyalty and NGR holds."
  },
  {
    slug: "solutions/ux-benchmarking.html",
    name: "UX Benchmarking",
    fullName: "UX Benchmarking Solutions",
    kicker: "Benchmarking",
    lede: "Benchmark stylesheet grids, user experience checklists, and load delays against rival brands.",
    manifesto: "Establish visual excellence objectively. Compare your operator portfolios with global peers on a single, standardized scorecard.",
    challenge: "Product teams debate layout updates based on subjective design opinions, stalling development and leaking revenue.",
    mechanics: "Jurnii UX runs automated heuristic evaluations, scoring and ranking interfaces against regional competitors.",
    capabilities: [
      { title: "Heuristic Scorecards", icon: "sparkles", desc: "Grade interface quality, form ease, and layout clarity using objective frameworks." },
      { title: "Technical Spacing Audits", icon: "layout", desc: "Scrape and archive CSS spacing variables, typographic grids, and color contrasts." },
      { title: "Roadmap Prioritization", icon: "clipboard-list", desc: "Prioritize design updates based on estimated revenue restoration potential." }
    ],
    proofText: "Normalizing UI scoring aligns product, engineering, and commercial leadership.",
    targetPersona: "Design Systems Architects deploy UX benchmarking to enforce strict brand guidelines."
  },
  {
    slug: "solutions/customer-acquisition-cost-optimization.html",
    name: "Customer Acquisition Cost",
    fullName: "Customer Acquisition Cost Optimization",
    kicker: "Optimization",
    lede: "Minimize player onboarding friction and optimize welcome layouts to lower CPA rates.",
    manifesto: "Secure registration pathways. Optimize welcome banners, layout spacing, and legal checkout panels to maximize media click yield.",
    challenge: "High customer acquisition costs (CAC) drain operator GGR in highly competitive regions due to silent onboarding funnel abandonment.",
    mechanics: "Jurnii UX identifies exact usability bugs across signup paths, ensuring every marketing click translates to an active player.",
    capabilities: [
      { title: "CPA Reduction Engine", icon: "shopping-bag", desc: "Correlate resolved player journey friction directly with reduced marketing CPA." },
      { title: "Welcome Page Optimization", icon: "layout", desc: "Refine landing zone layouts, button spacing, and trust badges systematically." },
      { title: "Generosity Calibrations", icon: "sliders", desc: "Deploy ideal signup bonuses calculated to lower customer CAC while protecting margins." }
    ],
    proofText: "Improving landing page conversion recovers acquisition spend, directly boosting promotional ROI.",
    targetPersona: "Chief Marketing Officers use CAC optimization to optimize digital campaigns and improve media ROAS."
  },
  {
    slug: "solutions/competition-positioning.html",
    name: "Competition Positioning",
    fullName: "Competition Positioning Strategy",
    kicker: "Competition",
    lede: "Discover copywriting claims and visual voids by mapping rival operator positioning.",
    manifesto: "Differentiate with absolute precision. Isolate positioning angles left open by competitor marketing layouts to establish highly defensive campaigns.",
    challenge: "Acquisition campaigns collapse when operators fail to stand out, forcing them to rely on price generosity and bonus size alone.",
    mechanics: "Jurnii maps the copywriting and messaging space, signaling where competitors have left visual or conceptual voids.",
    capabilities: [
      { title: "Value Claim Maps", icon: "compass", desc: "Graph active brands based on core value propositions, speed, safety, or bonus size." },
      { title: "Copywriting Auditing", icon: "file-text", desc: "Parse competitor landing page copy to identify dominant positioning themes and messaging voids." },
      { title: "Segment Expansion", icon: "crosshair", desc: "Target high-value player personas ignored by slow-moving regional operators with custom copy." }
    ],
    proofText: "Objective positioning strategies lower CPA by avoiding direct competition on generic value claims.",
    targetPersona: "Chief Marketing Officers deploy positioning strategy to optimize ROAS across paid media channels."
  }
];

// Rich, category-specific premium multi-section layout template generator
function getPageHTML(metaTitle, metaDesc, kicker, title, lede, manifesto, capabilities, levelPrefix, isFeature, challenge, mechanics, proofText, targetPersona, slug) {
  const typeLabel = isFeature ? "Feature" : "Solution";
  const parentName = isFeature ? "Features" : "Solutions";
  
  const slugLower = slug.toLowerCase();
  const kickerLower = kicker.toLowerCase();
  
  // 1. Determine Category and Product Affiliation
  let category = 'cortex';
  let productBadgeText = 'Powered by Cortex';
  let productBadgeAttr = 'cortex';
  let parentProductUrl = `${levelPrefix}products/cortex.html`;
  let parentProductName = 'Cortex';
  let primaryCTA = `mailto:demo@jurnii.io?subject=Request%20Cortex%20Demo&body=Hello,%20I'd%20like%20to%20request%20a%20demo%20of%20Cortex%20Scenario%20Planning%20and%20Attribution.`;
  let primaryCTALabel = 'Run Scenario Simulation';
  
  if (slugLower.includes('competitor') || slugLower.includes('competition') || kickerLower.includes('competitor') || kickerLower.includes('competition')) {
    category = 'competitor';
    productBadgeText = 'Powered by Jurnii 360';
    productBadgeAttr = 'jurnii-360';
    parentProductUrl = `${levelPrefix}products/jurnii-360.html`;
    parentProductName = 'Jurnii 360';
    primaryCTA = `mailto:demo@jurnii.io?subject=Request%20Jurnii%20360%20Demo&body=Hello,%20I'd%20like%20to%20request%20a%20demo%20of%20Jurnii%20360%20Competitor%20Intelligence.`;
    primaryCTALabel = 'Get Live Competitor Feed';
  } else if (slugLower.includes('ux') || slugLower.includes('usability') || slugLower.includes('journey') || slugLower.includes('perception') || slugLower.includes('design') || slugLower.includes('performance') || slugLower.includes('theme') || slugLower.includes('trends') || slugLower.includes('scoring') || slugLower.includes('benchmarking') || kickerLower.includes('brand') || kickerLower.includes('benchmarking') || kickerLower.includes('usability')) {
    category = 'brand';
    productBadgeText = 'Part of Jurnii UX';
    productBadgeAttr = 'jurnii-ux';
    parentProductUrl = `${levelPrefix}products/jurnii-ux.html`;
    parentProductName = 'Jurnii UX';
    primaryCTA = `mailto:demo@jurnii.io?subject=Request%20Jurnii%20UX%20Demo&body=Hello,%20I'd%20like%20to%20request%20a%20demo%20of%20Jurnii%20UX%20Heuristic%20Auditing.`;
    primaryCTALabel = 'Run a Free Heuristic UX Audit';
  }

  // 2. Generate Category-Specific Metric Strip
  let metricStripHTML = '';
  if (category === 'brand') {
    metricStripHTML = `
      <div class="metric-strip-item">
        <span class="metric-strip-num">300+</span>
        <span class="metric-strip-label">Global Brands Monitored</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">70+</span>
        <span class="metric-strip-label">Recommendations per Audit</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">12</span>
        <span class="metric-strip-label">Core Heuristic Vectors</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">Mins</span>
        <span class="metric-strip-label">Continuous Audit Execution</span>
      </div>
    `;
  } else if (category === 'cortex') {
    metricStripHTML = `
      <div class="metric-strip-item">
        <span class="metric-strip-num">+46%</span>
        <span class="metric-strip-label">True Marketing ROI Lift</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">$4.85M</span>
        <span class="metric-strip-label">Inefficient Spend Reallocated</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">3x</span>
        <span class="metric-strip-label">Attribution Analysis Speed</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">40x</span>
        <span class="metric-strip-label">ROI on Cortex Investment</span>
      </div>
    `;
  } else {
    // competitor
    metricStripHTML = `
      <div class="metric-strip-item">
        <span class="metric-strip-num">1,000+</span>
        <span class="metric-strip-label">Offers Scanned Weekly</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">35</span>
        <span class="metric-strip-label">Regulated States & Jurisdictions</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">21</span>
        <span class="metric-strip-label">Competitor Feature Vectors</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">30+</span>
        <span class="metric-strip-label">Hours Saved Weekly vs Manual</span>
      </div>
    `;
  }

  // 3. Generate Category-Specific Hero Interactive Visual Widget
  let heroVisualHTML = '';
  if (category === 'competitor') {
    heroVisualHTML = `
      <div class="feature-command-centre" data-theme="dark">
        <div class="command-centre-header">
          <span class="command-centre-title">Real-Time Competitor Radar</span>
          <div class="command-pulse">
            <span class="command-pulse-dot"></span> Active Scanning
          </div>
        </div>
        <div class="command-centre-row">
          <span class="command-centre-brand">RivalSportsbook</span>
          <span class="benchmark-badge warning" style="font-size: 10px; padding: 2px 8px;">Generosity Alert</span>
          <span class="command-centre-action">+50 Free Spins Added</span>
        </div>
        <div class="command-centre-row">
          <span class="command-centre-brand">CrownCasino</span>
          <span class="benchmark-badge danger" style="font-size: 10px; padding: 2px 8px;">Wagering Hurdle Drop</span>
          <span class="command-centre-action">40x &rarr; 25x play-through</span>
        </div>
        <div class="command-centre-row">
          <span class="command-centre-brand">SpinEmpire</span>
          <span class="benchmark-badge success" style="font-size: 10px; padding: 2px 8px;">Campaign Launch</span>
          <span class="command-centre-action">Weekly Sportsbook Boost</span>
        </div>
      </div>
    `;
  } else if (category === 'brand') {
    heroVisualHTML = `
      <div class="feature-scorecard" data-theme="dark">
        <div class="scorecard-item">
          <div class="scorecard-meta">
            <span class="scorecard-label">Performance Core</span>
            <span class="scorecard-value">94%</span>
          </div>
          <div class="scorecard-bar-bg">
            <div class="scorecard-bar-fill" style="width: 94%;"></div>
          </div>
        </div>
        <div class="scorecard-item">
          <div class="scorecard-meta">
            <span class="scorecard-label">Heuristic Usability</span>
            <span class="scorecard-value">88%</span>
          </div>
          <div class="scorecard-bar-bg">
            <div class="scorecard-bar-fill" style="width: 88%;"></div>
          </div>
        </div>
        <div class="scorecard-item">
          <div class="scorecard-meta">
            <span class="scorecard-label">User Journeys Flow</span>
            <span class="scorecard-value">76%</span>
          </div>
          <div class="scorecard-bar-bg">
            <div class="scorecard-bar-fill" style="width: 76%; background: #ffbd2e;"></div>
          </div>
        </div>
        <div class="scorecard-item">
          <div class="scorecard-meta">
            <span class="scorecard-label">Brand Trust Signal</span>
            <span class="scorecard-value">91%</span>
          </div>
          <div class="scorecard-bar-bg">
            <div class="scorecard-bar-fill" style="width: 91%;"></div>
          </div>
        </div>
      </div>
    `;
  } else {
    // cortex
    heroVisualHTML = `
      <div class="feature-scenario-panel" data-theme="dark">
        <div class="scenario-slider-row">
          <span class="scenario-slider-label">Paid Search Allocation</span>
          <div class="scenario-slider-track">
            <div class="scenario-slider-fill" style="width: 60%;"></div>
            <div class="scenario-slider-thumb" style="left: 60%;"></div>
          </div>
          <span style="font-family: var(--font-mono); font-size: 11px;">$2.4M</span>
        </div>
        <div class="scenario-slider-row">
          <span class="scenario-slider-label">Affiliate Generosity</span>
          <div class="scenario-slider-track">
            <div class="scenario-slider-fill" style="width: 45%;"></div>
            <div class="scenario-slider-thumb" style="left: 45%;"></div>
          </div>
          <span style="font-family: var(--font-mono); font-size: 11px;">Index 45</span>
        </div>
        <div class="scenario-forecast-box">
          <span class="scenario-forecast-num">+34% NGR Lift</span>
          <span class="scenario-forecast-label">Cortex Simulated Commercial Attribution Impact</span>
        </div>
      </div>
    `;
  }

  // 4. Generate Category-Specific Workflow steps
  let workflowHTML = '';
  if (category === 'competitor') {
    workflowHTML = `
      <div class="feature-workflow-step">
        <span class="feature-workflow-num">Step 01</span>
        <h3>Capture</h3>
        <p>Scrape real-time campaign details, welcome incentives, and free spin levels across active competitors.</p>
      </div>
      <div class="feature-workflow-step">
        <span class="feature-workflow-num">Step 02</span>
        <h3>Normalize</h3>
        <p>Convert disparate text paragraphs into structured, machine-readable database records automatically.</p>
      </div>
      <div class="feature-workflow-step">
        <span class="feature-workflow-num">Step 03</span>
        <h3>Score</h3>
        <p>Run terms through the Promo Richness Index to calculate true player acquisition value mathematically.</p>
      </div>
      <div class="feature-workflow-step">
        <span class="feature-workflow-num">Step 04</span>
        <h3>Alert</h3>
        <p>Push critical pricing and generosity surges straight to Slack webhooks and trading desks for instant calibrations.</p>
      </div>
    `;
  } else if (category === 'brand') {
    workflowHTML = `
      <div class="feature-workflow-step">
        <span class="feature-workflow-num">Step 01</span>
        <h3>Audit</h3>
        <p>Run continuous, automated UX evaluations on player onboarding and verification (KYC) funnels.</p>
      </div>
      <div class="feature-workflow-step">
        <span class="feature-workflow-num">Step 02</span>
        <h3>Diagnose</h3>
        <p>Pinpoint exact styling latency barriers, confusing forms, and security confidence drop-offs.</p>
      </div>
      <div class="feature-workflow-step">
        <span class="feature-workflow-num">Step 03</span>
        <h3>Rank</h3>
        <p>Sort identified UI deficiencies by commercial severity and direct net gaming revenue implications.</p>
      </div>
      <div class="feature-workflow-step">
        <span class="feature-workflow-num">Step 04</span>
        <h3>Improve</h3>
        <p>Provide developers with clear visual reference cards and step-by-step layout update checklists.</p>
      </div>
    `;
  } else {
    // cortex
    workflowHTML = `
      <div class="feature-workflow-step">
        <span class="feature-workflow-num">Step 01</span>
        <h3>Query</h3>
        <p>Input prospective budget shifts, affiliate variables, or competitive positioning strategies.</p>
      </div>
      <div class="feature-workflow-step">
        <span class="feature-workflow-num">Step 02</span>
        <h3>Model</h3>
        <p>Analyze massive competitor campaigns and internal signup volumes via Cortex's causal attribution system.</p>
      </div>
      <div class="feature-workflow-step">
        <span class="feature-workflow-num">Step 03</span>
        <h3>Simulate</h3>
        <p>Simulate Net Gaming Revenue lift, GGR holds, and player acquisition yields under high market volatility.</p>
      </div>
      <div class="feature-workflow-step">
        <span class="feature-workflow-num">Step 04</span>
        <h3>Recommend</h3>
        <p>Generate board-ready marketing mix reallocation strategies to optimize acquisition spend yield.</p>
      </div>
    `;
  }

  // 5. Generate Category-Specific Evidence Widget
  let evidenceVisualHTML = '';
  if (category === 'competitor') {
    evidenceVisualHTML = `
      <div class="feature-alert-feed" data-theme="dark">
        <div class="alert-feed-item">
          <div class="alert-feed-meta">
            <span class="alert-feed-badge" style="color: #ff5f56;">Critical Move</span>
            <span>5 minutes ago</span>
          </div>
          <p class="alert-feed-text">Competitor A adjusted deposit match wagering multiplier from 35x to 20x in Ontario market.</p>
        </div>
        <div class="alert-feed-item warning">
          <div class="alert-feed-meta">
            <span class="alert-feed-badge" style="color: #ffbd2e;">Generosity Shift</span>
            <span>2 hours ago</span>
          </div>
          <p class="alert-feed-text">Competitor B added 50 spins on sign-up welcome offer, increasing Promo Richness Index by 8.4 points.</p>
        </div>
        <div class="alert-feed-item info">
          <div class="alert-feed-meta">
            <span class="alert-feed-badge" style="color: #5299ff;">Ad Campaign Launch</span>
            <span>4 hours ago</span>
          </div>
          <p class="alert-feed-text">Competitor C deployed fresh value proposition claim 'Payouts in under 2 minutes' on main landing zone.</p>
        </div>
      </div>
    `;
  } else if (category === 'brand') {
    evidenceVisualHTML = `
      <div class="feature-journey-map" data-theme="dark">
        <div class="journey-phase">
          <div class="journey-card before">
            <h4>Before: Manual Sign-Up</h4>
            <p>Registration flow contains 14 input fields across 3 nested panels. Cognitive fatigue triggers 42% exit rate at KYC checkpoint.</p>
          </div>
          <div class="journey-card after">
            <h4>After: Jurnii Optimized</h4>
            <p>Fields normalized to single-page verify layout. Visual safety trust badges added. Conversion yield jumps by +35% instantly.</p>
          </div>
        </div>
        <div class="journey-phase">
          <div class="journey-card before">
            <h4>Before: Legacy Betslip</h4>
            <p>Core Web Vitals reveal LCP delay of 4.2 seconds under mobile connection. Player abandonment spikes during active live-betting sweeps.</p>
          </div>
          <div class="journey-card after">
            <h4>After: Jurnii Optimized</h4>
            <p>Betslip asset payload compiled cleanly, LCP compressed to 1.1s. Margin holds stabilized and player attrition minimized.</p>
          </div>
        </div>
      </div>
    `;
  } else {
    // cortex
    evidenceVisualHTML = `
      <div class="feature-ai-panel" data-theme="dark">
        <div class="ai-bubble-user">
          Model the margin effect of increasing wagering hurdles on Europe campaigns.
        </div>
        <div class="ai-bubble-assistant">
          Cortex MMM models show that raising wagering hurdles from 20x to 35x protects short-term margin, but increases acquisition drop-off by <strong>18%</strong> due to rival parity. Recommend a defensive <strong>25x play-through target</strong> to balance customer lifetime value (LTV) and margin yield.
        </div>
        <div class="ai-bubble-user">
          Export this simulation to commercial dashboard.
        </div>
        <div class="ai-bubble-assistant">
          Simulation successfully synchronized and exported to board-ready report under <strong>Integrated Operations</strong> catalog.
        </div>
      </div>
    `;
  }

  // 6. Resolve Related Links without placeholders
  let relatedProduct1Url = `${levelPrefix}products/jurnii-ux.html`;
  let relatedProduct1Name = 'Jurnii UX';
  let relatedProduct1Desc = 'Automated usability and visual scoring indices.';
  
  let relatedProduct2Url = `${levelPrefix}products/cortex.html`;
  let relatedProduct2Name = 'Cortex';
  let relatedProduct2Desc = 'Causal attribution modeling and planning mix.';
  
  if (category === 'brand') {
    relatedProduct1Url = `${levelPrefix}products/jurnii-360.html`;
    relatedProduct1Name = 'Jurnii 360';
    relatedProduct1Desc = 'Real-time competitive radar command centers.';
  } else if (category === 'cortex') {
    relatedProduct2Url = `${levelPrefix}products/jurnii-360.html`;
    relatedProduct2Name = 'Jurnii 360';
    relatedProduct2Desc = 'Real-time competitive radar command centers.';
  }

  let relatedFeature1Url = `${levelPrefix}features/competitor-promotions.html`;
  let relatedFeature1Name = 'Promotions';
  let relatedFeature1Desc = 'Continuous monitoring of rival bonus terms.';
  
  let relatedFeature2Url = `${levelPrefix}features/brand-usability.html`;
  let relatedFeature2Name = 'Usability';
  let relatedFeature2Desc = 'Standardized heuristic onboarding audits.';

  if (category === 'competitor') {
    relatedFeature1Url = `${levelPrefix}features/competitor-alerts.html`;
    relatedFeature1Name = 'Alerts';
    relatedFeature1Desc = 'Instant competitor move and pricing triggers.';
    
    relatedFeature2Url = `${levelPrefix}features/competitor-offer-feed.html`;
    relatedFeature2Name = 'Offer Feed';
    relatedFeature2Desc = 'Continuous structured promotional campaigns feed.';
  } else if (category === 'cortex') {
    relatedFeature1Url = `${levelPrefix}features/competitor-ai-insights.html`;
    relatedFeature1Name = 'AI Insights';
    relatedFeature1Desc = 'Predict competitor marketing surges via ML models.';
    
    relatedFeature2Url = `${levelPrefix}features/brand-recommendations.html`;
    relatedFeature2Name = 'Recommendations';
    relatedFeature2Desc = 'Prioritized development roadmaps for revenue yield.';
  }

  let relatedSolution1Url = `${levelPrefix}solutions/user-experience-benchmarking.html`;
  let relatedSolution1Name = 'UX Benchmarking';
  let relatedSolution1Desc = 'Heuristic scores side-by-side with regional rivals.';

  let relatedSolution2Url = `${levelPrefix}solutions/competition-offers.html`;
  let relatedSolution2Name = 'Competitor Intel';
  let relatedSolution2Desc = 'Continuous surveillance of competitor welcome offers.';

  if (category === 'competitor') {
    relatedSolution1Url = `${levelPrefix}solutions/competition-pricing.html`;
    relatedSolution1Name = 'Pricing Calibration';
    relatedSolution1Desc = 'Re-calibrate player acquisition margins dynamically.';
    
    relatedSolution2Url = `${levelPrefix}solutions/competition-postitioning.html`;
    relatedSolution2Name = 'Positioning Strategy';
    relatedSolution2Desc = 'Discover copywriting claims and value gaps.';
  } else if (category === 'cortex') {
    relatedSolution1Url = `${levelPrefix}solutions/marketing-roi-attribution.html`;
    relatedSolution1Name = 'Marketing ROI';
    relatedSolution1Desc = 'Correlate marketing yield with competitor moves.';
    
    relatedSolution2Url = `${levelPrefix}solutions/marketing-mix-modeling-attribution.html`;
    relatedSolution2Name = 'MMM Attribution';
    relatedSolution2Desc = 'Stream modeling data straight to local warehouses.';
  }

  let persona1Url = `${levelPrefix}use-cases/roles/cco.html`;
  let persona1Name = 'Chief Commercial Officer';
  let persona1Desc = 'Margin defense and yield planning.';

  let persona2Url = `${levelPrefix}use-cases/roles/cmo.html`;
  let persona2Name = 'Chief Marketing Officer';
  let persona2Desc = 'Growth strategy and campaign ROAS optimization.';

  if (category === 'brand') {
    persona1Url = `${levelPrefix}use-cases/roles/coo.html`;
    persona1Name = 'Chief Operating Officer';
    persona1Desc = 'Conversion stability and latency defense.';
  }

  // 7. Define Category-specific Outcomes
  let outcomeHTML = '';
  if (category === 'competitor') {
    outcomeHTML = `
      <div class="feature-outcome-card">
        <span class="feature-outcome-num">+15.4%</span>
        <h3>Hold Rate Calibrations</h3>
        <p>Calibrate deposit multiples against rival welcome flows to stabilize hold performance.</p>
      </div>
      <div class="feature-outcome-card">
        <span class="feature-outcome-num">20+</span>
        <h3>Weekly Campaign Spikes Blocked</h3>
        <p>Detect aggressive holiday promotional campaigns the moment they launch to protect GGR.</p>
      </div>
      <div class="feature-outcome-card">
        <span class="feature-outcome-num">$1.2M</span>
        <h3>Margin Leakage Saved</h3>
        <p>Prevent blind copies of competitor pricing structures, keeping CRM re-investment yield high.</p>
      </div>
    `;
  } else if (category === 'brand') {
    outcomeHTML = `
      <div class="feature-outcome-card">
        <span class="feature-outcome-num">+35%</span>
        <h3>Player Conversion Jump</h3>
        <p>Optimize verification checkpoints and fields count to maximize registration conversion yields.</p>
      </div>
      <div class="feature-outcome-card">
        <span class="feature-outcome-num">-40%</span>
        <h3>KYC Funnel Drop-off</h3>
        <p>Eliminate complex terms screens and latency drop-offs during high-security player onboardings.</p>
      </div>
      <div class="feature-outcome-card">
        <span class="feature-outcome-num">Zero</span>
        <h3>Subjective Roadmap Debates</h3>
        <p>Align designers, product teams, and engineering priorities around verified revenue bottlenecks.</p>
      </div>
    `;
  } else {
    // cortex
    outcomeHTML = `
      <div class="feature-outcome-card">
        <span class="feature-outcome-num">40x</span>
        <h3>Attribution Investment Return</h3>
        <p>Establish exact causal contribution of paid media channels compared to organic sweeps.</p>
      </div>
      <div class="feature-outcome-card">
        <span class="feature-outcome-num">$4.85M</span>
        <h3>Inefficient Budget Reallocated</h3>
        <p>Identify programmatic, search, and affiliate channels that are merely copying competitor value.</p>
      </div>
      <div class="feature-outcome-card">
        <span class="feature-outcome-num">85%</span>
        <h3>Strategic Budget Confidence</h3>
        <p>Anticipate player lifetime value and hold performance before launching campaign strategies.</p>
      </div>
    `;
  }

  // 8. Define Category-specific Final CTA text
  let finalCTATitle = 'Model Causal Commercial Decisions';
  let finalCTADesc = 'Stop relying on backward-looking last-click reports. Model competitive campaign fluctuations and internal onboarding friction systematically with Cortex today.';
  if (category === 'competitor') {
    finalCTATitle = 'Detect Competitive Moves Instantly';
    finalCTADesc = 'Anticipate rival welcome bonuses, track loyalty rewards generosity, and protect operator Net Gaming Revenue before competitive pushes impact your active base.';
  } else if (category === 'brand') {
    finalCTATitle = 'Benchmark Your Experience Benchmarks';
    finalCTADesc = 'Turn experience speculation into prioritized engineering roadmap checklists. Eliminate registration friction and outpace regional platform layouts.';
  }

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
<body class="feature-page">

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
    <!-- Premium Category-Specific Hero -->
    <section class="feature-hero-premium">
      <div class="container">
        <div class="feature-hero-copy">
          <a href="${parentProductUrl}" class="product-badge" data-product="${productBadgeAttr}">
            <i data-lucide="shield" style="width: 12px; height: 12px;"></i> ${productBadgeText}
          </a>
          <p style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 12px 0;">${kicker}</p>
          <h1 class="h1-page" style="font-size: clamp(32px, 4.5vw, 52px); font-weight: 800; letter-spacing: -0.03em; margin: 0 0 20px 0; color: var(--foreground); line-height: 1.1;">${title}</h1>
          <p class="page-hero-lede" style="font-size: 18px; color: var(--muted-foreground); line-height: 1.6; max-width: 680px; margin: 0 0 32px 0;">${lede}</p>
          <div class="cta-row" style="display: flex; gap: 16px;">
            <a href="${primaryCTA}" class="btn primary">${primaryCTALabel}</a>
            <a href="${parentProductUrl}" class="btn secondary">Explore ${parentProductName}</a>
          </div>
        </div>
        
        <!-- Interactive Mockup Panel -->
        <div class="feature-hero-visual" data-category="${category}">
          ${heroVisualHTML}
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

    <!-- Manifesto Block -->
    <section class="feature-manifesto" id="details" style="padding: 80px 0; border-bottom: 1px solid var(--border); background: var(--card);">
      <div class="container" style="max-width: 960px; text-align: center;">
        <p style="font-size: clamp(18px, 2.2vw, 22px); font-weight: 500; line-height: 1.7; color: var(--foreground); margin: 0; font-family: var(--font-sans); letter-spacing: -0.01em;">${manifesto}</p>
      </div>
    </section>

    <!-- The iGaming Commercial Challenge Section (Specific Failure Mode) -->
    <section class="challenge-section" style="padding: 100px 0; background: var(--background);">
      <div class="container" style="max-width: 1100px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;">
          <div>
            <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Operational Vulnerability</span>
            <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 20px 0; color: var(--foreground); line-height: 1.2;">The Cost of Operating Blind</h2>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6; margin-bottom: 16px;">
              ${challenge}
            </p>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6;">
              When operator stacks converge on identical platforms and third-party software structures, customer acquisition efficiency and margin retention are the only durable barriers protecting Net Gaming Revenue (NGR). Running campaigns without automated competitor alerts or continuous user-flow speed benchmarking causes permanent player defection to regional rivals.
            </p>
          </div>
          
          <div style="background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.025);">
            <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(148,255,150,0.12); color: var(--jurnii-700); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <i data-lucide="shield-alert" style="width: 20px; height: 20px;"></i>
            </div>
            <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">How Jurnii Resolves This</h3>
            <p style="font-size: 14.5px; color: var(--muted-foreground); line-height: 1.55; margin: 0 0 24px 0;">
              ${mechanics}
            </p>
            <div class="implication-callout">
              <div class="implication-callout-header">
                <i data-lucide="trending-up" style="width: 14px; height: 14px;"></i> Commercial Impact
              </div>
              <p class="implication-callout-body">
                Friction in player verification checkpoints and mismatched welcome bonus generous multiples dilutes operator hold rates and increases acquisition CPA by up to <b>35%</b>.
              </p>
            </div>
            <div style="border-top: 1px solid var(--border); padding-top: 20px; margin-top: 20px; font-size: 13px; font-style: italic; color: var(--jurnii-700); font-weight: 600;">
              ${targetPersona}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Dynamic Category-Specific Workflow Section -->
    <section class="feature-workflow-section">
      <div class="container" style="max-width: 1100px;">
        <div class="section-head" style="text-align: center; margin-bottom: 48px;">
          <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Operational Flow</span>
          <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0;">How Jurnii Executes</h2>
        </div>
        <div class="feature-workflow-grid">
          ${workflowHTML}
        </div>
      </div>
    </section>

    <!-- Capabilities Cards Section (Stripped theme-dark grid padding in layout) -->
    <section class="feature-capability-section" style="padding: 100px 0; background: #252c1e; color: #fff;" data-theme="dark">
      <div class="container" style="max-width: 1100px;">
        <div class="section-head" style="margin-bottom: 56px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 24px;">
          <h2 class="h2-section" style="font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin: 0 0 12px 0;">${typeLabel} Capabilities</h2>
          <p style="font-size: 16px; color: rgba(255,255,255,0.7); max-width: 600px; margin: 0;">Automated, continuous intelligence tools to outpace competitive regional movements.</p>
        </div>
        <div class="feature-capability-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;">
          ${capabilities.map(c => `
          <div class="feature-capability-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 32px;">
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

    <!-- High-Fidelity Custom Category Evidence Section -->
    <section class="feature-evidence-section">
      <div class="container" style="max-width: 1100px;">
        <div class="feature-evidence-grid">
          <div>
            <span class="eyebrow">Platform Evidence Output</span>
            <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; color: var(--foreground); line-height: 1.2;">What Jurnii Produces</h2>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6; margin-bottom: 24px;">
              Our algorithms constantly parse on-site variables and process structural flows. Explore the typical data dashboard models, recommendations feed, and scenario outputs populated in real-time.
            </p>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6; margin-bottom: 0;">
              Streamline reporting pipelines, export board-ready attribution data, and keep technical and commercial desks synchronized around a single source of truth.
            </p>
          </div>
          
          <!-- Large High-Fidelity UI Evidence Panel -->
          <div class="feature-evidence-card" data-style="${category}">
            ${evidenceVisualHTML}
          </div>
        </div>
      </div>
    </section>

    <!-- Category Commercial Outcomes -->
    <section class="feature-outcome-section">
      <div class="container" style="max-width: 1100px;">
        <div style="text-align: center; margin-bottom: 48px;">
          <span style="color: var(--jurnii-400); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">EBITDA & Hold Metrics</span>
          <h2 style="font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin: 0;">Protected Outcomes</h2>
        </div>
        <div class="feature-outcome-grid">
          ${outcomeHTML}
        </div>
      </div>
    </section>

    <!-- Heuristic Operator Benchmark Table (Retained but restyled for premium design) -->
    <section class="benchmark-section">
      <div class="container" style="max-width: 1100px;">
        <div class="section-head centered">
          <span class="eyebrow"><span class="dot"></span>Performance Matrix</span>
          <h2 class="h2-section">How Jurnii Outpaces the Market</h2>
          <p class="section-lede" style="margin-left: auto; margin-right: auto;">A comparison of Jurnii's continuous real-time intelligence against traditional manual audits.</p>
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

    <!-- Dynamic Enterprise Personas (Replacing raw bullet points) -->
    <section class="feature-use-case-section">
      <div class="container" style="max-width: 1100px;">
        <div class="section-head" style="text-align: center; margin-bottom: 48px;">
          <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Enterprise Personas</span>
          <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0;">Who Uses This ${typeLabel}</h2>
        </div>
        <div class="feature-use-case-grid">
          <div class="feature-use-case-card">
            <div class="use-case-icon">
              <i data-lucide="user" style="width: 20px; height: 20px;"></i>
            </div>
            <div class="use-case-details">
              <h3>${persona1Name}</h3>
              <p>${persona1Desc} By cataloging terms and comparing user journeys, leadership maintains market parity and optimizes campaign holds.</p>
            </div>
          </div>
          <div class="feature-use-case-card">
            <div class="use-case-icon">
              <i data-lucide="users" style="width: 20px; height: 20px;"></i>
            </div>
            <div class="use-case-details">
              <h3>${persona2Name}</h3>
              <p>${persona2Desc} Analyze rival copywriting propositions and value claims to deploy differentiatedPaid Media counter-campaigns.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Unified Ecosystem Connections (Resolved URLs, NO placeholder '#' links) -->
    <section class="feature-related-section">
      <div class="container" style="max-width: 1100px;">
        <div class="section-head" style="margin-bottom: 48px;">
          <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 12px 0;">Ecosystem Integrations</h2>
          <p style="font-size: 16px; color: var(--muted-foreground); margin: 0;">Explore how this ${typeLabel.toLowerCase()} coordinates with products and adjacent pathways.</p>
        </div>
        <div class="feature-related-grid">
          <a href="${relatedProduct1Url}" class="related-card">
            <span class="related-type">Related Product</span>
            <h3>${relatedProduct1Name}</h3>
            <p>${relatedProduct1Desc}</p>
          </a>
          <a href="${relatedProduct2Url}" class="related-card">
            <span class="related-type">Related Product</span>
            <h3>${relatedProduct2Name}</h3>
            <p>${relatedProduct2Desc}</p>
          </a>
          <a href="${relatedFeature1Url}" class="related-card">
            <span class="related-type">Related Feature</span>
            <h3>${relatedFeature1Name}</h3>
            <p>${relatedFeature1Desc}</p>
          </a>
          <a href="${relatedFeature2Url}" class="related-card">
            <span class="related-type">Related Feature</span>
            <h3>${relatedFeature2Name}</h3>
            <p>${relatedFeature2Desc}</p>
          </a>
          <a href="${relatedSolution1Url}" class="related-card">
            <span class="related-type">Related Solution</span>
            <h3>${relatedSolution1Name}</h3>
            <p>${relatedSolution1Desc}</p>
          </a>
          <a href="${relatedSolution2Url}" class="related-card">
            <span class="related-type">Related Solution</span>
            <h3>${relatedSolution2Name}</h3>
            <p>${relatedSolution2Desc}</p>
          </a>
        </div>
      </div>
    </section>

    <!-- Bespoke Final CTA Section -->
    <section class="feature-final-cta">
      <div class="feature-final-cta-card">
        <h2>${finalCTATitle}</h2>
        <p>${finalCTADesc}</p>
        <div class="cta-row" style="display: flex; gap: 16px; justify-content: center;">
          <a href="${primaryCTA}" class="btn primary">${primaryCTALabel}</a>
          <a href="${parentProductUrl}" class="btn secondary">Explore ${parentProductName}</a>
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

// Custom, premium Solution page multi-section layout template generator (Buyer Problem Narrative)
function getSolutionPageHTML(item, levelPrefix) {
  const slugLower = item.slug.toLowerCase();
  const kickerLower = item.kicker.toLowerCase();
  
  // 1. Determine Category, Badges, parent Product Stacks
  let category = 'cortex';
  let categoryLabel = 'Marketing Mix & ROI Attribution';
  let parentProductUrl = `${levelPrefix}products/cortex.html`;
  let parentProductName = 'Cortex';
  let productStackBadges = `
    <a href="${levelPrefix}products/cortex.html" class="product-badge" data-product="cortex" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
      <i data-lucide="network" style="width: 12px; height: 12px;"></i> Powered by Cortex
    </a>
  `;
  
  if (slugLower.includes('competitor') || slugLower.includes('competition') || kickerLower.includes('competitor') || kickerLower.includes('competition')) {
    category = 'competitor';
    categoryLabel = 'Competitor & Market Intelligence';
    parentProductUrl = `${levelPrefix}products/jurnii-360.html`;
    parentProductName = 'Jurnii 360';
    productStackBadges = `
      <a href="${levelPrefix}products/jurnii-360.html" class="product-badge" data-product="jurnii-300" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:rgba(5,221,22,0.1); color:var(--jurnii-700); border:1px solid rgba(5,221,22,0.2);">
        <i data-lucide="radar" style="width: 12px; height: 12px;"></i> Powered by Jurnii 360
      </a>
    `;
  } else if (slugLower.includes('ux') || slugLower.includes('usability') || slugLower.includes('journey') || slugLower.includes('perception') || slugLower.includes('design') || slugLower.includes('performance') || slugLower.includes('theme') || slugLower.includes('trends') || slugLower.includes('scoring') || slugLower.includes('benchmarking') || kickerLower.includes('brand') || kickerLower.includes('benchmarking') || kickerLower.includes('usability')) {
    category = 'brand';
    categoryLabel = 'UX Benchmarking & Funnel Optimization';
    parentProductUrl = `${levelPrefix}products/jurnii-ux.html`;
    parentProductName = 'Jurnii UX';
    productStackBadges = `
      <a href="${levelPrefix}products/jurnii-ux.html" class="product-badge" data-product="jurnii-ux" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:rgba(0,145,255,0.1); color:#007aff; border:1px solid rgba(0,145,255,0.2);">
        <i data-lucide="layout-template" style="width: 12px; height: 12px;"></i> Part of Jurnii UX
      </a>
    `;
  } else if (slugLower.includes('retention') || slugLower.includes('churn') || slugLower.includes('value') || slugLower.includes('ltv')) {
    category = 'retention';
    categoryLabel = 'CRM & Retention Intelligence';
    parentProductUrl = `${levelPrefix}products/jurnii-360.html`;
    parentProductName = 'Jurnii 360 + Cortex';
    productStackBadges = `
      <a href="${levelPrefix}products/jurnii-360.html" class="product-badge" data-product="jurnii-300" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:rgba(5,221,22,0.1); color:var(--jurnii-700); border:1px solid rgba(5,221,22,0.2); margin-right:8px;">
        <i data-lucide="radar" style="width: 12px; height: 12px;"></i> Jurnii 360
      </a>
      <a href="${levelPrefix}products/cortex.html" class="product-badge" data-product="cortex" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
        <i data-lucide="network" style="width: 12px; height: 12px;"></i> Cortex
      </a>
    `;
  }

  // 2. Category-Specific Hero visuals, failure modes, cost of inaction, workflows, and personas
  let heroVisualHTML = '';
  let costOfInactionHTML = '';
  let workflowHTML = '';
  let evidenceVisualHTML = '';
  let productStackHTML = '';
  let personasHTML = '';
  let finalCTATitle = '';
  let finalCTADesc = '';
  let primaryCTALabel = '';
  let primaryCTAUrl = `mailto:demo@jurnii.io?subject=Request%20Demo%20-%20${encodeURIComponent(item.fullName)}`;

  if (category === 'competitor') {
    heroVisualHTML = `
      <div class="solution-market-radar" data-theme="dark">
        <div class="command-centre-header">
          <span class="command-centre-title">Live Competitive Command Centre</span>
          <div class="command-pulse">
            <span class="command-pulse-dot"></span> Radar Active
          </div>
        </div>
        <div class="command-centre-row">
          <span class="command-centre-brand">Rival Brand A</span>
          <span class="benchmark-badge danger">Generosity Surge</span>
          <span class="command-centre-action">+100% Match Added</span>
        </div>
        <div class="command-centre-row">
          <span class="command-centre-brand">Conglomerate B</span>
          <span class="benchmark-badge warning">Wagering Shift</span>
          <span class="command-centre-action">35x &rarr; 15x</span>
        </div>
      </div>
    `;
    costOfInactionHTML = `
      <div class="solution-cost-card">
        <h3>Wasted Marketing Budget</h3>
        <p>CMO allocates acquisition search and programmatic display funds blindly, duplicating competitor promo terms with no incrementality metrics.</p>
      </div>
      <div class="solution-cost-card">
        <h3>Margin Hold Dilution</h3>
        <p>Trading and CRM desks copy rival pricing match changes reactively, bleeding GGR holds through unoptimized bonus payouts.</p>
      </div>
      <div class="solution-cost-card">
        <h3>Competitive Blind Spots</h3>
        <p>Conglomerates modify welcome overlays and registration rules, eroding your local acquisitions before leadership sees the threat.</p>
      </div>
    `;
    workflowHTML = `
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 01</span>
        <h3>Monitor</h3>
        <p>Scrape real-time campaign details, welcome matches, and wagering hurdles across competitors automatically.</p>
      </div>
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 02</span>
        <h3>Structure</h3>
        <p>Normalize disparate landing zone copywriting and terms text into structured machine-ready datastores.</p>
      </div>
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 03</span>
        <h3>Benchmark</h3>
        <p>Grade welcome generosity indexes mathematically to determine absolute operator competitive generosity levels.</p>
      </div>
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 04</span>
        <h3>Alert</h3>
        <p>Push critical competitive movement alerts straight to Slack webhooks and CRM marketing desks for parities.</p>
      </div>
    `;
    evidenceVisualHTML = `
      <div class="feature-alert-feed" data-theme="dark">
        <div class="alert-feed-item">
          <div class="alert-feed-meta">
            <span class="alert-feed-badge" style="color: #ff5f56;">Market Discovery</span>
            <span>1 min ago</span>
          </div>
          <p class="alert-feed-text">Competitor C launched welcome promo 'Deposit $10 Get $50 spins' in Ontario segment.</p>
        </div>
        <div class="alert-feed-item warning">
          <div class="alert-feed-meta">
            <span class="alert-feed-badge" style="color: #ffbd2e;">Generosity Shift</span>
            <span>2 hours ago</span>
          </div>
          <p class="alert-feed-text">Competitor A lowered wagering hurdles from 40x to 20x, increasing Generosity Index to 72.4.</p>
        </div>
      </div>
    `;
    productStackHTML = `
      <div class="product-stack-card">
        <span class="related-type">Primary Radar Product</span>
        <h3>Jurnii 360</h3>
        <p>Continuous real-time competitive intelligence radar scraping over 1,000 global gaming promotions weekly to protect operator margins.</p>
        <a href="${levelPrefix}products/jurnii-360.html" class="btn secondary">Explore Jurnii 360 &rarr;</a>
      </div>
      <div class="product-stack-card">
        <span class="related-type">Supporting Attribution</span>
        <h3>Cortex</h3>
        <p>Feeds clean competitor promotion databases straight into causal modeling systems to validate media allocations.</p>
        <a href="${levelPrefix}products/cortex.html" class="btn secondary">Explore Cortex &rarr;</a>
      </div>
    `;
    personasHTML = `
      <div class="solution-persona-card">
        <div class="use-case-icon"><i data-lucide="megaphone"></i></div>
        <div class="use-case-details">
          <h3>Chief Marketing Officer</h3>
          <p>Defend search media spend with objective competitive insights, reallocating budget away from aggressive rival surges.</p>
        </div>
      </div>
      <div class="solution-persona-card">
        <div class="use-case-icon"><i data-lucide="coins"></i></div>
        <div class="use-case-details">
          <h3>Chief Commercial Officer</h3>
          <p>Safeguard Net Gaming Revenue (NGR) margins by optimizing deposit matches targets based on real-time market data.</p>
        </div>
      </div>
    `;
    finalCTATitle = 'Establish Real-Time Competitor Surveillance';
    finalCTADesc = 'Stop scraping rival welcome terms manually. Receive immediate Slack alerts the moment competitors adjust welcome targets and protect your local margins.';
    primaryCTALabel = 'Connect Live Competitor Radar';
  } else if (category === 'brand') {
    heroVisualHTML = `
      <div class="solution-funnel-map" data-theme="dark">
        <div class="command-centre-header">
          <span class="command-centre-title">UX Usability Scorecard</span>
          <span class="benchmark-badge success" style="font-size:10px;">Audit Complete</span>
        </div>
        <div class="scorecard-item" style="background:rgba(255,255,255,0.02); margin-bottom: 8px;">
          <div class="scorecard-meta">
            <span class="scorecard-label">Onboarding Funnel Completion</span>
            <span class="scorecard-value">64%</span>
          </div>
          <div class="scorecard-bar-bg"><div class="scorecard-bar-fill" style="width: 64%; background:#ff5f56;"></div></div>
        </div>
        <div class="scorecard-item" style="background:rgba(255,255,255,0.02);">
          <div class="scorecard-meta">
            <span class="scorecard-label">Betslip Interaction Speed</span>
            <span class="scorecard-value">1.2s</span>
          </div>
          <div class="scorecard-bar-bg"><div class="scorecard-bar-fill" style="width: 92%;"></div></div>
        </div>
      </div>
    `;
    costOfInactionHTML = `
      <div class="solution-cost-card">
        <h3>Paid Programmatic Leakage</h3>
        <p>Acquired traffic is driven straight into registration blocks, KYC obstacles, and document load failures, triggering 45%+ dropout rates.</p>
      </div>
      <div class="solution-cost-card">
        <h3>Subjective Roadmapping</h3>
        <p>Creative and product teams debate styling choices and interface changes without commercial proof, wasting engineer capacity.</p>
      </div>
      <div class="solution-cost-card">
        <h3>Mobile Connection Lag</h3>
        <p>Unoptimized CSS payloads and heavy assets slow betslip loads under restricted mobile grids, causing player defection.</p>
      </div>
    `;
    workflowHTML = `
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 01</span>
        <h3>Audit</h3>
        <p>Run automated usability and core vitals diagnostics across player registration and deposit funnels.</p>
      </div>
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 02</span>
        <h3>Diagnose</h3>
        <p>Pinpoint exact stylesheet bugs, cognitive barriers, and security trust drop-offs causing funnel leaks.</p>
      </div>
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 03</span>
        <h3>Prioritize</h3>
        <p>Rank UX findings mathematically based on player conversion severity and revenue impact variables.</p>
      </div>
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 04</span>
        <h3>Fix</h3>
        <p>Provide engineering desks with clear visual checklists and layout templates for rapid corrections.</p>
      </div>
    `;
    evidenceVisualHTML = `
      <div class="feature-journey-map" data-theme="dark">
        <div class="journey-phase">
          <div class="journey-card before">
            <h4>Before Jurnii Auditing</h4>
            <p>14 input fields, redundant checkboxes, and slow loading. Player signup drop-offs spike to 48% at KYC checkpoint.</p>
          </div>
          <div class="journey-card after">
            <h4>After Jurnii UX optimization</h4>
            <p>Single-page registration sequence, trust badges added. funnel conversions jump by +35% immediately.</p>
          </div>
        </div>
      </div>
    `;
    productStackHTML = `
      <div class="product-stack-card">
        <span class="related-type">Primary Experience Product</span>
        <h3>Jurnii UX</h3>
        <p>Automated heuristic auditing scorecards and technical Core Web Vitals speed diagnostics mapped to revenue restoration.</p>
        <a href="${levelPrefix}products/jurnii-ux.html" class="btn secondary">Explore Jurnii UX &rarr;</a>
      </div>
      <div class="product-stack-card">
        <span class="related-type">Supporting Attribution</span>
        <h3>Cortex</h3>
        <p>Correlates resolved player journey leaks directly with regional customer acquisition costs and hold rates.</p>
        <a href="${levelPrefix}products/cortex.html" class="btn secondary">Explore Cortex &rarr;</a>
      </div>
    `;
    personasHTML = `
      <div class="solution-persona-card">
        <div class="use-case-icon"><i data-lucide="layout"></i></div>
        <div class="use-case-details">
          <h3>Chief Product Officer</h3>
          <p>Prioritize developer updates based on objective yield recovery, accelerating onboarding sprint success cycles.</p>
        </div>
      </div>
      <div class="solution-persona-card">
        <div class="use-case-icon"><i data-lucide="briefcase"></i></div>
        <div class="use-case-details">
          <h3>Chief Operating Officer</h3>
          <p>Defend checkout performance and transactions speed under volatile mobile peak wagering loads.</p>
        </div>
      </div>
    `;
    finalCTATitle = 'Diagnose Funnel Friction & Heal Conversions';
    finalCTADesc = 'Stop copy-pasting generic layouts. Benchmark onboarding funnels objectively and clear KYC registration barriers in minutes.';
    primaryCTALabel = 'Run Free Usability Diagnostic';
  } else if (category === 'cortex') {
    heroVisualHTML = `
      <div class="solution-attribution-board" data-theme="dark">
        <div class="command-centre-header">
          <span class="command-centre-title">Cortex Attribution Engine</span>
          <span class="benchmark-badge success" style="font-size:10px;">MMM Complete</span>
        </div>
        <div class="scenario-slider-row">
          <span class="scenario-slider-label">Paid Search Allocation</span>
          <span style="font-family:var(--font-mono); font-weight:700; color:#fff;">$2.4M</span>
        </div>
        <div class="scenario-forecast-box" style="margin-top:8px;">
          <span class="scenario-forecast-num">+46% Marketing ROI Lift</span>
          <span class="scenario-forecast-label">Attributed by Causal modeling</span>
        </div>
      </div>
    `;
    costOfInactionHTML = `
      <div class="solution-cost-card">
        <h3>Flawed Last-Click Modeling</h3>
        <p>CFO and CMO make multi-million dollar programmatic display budget decisions using models that ignore competitor promotions shifts.</p>
      </div>
      <div class="solution-cost-card">
        <h3>Marketing & Finance Friction</h3>
        <p>Inability to prove actual promotional incrementality drives internal budget arguments and strategic delays.</p>
      </div>
      <div class="solution-cost-card">
        <h3>Inefficient Spend Attribution</h3>
        <p>Programmatic bids copy rival generosity boosts blind, causing severe operator hold erosion during peaks.</p>
      </div>
    `;
    workflowHTML = `
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 01</span>
        <h3>Ingest</h3>
        <p>Consolidate clean competitor promotions data, welcome indices, and organic campaign databases.</p>
      </div>
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 02</span>
        <h3>Model</h3>
        <p>Separate organic contributions from competitor campaigns generosity volatility casual factors.</p>
      </div>
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 03</span>
        <h3>Simulate</h3>
        <p>Model Net Gaming Revenue yields, LTV, and conversion hold metrics under multiple budget scenarios.</p>
      </div>
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 04</span>
        <h3>Report</h3>
        <p>Generate board-ready marketing mix reallocation maps to defend campaigns ROAS.</p>
      </div>
    `;
    evidenceVisualHTML = `
      <div class="feature-ai-panel" data-theme="dark">
        <div class="ai-bubble-user">Isolate true Paid Social ROI against Rival sports boosts.</div>
        <div class="ai-bubble-assistant">
          Cortex causal models show Rival A's sports boost increased your Paid Social CPA by <strong>+18%</strong>. Recommend reallocating <strong>$450K</strong> from search display to defensive programmatic channels.
        </div>
      </div>
    `;
    productStackHTML = `
      <div class="product-stack-card">
        <span class="related-type">Primary Attribution Product</span>
        <h3>Cortex</h3>
        <p>Causal marketing mix attribution and scenario planning simulation dashboards to optimize multi-channel operators allocations.</p>
        <a href="${levelPrefix}products/cortex.html" class="btn secondary">Explore Cortex &rarr;</a>
      </div>
      <div class="product-stack-card">
        <span class="related-type">Supporting Radar Product</span>
        <h3>Jurnii 360</h3>
        <p>Streams continuous competitor welcome matches and rollovers databases directly to Cortex causal engines.</p>
        <a href="${levelPrefix}products/jurnii-360.html" class="btn secondary">Explore Jurnii 360 &rarr;</a>
      </div>
    `;
    personasHTML = `
      <div class="solution-persona-card">
        <div class="use-case-icon"><i data-lucide="megaphone"></i></div>
        <div class="use-case-details">
          <h3>Chief Marketing Officer</h3>
          <p>Justify programmatic media investments to the board using defensible, causal contribution models.</p>
        </div>
      </div>
      <div class="solution-persona-card">
        <div class="use-case-icon"><i data-lucide="coins"></i></div>
        <div class="use-case-details">
          <h3>Chief Financial Officer</h3>
          <p>Verify acquisition cost efficiency and protect EBITDA margin allocations before seasonal sporting campaigns.</p>
        </div>
      </div>
    `;
    finalCTATitle = 'Establish Defensible Causal Attribution';
    finalCTADesc = 'Stop allocating campaigns budgets blindly. Model prospective media mix allocations against active competitor movements with Cortex causal forecasting.';
    primaryCTALabel = 'Run Scenario Attribution Model';
  } else {
    // CRM/Retention
    heroVisualHTML = `
      <div class="solution-retention-panel" data-theme="dark">
        <div class="command-centre-header">
          <span class="command-centre-title">CRM Player Retention Trigger</span>
          <div class="command-pulse">
            <span class="command-pulse-dot" style="background:#ffbd2e;"></span> Alert Active
          </div>
        </div>
        <div class="command-centre-row" style="background:rgba(255,255,255,0.01);">
          <span class="command-centre-brand">Segment: VIP Sports</span>
          <span class="benchmark-badge warning">Churn Risk: High</span>
          <span class="command-centre-action">Rival matched promo</span>
        </div>
      </div>
    `;
    costOfInactionHTML = `
      <div class="solution-cost-card">
        <h3>Reactive CRM Bonus Spends</h3>
        <p>CRM teams attempt to recover high-value player cohorts with costly bonus cash after defection triggers are already pulled.</p>
      </div>
      <div class="solution-cost-card">
        <h3>CRM Loyalty Margin Waste</h3>
        <p>Re-investing margins in copycat CRM rewards without understanding true welcome offer parities, diluting holds.</p>
      </div>
      <div class="solution-cost-card">
        <h3>Silent VIP Attrition</h3>
        <p>10% of players drive 80% of revenue, and these high-value VIPs defect silently to competitors deploying targeted welcome offers.</p>
      </div>
    `;
    workflowHTML = `
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 01</span>
        <h3>Detect</h3>
        <p>Monitor competitor VIP welcome promos and CRM target adjustments regional surges.</p>
      </div>
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 02</span>
        <h3>Segment</h3>
        <p>Isolate high-value player cohorts most vulnerable to rival promotional generosity spikes.</p>
      </div>
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 03</span>
        <h3>Calibrate</h3>
        <p>Calculate the ideal loyalty match and wagering rollover needed to defend active conversions.</p>
      </div>
      <div class="solution-workflow-step">
        <span class="solution-workflow-num">Step 04</span>
        <h3>Retain</h3>
        <p>Deploy automated defensive welcome offers before competitors seasonal pushes trigger churn.</p>
      </div>
    `;
    evidenceVisualHTML = `
      <div class="feature-scorecard" data-theme="dark">
        <div class="scorecard-item">
          <div class="scorecard-meta">
            <span class="scorecard-label">VIP Cohort Churn Risk</span>
            <span class="scorecard-value">Low</span>
          </div>
          <div class="scorecard-bar-bg"><div class="scorecard-bar-fill" style="width: 14%; background:#57ff60;"></div></div>
        </div>
      </div>
    `;
    productStackHTML = `
      <div class="product-stack-card">
        <span class="related-type">Primary Radar Product</span>
        <h3>Jurnii 360</h3>
        <p>Surveys global competitor welcoming updates and CRM promotions activity to alert retention desks.</p>
        <a href="${levelPrefix}products/jurnii-360.html" class="btn secondary">Explore Jurnii 360 &rarr;</a>
      </div>
      <div class="product-stack-card">
        <span class="related-type">Supporting Forecast Product</span>
        <h3>Cortex</h3>
        <p>Models player churn thresholds and optimizes loyalty reward rates to prevent margin erosion.</p>
        <a href="${levelPrefix}products/cortex.html" class="btn secondary">Explore Cortex &rarr;</a>
      </div>
    `;
    personasHTML = `
      <div class="solution-persona-card">
        <div class="use-case-icon"><i data-lucide="users"></i></div>
        <div class="use-case-details">
          <h3>Head of CRM</h3>
          <p>Protect player lifetime values systematically, neutralizing rival campaigns sweeps before attrition triggers.</p>
        </div>
      </div>
      <div class="solution-persona-card">
        <div class="use-case-icon"><i data-lucide="coins"></i></div>
        <div class="use-case-details">
          <h3>Chief Commercial Officer</h3>
          <p>Optimize CRM loyalty allocations and re-investment yields relative to real competitor actions.</p>
        </div>
      </div>
    `;
    finalCTATitle = 'Combat Player Churn Contextually';
    finalCTADesc = 'Stop managing retention blind to alternative options. Track rival loyalty welcome strategies and deploy automated retention triggers today.';
    primaryCTALabel = 'Map VIP Player Churn Risk';
  }

  // 3. Resolve Adjacent Solutions relative links dynamically
  let rel1 = `${levelPrefix}solutions/competition-discovery.html`;
  let rel1Title = 'Discovery';
  let rel2 = `${levelPrefix}solutions/competition-offers.html`;
  let rel2Title = 'Offers';
  let rel3 = `${levelPrefix}solutions/competition-pricing.html`;
  let rel3Title = 'Pricing';
  
  if (category === 'brand') {
    rel1 = `${levelPrefix}solutions/user-interface-benchmarking.html`;
    rel1Title = 'UI Benchmarking';
    rel2 = `${levelPrefix}solutions/user-experience-benchmarking.html`;
    rel2Title = 'UX Benchmarking';
    rel3 = `${levelPrefix}solutions/conversion-rate-optimization.html`;
    rel3Title = 'CRO Optimization';
  } else if (category === 'cortex') {
    rel1 = `${levelPrefix}solutions/marketing-roi-attribution.html`;
    rel1Title = 'ROI Attribution';
    rel2 = `${levelPrefix}solutions/cross-channel-attribution.html`;
    rel2Title = 'Cross-Channel';
    rel3 = `${levelPrefix}solutions/marketing-mix-modeling-attribution.html`;
    rel3Title = 'MMM Modeling';
  } else if (category === 'retention') {
    rel1 = `${levelPrefix}solutions/life-time-value-optimization.html`;
    rel1Title = 'LTV Optimization';
    rel2 = `${levelPrefix}solutions/churn-rate-optimization.html`;
    rel2Title = 'Churn Optimization';
    rel3 = `${levelPrefix}solutions/competition-offers.html`;
    rel3Title = 'Offers Intelligence';
  }

  return `<!doctype html>
<html data-theme="light" lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${item.fullName} — Jurnii Solutions</title>
  <meta name="description" content="${item.lede}">
  <link rel="icon" href="${levelPrefix}assets/jurnii-icon-light.svg">
  <link rel="stylesheet" href="${levelPrefix}assets/site.css">
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
</head>
<body class="solution-page">

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
    <!-- Buyer Problem Hero -->
    <section class="solution-hero-premium">
      <div class="container">
        <div class="solution-hero-copy">
          ${productStackBadges}
          <p style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; margin: 16px 0 12px 0;">${categoryLabel}</p>
          <h1 style="font-size: clamp(32px, 4vw, 48px); font-weight: 800; letter-spacing: -0.03em; margin: 0 0 20px 0; color: var(--foreground); line-height: 1.1;">
            ${item.fullName.replace('Solutions', '').replace('Optimization', '').replace('Strategy', '')}
          </h1>
          <p class="page-hero-lede" style="font-size: 18px; color: var(--muted-foreground); line-height: 1.6; max-width: 680px; margin: 0 0 32px 0;">
            ${item.lede}
          </p>
          <div class="cta-row" style="display: flex; gap: 16px;">
            <a href="${primaryCTAUrl}" class="btn primary">${primaryCTALabel}</a>
            <a href="${parentProductUrl}" class="btn secondary">Explore product Stack</a>
          </div>
        </div>
        
        <!-- Hero Mockup Panel -->
        <div class="solution-hero-visual">
          ${heroVisualHTML}
        </div>
      </div>
    </section>

    <!-- Manifesto Block -->
    <section class="solution-manifesto" style="padding: 80px 0; border-bottom: 1px solid var(--border); background: var(--card); text-align: center;">
      <div class="container" style="max-width: 960px;">
        <p style="font-size: clamp(18px, 2.2vw, 22px); font-weight: 500; line-height: 1.7; color: var(--foreground); margin: 0; font-family: var(--font-sans); letter-spacing: -0.01em;">
          ${item.manifesto}
        </p>
      </div>
    </section>

    <!-- The Commercial Failure Mode -->
    <section class="solution-failure-mode">
      <div class="container" style="max-width: 1100px;">
        <div class="solution-failure-grid">
          <div>
            <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Operational Failure Mode</span>
            <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 20px 0; color: var(--foreground); line-height: 1.2;">The Cost of Operating Blind</h2>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6; margin-bottom: 16px;">
              ${item.challenge}
            </p>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6;">
              When operator stacks rely on retrospective metrics and siloed data, they remain highly vulnerable to sudden competitive campaigns sweeps and hidden onboarding friction hurdles. Copying rival strategies blindly dilutes margins and erosion acquisition efficiency.
            </p>
          </div>
          
          <div style="background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.015);">
            <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(148,255,150,0.12); color: var(--jurnii-700); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <i data-lucide="shield-alert" style="width: 20px; height: 20px;"></i>
            </div>
            <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">How Jurnii Resolves This</h3>
            <p style="font-size: 14.5px; color: var(--muted-foreground); line-height: 1.55; margin: 0 0 24px 0;">
              ${item.mechanics}
            </p>
            <div class="implication-callout" style="background:rgba(255,95,86,0.04); border-left:3px solid #ff5f56; padding: 16px; border-radius: 4px;">
              <span style="font-weight:700; color:#ff5f56; display:block; font-size:13px; margin-bottom:6px;">Commercial Threat</span>
              <p style="font-size: 13.5px; color: var(--muted-foreground); line-height: 1.45; margin:0;">
                Unresolved conversions leaks and copycat bonus generosity pricing dilutes Net Gaming Revenue yields by up to <b>35%</b>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Cost of Inaction Section -->
    <section class="solution-cost-section">
      <div class="container" style="max-width: 1100px;">
        <div style="text-align: center; margin-bottom: 48px;">
          <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Financial Cost</span>
          <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0;">The Cost of Inaction</h2>
        </div>
        <div class="solution-cost-grid">
          ${costOfInactionHTML}
        </div>
      </div>
    </section>

    <!-- Practical Solution Workflow -->
    <section class="solution-workflow-section">
      <div class="container" style="max-width: 1100px;">
        <div style="text-align: center; margin-bottom: 48px;">
          <span style="color: var(--jurnii-400); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Operational Workflow</span>
          <h2 style="font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin: 0;">How Jurnii Executes</h2>
        </div>
        <div class="solution-workflow">
          ${workflowHTML}
        </div>
      </div>
    </section>

    <!-- High-Fidelity Custom Evidence Section -->
    <section class="solution-evidence-section">
      <div class="container" style="max-width: 1100px;">
        <div class="solution-evidence-grid">
          <div>
            <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Platform Evidence Output</span>
            <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; color: var(--foreground); line-height: 1.2;">What The Buyer Gets</h2>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6; margin-bottom: 24px;">
              Our platform supplies decision desks with board-ready competitive profiles, quantitative usability scorecards, and causal spend allocation simulations.
            </p>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6; margin-bottom: 0;">
              Verify marketing कॉस्ट efficiencies dynamically, reconcile player acquisition costs against regional welcome shifts, and synchronize product priorities.
            </p>
          </div>
          
          <div class="solution-interface-panel">
            ${evidenceVisualHTML}
          </div>
        </div>
      </div>
    </section>

    <!-- Product Stack Section -->
    <section class="solution-product-section">
      <div class="container" style="max-width: 1100px;">
        <div style="text-align: center; margin-bottom: 48px;">
          <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Product Integrations</span>
          <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0;">The Jurnii Product Stack</h2>
        </div>
        <div class="solution-product-stack">
          ${productStackHTML}
        </div>
      </div>
    </section>

    <!-- Key Executive Personas -->
    <section class="solution-persona-section">
      <div class="container" style="max-width: 1100px;">
        <div style="text-align: center; margin-bottom: 48px;">
          <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Buyer Personas</span>
          <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0;">Who Owns This Solution</h2>
        </div>
        <div class="solution-persona-grid">
          ${personasHTML}
        </div>
      </div>
    </section>

    <!-- Ecosystem Connections -->
    <section class="solution-related-section">
      <div class="container" style="max-width: 1100px;">
        <div style="margin-bottom: 48px;">
          <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 12px 0;">Adjacent Solutions & Use-Cases</h2>
          <p style="font-size: 16px; color: var(--muted-foreground); margin: 0;">Explore how this solution coordinates with target business pathways.</p>
        </div>
        <div class="solution-related-grid">
          <a href="${rel1}" class="related-card">
            <span class="related-type">Adjacent Solution</span>
            <h3>${rel1Title}</h3>
            <p>Optimize yield performance against specialized regional parameters.</p>
          </a>
          <a href="${rel2}" class="related-card">
            <span class="related-type">Adjacent Solution</span>
            <h3>${rel2Title}</h3>
            <p>Standardize target promotions benchmarks side-by-side with global peers.</p>
          </a>
          <a href="${rel3}" class="related-card">
            <span class="related-type">Adjacent Solution</span>
            <h3>${rel3Title}</h3>
            <p>Model operator hold rates relative to multi-channel allocations.</p>
          </a>
        </div>
      </div>
    </section>

    <!-- Bespoke Final CTA -->
    <section class="solution-final-cta">
      <div class="solution-final-cta-card">
        <h2>${finalCTATitle}</h2>
        <p>${finalCTADesc}</p>
        <div class="cta-row" style="display: flex; gap: 16px; justify-content: center;">
          <a href="${primaryCTAUrl}" class="btn primary">${primaryCTALabel}</a>
          <a href="${parentProductUrl}" class="btn secondary">Explore product Stack</a>
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
  const html = getPageHTML(item.fullName, item.lede, item.kicker, item.fullName, item.lede, item.manifesto, item.capabilities, '../', true, item.challenge, item.mechanics, item.proofText, item.targetPersona, item.slug);
  fs.writeFileSync(itemFilePath, html, 'utf8');
  console.log('Generated Feature LP:', item.slug);
});

// Generate the solution pages
solutionsData.forEach(item => {
  const itemFilePath = path.join(root, item.slug);
  ensureDirectoryExistence(itemFilePath);
  const html = getSolutionPageHTML(item, '../');
  fs.writeFileSync(itemFilePath, html, 'utf8');
  console.log('Generated Solution LP:', item.slug);
});

console.log('Successfully generated all 32 expanded features and solutions pages!');

