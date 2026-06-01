const fs = require('fs');
const path = require('path');

const root = process.cwd();

// Complete, rich, professional use case database
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
        ],
        pressure: "Defend marketing expenditures, explain fluctuating acquisition CPAs to the board, and separate actual marketing performance from external market pressures.",
        decisions: [
          { decision: "Where should budget move next?", signal: "Competitor promo pressure + causal incrementality", output: "Dynamic scenario model + board-ready ROI view" },
          { decision: "Is Paid Search spending incremental?", signal: "Search CPA spikes vs rival welcome generosity", output: "Causal search re-allocation recommendation" }
        ],
        missingInfo: "Real-time competitor promotion richness metrics and causal attribution modeling that separates internal player momentum from rival promotional sweeps.",
        weeklyRhythm: [
          { day: "Mon", title: "Market Sweep", desc: "Audit rival welcome offers and positioning claims." },
          { day: "Tue", title: "Causal Sync", desc: "Re-model CPA changes against rival promo index." },
          { day: "Wed", title: "Budget Shift", desc: "Re-allocate programmatic bids away from saturated channels." },
          { day: "Fri", title: "Board Report", desc: "Generate board-ready spend attribution and incrementality reports." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Marketers spend hours scraping competitor landing pages manually." },
          { marker: "02", desc: "Budgets are allocated blindly using outdated last-click attribution sheets." },
          { marker: "03", desc: "Media spends leak during competitor welcome offer spikes." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Always-on trackers collect 100% of competitor promotion terms." },
          { marker: "02", desc: "Cortex causal engines isolate real organic campaign incrementality." },
          { marker: "03", desc: "CPA efficiency is protected by shifting bids away from competitor surges." }
        ],
        evidenceTitle: "Cortex Spend Attribution Board",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Cortex Causal Spend Model</span>
              <span class="decision-badge">Active Model</span>
            </div>
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:10px; padding:16px; margin-bottom:16px;">
              <h4 style="font-size:13px; text-transform:uppercase; font-family:var(--font-mono); color:rgba(255,255,255,0.6); margin:0 0 8px 0;">Attributed Campaign Incrementality</h4>
              <span style="font-size:24px; font-weight:800; color:#fff;">+46% Yield Lift</span>
            </div>
            <p style="font-size:13px; color:rgba(255,255,255,0.6); line-height:1.45; margin:0;">
              Attributed on a $17.1M media mix budget. Identified $4.85M in redundant spends under high competitor promo pressure.
            </p>
          </div>
        `,
        productStack: ["cortex", "jurnii-360"],
        commercialOutcomes: [
          { title: "Validated ROAS", desc: "Defend marketing budgets with board-ready causal proof that separates spend efficiency from market trends." },
          { title: "Optimized Media Mix", desc: "Reallocate programmatic search bids dynamically away from high-CPA competitor promo spikes." }
        ],
        finalCTA: "Access your CMO Operating View"
      },
      {
        id: "cco",
        name: "CCO",
        fullName: "Chief Commercial Officer",
        slug: "use-cases/roles/cco.html",
        kicker: "Margin Defence",
        lede: "Protect EBITDA yields, calibrate welcome promo richness, and defend player lifetime value (LTV) against competitive promo pressure.",
        manifesto: "Jurnii normalizes competitor promotions, giving Chief Commercial Officers the data needed to calibrate wagering rollovers, defend Net Gaming Revenue holds, and optimize player loyalty incentives contextually.",
        challenge: "CCOs own NGR/GGR holds, but loyalty is fragile under high player multi-homing rates (70-80%). Siloed player databases mask when competitor targeted promotions draw high-value VIP players away. Squeezed by CRM demands, operators duplicate rival welcomes blindly, bleeding operator hold rates and causing severe CRM margin dilution.",
        mechanics: "Jurnii 360 calculates the Promo Richness Index across regulated regions. CCOs model operator payout curves and wageringplay-through multiples side-by-side with rivals to establish highly optimized margin boundaries.",
        proofText: "Jurnii 360's promotions matrix tracks 100% of competitor moves automatically, defending operator margins.",
        targetPersona: "Chief Commercial Officers utilize Jurnii margin calibrators to deploy high-yield loyalty rewards.",
        capabilities: [
          { title: "Margin Calibration", icon: "sliders", desc: "Model welcome wagering rollovers and deposit matches mathematically to prevent margin hold dilution." },
          { title: "VIP Churn Surveillance", icon: "user-minus", desc: "Trace targeted competitor campaign streams that threaten high-value customer portfolios in real-time." },
          { title: "Yield Benchmarking", icon: "trending-up", desc: "Grade competitive welcome richness indicators to establish defensive promotions parities." }
        ],
        pressure: "Protect Gross and Net Gaming holds, maintain active competitor parity, and prevent player defection without copycat CRM margin waste.",
        decisions: [
          { decision: "Are welcome offers over-generous?", signal: "Wagering play-through vs regional hold rates", output: "Promo Richness Index calibrated margin limits" },
          { decision: "How should CRM retain high-value players?", signal: "VIP defection flags vs rival retention plays", output: "Targeted, margin-safe loyalty incentives" }
        ],
        missingInfo: "Unified visibility of competitor promotional wager requirements, active bonus structures, and player retention triggers.",
        weeklyRhythm: [
          { day: "Mon", title: "Parity Check", desc: "Review competitor welcomes and bonus play-through levels." },
          { day: "Tue", title: "Margin Model", desc: "Audit welcome payout curves against regional NGR goals." },
          { day: "Thu", title: "VIP Alert", desc: "Track VIP churn indicators under competitor surges." },
          { day: "Fri", title: "CRM Review", desc: "Approve margin-optimized player loyalty distributions." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "CRM desks duplicate competitor signup bonuses reactively and blind." },
          { marker: "02", desc: "High-value VIP cohorts defect silently to more generous competitor platforms." },
          { marker: "03", desc: "Operator Net Gaming Revenue hold rates dilute through unoptimized wagers." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Jurnii Promo Richness Index evaluates competitor bonus rollovers." },
          { marker: "02", desc: "Active surveillance alerts retention desks of competitor VIP incentives." },
          { marker: "03", desc: "Margins and EBITDA are protected by setting optimized margin boundaries." }
        ],
        evidenceTitle: "CCO Live Competitor Radar",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Live Competitor Command Radar</span>
              <span class="decision-badge" style="background:rgba(255,95,86,0.1); color:#ff5f56; border-color:rgba(255,95,86,0.2);">Surge Alert</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; font-size:13px;">
                <span>Rival Sportsbook</span>
                <span style="color:#ff5f56; font-weight:700;">Promo Richness: 86</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:12px; color:rgba(255,255,255,0.6);">
                <span>Wagering Hurdle Drop</span>
                <span>40x &rarr; 15x Playthrough</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-360", "cortex"],
        commercialOutcomes: [
          { title: "Safeguarded EBITDA", desc: "Maintain absolute regional market parity while locking in strict margin hold rate protections." },
          { title: "VIP Loyalty Protected", desc: "Trace and neutralize competitor welcome sweeps targeting your player portfolios." }
        ],
        finalCTA: "Build your Commercial Response Workflow"
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
        ],
        pressure: "Coordinate multiple departments, accelerate product roadmap sprint times, and eliminate manual competitor tracking overhead.",
        decisions: [
          { decision: "How should product sprints be ordered?", signal: "UX friction severity + conversion yield impact", output: "Ranked developer roadmap priorities checklist" },
          { decision: "Where is onboarding leaking player traffic?", signal: "KYC verification drop-offs vs competitor speed", output: "Targeted single-page registration workflow design" }
        ],
        missingInfo: "Objective, mathematically structured usability metrics to replace subjective styling arguments across product pipelines.",
        weeklyRhythm: [
          { day: "Mon", title: "Speed Check", desc: "Track regional Core Web Vitals speed compared to rivals." },
          { day: "Tue", title: "Audit Run", desc: "Execute automated heuristic audits over signup flows." },
          { day: "Wed", title: "Sprint Sync", desc: "Re-prioritize roadmap based on conversion leakage impact." },
          { day: "Fri", title: "Ops Alignment", desc: "Deliver objective experience scorecard metrics to leadership." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Analysts waste 30+ hours weekly compiling manual competitor layouts." },
          { marker: "02", desc: "Engineering sprints are dictated by subjective internal opinions." },
          { marker: "03", desc: "Subtle KYC validation errors trigger immediate player defection." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Server-side scrapers normalize competitor checkout interfaces." },
          { marker: "02", desc: "Roadmaps are ranked systematically by GGR conversion severity." },
          { marker: "03", desc: "Registration friction is resolved through verified UI best practices." }
        ],
        evidenceTitle: "COO UX Experience Scorecard",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Jurnii UX Usability Index</span>
              <span class="decision-badge" style="background:rgba(0,122,255,0.1); color:#007aff; border-color:rgba(0,122,255,0.2);">Audited</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div>
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                  <span>Heuristic Usability Score</span>
                  <span style="color:#007aff; font-weight:700;">88%</span>
                </div>
                <div style="background:rgba(255,255,255,0.05); height:6px; border-radius:3px; overflow:hidden;">
                  <div style="background:#007aff; height:100%; width:88%;"></div>
                </div>
              </div>
              <div style="font-size:12px; color:rgba(255,255,255,0.6);">
                Active bottlenecks: 2 validation field barriers logged in verification funnel.
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-ux", "jurnii-360"],
        commercialOutcomes: [
          { title: "Accelerated Sprints", desc: "Save 30+ hours per week of developer overhead by delivering objective, ready-to-code UX updates." },
          { title: "Funnel Integrity", desc: "Eliminate conversion-killing latency and KYC roadblocks across transactional paths." }
        ],
        finalCTA: "Align Your Product Roadmap Today"
      },
      {
        id: "cpo",
        name: "CPO",
        fullName: "Chief Product Officer",
        slug: "use-cases/roles/cpo.html",
        kicker: "Product Alignment",
        lede: "Benchmark product UX layouts against competitor portals, rank customer registration issues by GGR impact, and align technical pipelines around objective usability scoring.",
        manifesto: "Product leaders utilize Jurnii UX to prioritize roadmap sprints based on objective user experience metrics, neutralizing subjective internal debates and optimizing high-security verification funnels to accelerate conversions.",
        challenge: "Product teams lack a standardized framework to measure usability, relying on ad-hoc feedback or slow agencies. This causes severe friction points during player KYC and deposit steps, triggering funnel abandonment that dilutes Net Gaming Revenue.",
        mechanics: "Jurnii UX runs continuous server-side heuristic audits, generating 70+ ranked usability metrics across 4 key onboarding phases to clear transactional bottlenecks.",
        proofText: "Unlock 70+ prioritized UX recommendations in minutes to align developer backlogs with validated yield restoration.",
        targetPersona: "Chief Product Officers deploy Jurnii scorecards to justify engineering sprints and outpace rival portals.",
        capabilities: [
          { title: "Heuristic UX Scoring", icon: "award", desc: "Automate user interface audits across core registration, verification, and deposit pipelines." },
          { title: "Roadmap Prioritization", icon: "clipboard-list", desc: "Prioritize design updates based on estimated player conversion and revenue recovery potential." },
          { title: "Journey State Maps", icon: "route", desc: "Model user progress through verification (KYC), wallet selection, and checkouts systematically." }
        ],
        pressure: "Eliminate opinionated aesthetic arguments, protect developmental resources, and boost signup funnel conversions.",
        decisions: [
          { decision: "Which design tweaks build conversions?", signal: "Heuristic score gaps vs competitor UI benchmarks", output: "Targeted form layout corrections checklist" },
          { decision: "Where does payment checkout drop off?", signal: "Deposit page load delays + gateway friction", output: "Optimized deposit button and checkout grid layouts" }
        ],
        missingInfo: "Objective usability diagnostics mapping player friction points directly to GGR and CAC metrics.",
        weeklyRhythm: [
          { day: "Mon", title: "Layout Audit", desc: "Execute automated usability audits across web and mobile." },
          { day: "Tue", title: "Rival Review", desc: "Benchmark typography, color contrast, and spacing with top peers." },
          { day: "Thu", title: "Prioritize", desc: "Rank developmental tickets based on conversion severity." },
          { day: "Fri", title: "Ship Code", desc: "Deliver ready-to-implement UI task checklists to engineering." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Product teams debate layout elements based on subjective opinions." },
          { marker: "02", desc: "Heads of UX wait weeks for agency usability heuristic reviews." },
          { marker: "03", desc: "Heavy script sizes and heavy assets delay checkout flows on mobile." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Jurnii scorecards establish unified EXPERIENCE metrics across platforms." },
          { marker: "02", desc: "Heuristics diagnostics deliver prioritized UX blueprints instantly." },
          { marker: "03", desc: "Vitals monitoring catches technical latency drift under mobile networks." }
        ],
        evidenceTitle: "CPO Roadmap Prioritization Panel",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Product Sprint Prioritization</span>
              <span class="decision-badge">Ranked Backlog</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:12px;">
              <div style="display:flex; justify-content:space-between; padding:8px; background:rgba(255,95,86,0.1); border-left:3px solid #ff5f56; border-radius:4px;">
                <span>01. KYC validation error guidance</span>
                <span style="color:#ff5f56; font-weight:700;">Critical Leak</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:8px; background:rgba(255,189,46,0.1); border-left:3px solid #ffbd2e; border-radius:4px;">
                <span>02. Deposit checkout grid latency</span>
                <span style="color:#ffbd2e; font-weight:700;">High Impact</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-ux", "jurnii-360"],
        commercialOutcomes: [
          { title: "Optimized Roadmap", desc: "Focus developmental resources on high-conversion issues, eliminating backlog waste." },
          { title: "Healed Funnel Leaks", desc: "Diagnose and resolve KYC document upload bottlenecks, maximizing signups yield." }
        ],
        finalCTA: "Prioritise Your Product Roadmap"
      },
      {
        id: "cfo",
        name: "CFO",
        fullName: "Chief Financial Officer",
        slug: "use-cases/roles/cfo.html",
        kicker: "Financial Confidence",
        lede: "Reconcile promotional campaign spend with causal attribution models, evaluate welcome offer incrementality, and align commercial marketing budgets with strict EBITDA margin protections.",
        manifesto: "Financial leaders deploy Jurnii Cortex to establish single-source-of-truth marketing attribution, validating programmatic search displays and media mix efficiency through causal incrementality forecasts.",
        challenge: "CFOs are presented with vague last-click attribution sheets from marketing teams that obscure real competitor promotions surges, causing high acquisition spend leakage and massive margin hold dilution.",
        mechanics: "Cortex processes marketing data warehouses side-by-side with competitor promotional timelines to isolate true incremental spend yields and reallocate underperforming programmatic display budgets.",
        proofText: "Cortex causal models verified $4.85M in inefficiency savings on a real-world $17.1M programmatic spend.",
        targetPersona: "Chief Financial Officers rely on Cortex data pipelines to reconcile marketing mix budgets with audited EBITDA yields.",
        capabilities: [
          { title: "Causal Reallocation", icon: "pie-chart", desc: "Verify incrementality across media investments to secure ROAS and prevent acquisition spent wastes." },
          { title: "Finance Reconciliation", icon: "file-text", desc: "Synthesize audited compliance reports to reconcile campaign wagers directly with EBITDA returns." },
          { title: "Cortex API Integration", icon: "database", desc: "Export MMM-ready promotions history directly into corporate ledger networks." }
        ],
        pressure: "Verify marketing budget effectiveness, defend spend against flat ROAS assumptions, and prevent competitor welcome bonuses from eroding margins.",
        decisions: [
          { decision: "Are media spends driving incrementality?", signal: "Cortex causal lift scores vs competitor promo actions", output: "Audited spend performance report" },
          { decision: "What is our real CRM margin leakage?", signal: "Player bonuses distributions vs wagers rollovers", output: "Calibrated CRM bonus distribution limit rules" }
        ],
        missingInfo: "Audited causal campaign lift metrics that separate organic players baseline from competitor offer sweeps.",
        weeklyRhythm: [
          { day: "Mon", title: "Spend Sync", desc: "Reconcile programmatic displays spend vs rival welcome events." },
          { day: "Tue", title: "Attribution", desc: "Isolate incremental organic campaign yields in Cortex." },
          { day: "Thu", title: "Margin Audit", desc: "Verify player loyalty matches against target margin holds." },
          { day: "Fri", title: "Board Review", desc: "Deliver audited EBITDA contribution reports to directors." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Marketing requests budget extensions based on flawed last-click charts." },
          { marker: "02", desc: "Operators bleed acquisition cash bidding blindly against competitor surges." },
          { marker: "03", desc: "Finance and marketing clash over untrackable promotion conversions." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Cortex causal models isolate true organic campaign yield contribution." },
          { marker: "02", desc: "programmatic display bids are shifted away from un-incremental segments." },
          { marker: "03", desc: "Finance and marketing align around a unified, board-ready spend model." }
        ],
        evidenceTitle: "CFO Finance Reconciliation Table",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Cortex Finance Reconciliation</span>
              <span class="decision-badge" style="background:rgba(87,255,96,0.1); color:#57ff60; border-color:rgba(87,255,96,0.2);">Audited</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Total program spend:</span>
                <span style="font-family:var(--font-mono);">$17.1M</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Incremental CAC lift:</span>
                <span style="color:#57ff60;">+46% ROI</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Redundant spend recovered:</span>
                <span style="color:#57ff60; font-weight:700;">$4.85M</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["cortex", "jurnii-360"],
        commercialOutcomes: [
          { title: "Audited ROI Confidence", desc: "Replace subjective marketing spreadsheets with audited, scientifically accurate causal spent proof." },
          { title: "protected Margins", desc: "Calibrate promotions and CRM bonuses directly against strict corporate EBITDA thresholds." }
        ],
        finalCTA: "Model Your Corporate Marketing ROI"
      },
      {
        id: "ceo",
        name: "CEO",
        fullName: "Chief Executive Officer",
        slug: "use-cases/roles/ceo.html",
        kicker: "Boardroom Clarity",
        lede: "Establish complete regional market visibility, standardize portfolio experience scoring, and align scaling departments around verified commercial and product truths.",
        manifesto: "CEOs utilize Jurnii as a central intelligence layer, consolidating competitor surveillance and onboarding experience grades to protect brand portfolios and justify international expansion budgets.",
        challenge: "Chief Executives operate with highly fragmented reporting from separate product, trading, and marketing teams, leading to subjective board discussions and slow strategic response times.",
        mechanics: "Jurnii consolidates live competitor command centres and UX scorecards into standardized boardroom dashboards, tracking brand portfolios dynamically across 35 monitored markets.",
        proofText: "Standardize market visibility across multiple multi-brand portfolios to protect EBITDA and guide corporate due diligence.",
        targetPersona: "Chief Executive Officers deploy Jurnii central consoles to drive cross-functional alignment and board compliance.",
        capabilities: [
          { title: "Market Radar", icon: "radar", desc: "Map active gaming conglomerates and challenger operators entering target regions automatically." },
          { title: "Meta Scoring Index", icon: "sparkles", desc: "Establish a single experience metric across multiple sister brands and regional portfolios." },
          { title: "Strategic Planning", icon: "compass", desc: "Model regional player welcome index values to establish defensive expansion footprints." }
        ],
        pressure: "Unify fragmented departmental reports, eliminate multi-brand blind spots, and expand into new regulated jurisdictions with absolute confidence.",
        decisions: [
          { decision: "Should we enter target jurisdiction?", signal: "Competitor welcome offers density + regional UX parities", output: "EBITDA expansion risk blueprint model" },
          { decision: "How are sister brands executing?", signal: "Unified Jurnii UX Meta Scores across portfolio", output: "Objective product performance scorecard" }
        ],
        missingInfo: "Single-source-of-truth visual dashboards summarizing competitive shifts and usability scores globally.",
        weeklyRhythm: [
          { day: "Mon", title: "Market Radar", desc: "Audit regional competitive density maps in Jurnii 360." },
          { day: "Tue", title: "Product Grade", desc: "Compare Meta Scores across multi-brand layouts." },
          { day: "Thu", title: "Board Review", desc: "Align regional managers around unified market scorecards." },
          { day: "Fri", title: "growth Plan", desc: "Approve expansion budgets backed by causal Cortex models." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "CEO operates in departmental silos, wading through contradictory spreadsheets." },
          { marker: "02", desc: "Expansion strategies rely on retrospective consulting slides and guessworks." },
          { marker: "03", desc: "Uncoordinated regional managers copy competitor promotions blindly." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Jurnii centralizes all competitor data and experience scores." },
          { marker: "02", desc: "Expansion models analyze active welcome density and UX parities." },
          { marker: "03", desc: "Unified dashboards align trading, marketing, and product roadmaps." }
        ],
        evidenceTitle: "CEO Multi-Market Control Plane",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Jurnii Central Control Plane</span>
              <span class="decision-pulse" style="font-size:11px; color:#57ff60; display:flex; align-items:center; gap:6px;"><span style="width:6px; height:6px; background:#57ff60; border-radius:3px; display:inline-block;"></span> Monitoring Active</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Brands Monitored:</span>
                <span>300+</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Regulated States:</span>
                <span>35 Sim</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Portfolio Experience Grade:</span>
                <span style="color:#57ff60; font-weight:700;">Grade A-</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-360", "jurnii-ux", "cortex"],
        commercialOutcomes: [
          { title: "Cross-Functional Alignment", desc: "Align commercial, product, and marketing departments around standardized digital facts." },
          { title: "Expansion Security", desc: "Enter new regulated jurisdictions with locked-in wagers parities and protected EBITDA holds." }
        ],
        finalCTA: "Map Enterprise Market Visibility"
      },
      {
        id: "head-of-product",
        name: "Head of Product",
        fullName: "Head of Product",
        slug: "use-cases/roles/head-of-product.html",
        kicker: "Product Execution",
        lede: "Diagnose registration form friction, accelerate document upload steps, and deliver flawless conversion loops across web and mobile portfolios.",
        manifesto: "Empower product management teams with prioritized usability checklists, converting design variables into measurable conversion gains to resolve player onboarding bottlenecks.",
        challenge: "Product managers undergo endless styling debates with designers while conversion friction in high-security KYC verification loops causes player dropout. Silent layout errors degrade trust without clear technical visibility.",
        mechanics: "Jurnii indexes mobile checkout states and KYC checkboxes side-by-side with industry best practices, identifying exactly where onboarding flow slows down.",
        proofText: "Reduce player registration friction and secure onboarding completion yields across all mobile networks.",
        targetPersona: "Product Managers use Jurnii journey maps to eliminate form field fatigue and boost deposit rates.",
        capabilities: [
          { title: "Friction Diagnostics", icon: "alert-triangle", desc: "Pinpoint validation form fields, security checkbox errors, and cognitive load hurdles." },
          { title: "Onboarding Flow Scores", icon: "filter", desc: "Grade player onboarding pathways side-by-side with premier operator portals." },
          { title: "Speed Performance Track", icon: "zap", desc: "Track Largest Contentful Paint LCP speed drop-offs under restricted mobile bands." }
        ],
        pressure: "Accelerate user registration speed, eliminate document upload KYC blocks, and prioritize development tickets by conversion yield impact.",
        decisions: [
          { decision: "How can we increase verification rates?", signal: "KYC validation checks vs competitor signup speed", output: "Single-page verification interface blueprint" },
          { decision: "Are mobile loading times blocking signups?", signal: "LCP speeds under 3G network simulations", output: "Optimized styling stylesheets payload requirements" }
        ],
        missingInfo: "Structured, server-side onboarding transition metrics to replace retrospective and slow manual journey testing.",
        weeklyRhythm: [
          { day: "Mon", title: "Speed Check", desc: "Audit Core Web Vitals speed compared to competitor checkouts." },
          { day: "Tue", title: "Onboard Scan", desc: "Run usability heuristic scoring over KYC document gates." },
          { day: "Thu", title: "Prioritize", desc: "Rank developmental tickets based on estimated conversion yield lift." },
          { day: "Fri", title: "Deploy Fix", desc: "Deliver optimized visual spacing layouts to engineering." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Product managers debate design aesthetics without commercial data." },
          { marker: "02", desc: "Players abandon registration flows due to heavy validation forms." },
          { marker: "03", desc: "Technical speed drifts go unnoticed, killing mobile checkouts holds." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Heuristics scorecards define objective layout usability indices." },
          { marker: "02", desc: "Single-page registration flow accelerates player conversions." },
          { marker: "03", desc: "Latency monitoring catches payload hurdles before abandonment triggers." }
        ],
        evidenceTitle: "Product Journey Friction Heatmap",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Player Onboarding Journey Map</span>
              <span class="decision-badge" style="background:rgba(255,95,86,0.1); color:#ff5f56; border-color:rgba(255,95,86,0.2);">Leak Blocked</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Onboarding momentum:</span>
                <span>Web-to-Mobile</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Friction bottlenecks:</span>
                <span style="color:#ff5f56;">KYC Address Field</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Conversion yield restore:</span>
                <span style="color:#57ff60; font-weight:700;">+35% Signup Lift</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-ux", "jurnii-360"],
        commercialOutcomes: [
          { title: "Healed KYC Drops", desc: "Streamline verification funnels to recover lost player cohorts, maximizing CAC efficiency." },
          { title: "Optimized Sprints", desc: "Base developmental priorities on quantified commercial consequences, protecting technical capacities." }
        ],
        finalCTA: "Map your Product onboarding Conversion"
      },
      {
        id: "head-of-marketing",
        name: "Head of Marketing",
        fullName: "Head of Marketing",
        slug: "use-cases/roles/head-of-marketing.html",
        kicker: "Growth Execution",
        lede: "Calibrate paid search bids against live competitor welcome matches, optimize acquisition banner copy, and maximize paid media campaigns yield.",
        manifesto: "Empower media buyer teams with live competitor offer alerts, optimizing programmatic spend and welcome overlay copywriting to stand out in saturated search spaces.",
        challenge: "Marketing teams launch search bids without knowing competitor signup promotions, leading to costly bidding wars on identical messaging hooks and high acquisition costs.",
        mechanics: "Jurnii scans competitor homepage designs and signup offers dynamically, alerting marketing teams the moment a competitor shifts welcoming bonus rollover hurdles.",
        proofText: "Optimize ad campaigns creative copy dynamically using live competitive positioning benchmarks to lower CPA.",
        targetPersona: "Marketing Managers utilize competitor creative feeds to refine copywriting hooks and protect media ROAS.",
        capabilities: [
          { title: "Active Signup Scanning", icon: "activity", desc: "Detect and log newly introduced welcome offers within minutes of launching to guide responses." },
          { title: "Value Claim Analysis", icon: "award", desc: "Extract and index all digital copywriting claims, tracking dominant competitor positioning themes." },
          { title: "Creative Messaging Intel", icon: "image", desc: "Benchmark visual banner layouts and CTA copywriting placements side-by-side with rivals." }
        ],
        pressure: "Defend programmatic Display spent, lower high customer acquisition costs, and stand out across commoditized keyword bid spaces.",
        decisions: [
          { decision: "Which copywriting hooks convert best?", signal: "Competitor visual value claims maps + CPA returns", output: "Optimized differentiated landing page layouts" },
          { decision: "Are media bids saturated by rival surges?", signal: "Live competitor welcome richness surges in region", output: "Shifted search bids to underserved states" }
        ],
        missingInfo: "Real-time competitor welcome richness alerts and copywriting claim maps across regional platforms.",
        weeklyRhythm: [
          { day: "Mon", title: "Position Map", desc: "Audit rival copywriting claims and Homepage banners." },
          { day: "Tue", title: "Richness Sync", desc: "Analyze competitor bonus rollovers in Jurnii 360." },
          { day: "Thu", title: "Shift Spends", desc: "Reallocate programmatic display budgets away from rival surges." },
          { day: "Fri", title: "Deploy Copy", desc: "Launch differentiated landing page copywriting hooks." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Creative teams write copy based on internal guidelines alone." },
          { marker: "02", desc: "Marketers bid aggressively on identical keywords against giant rivals." },
          { marker: "03", desc: "Signup pages leak acquired clicks due to uncalibrated promotions." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Competitor creative alerts index active competitor advertising hooks." },
          { marker: "02", desc: "Media buyers target messaging voids ignored by slower rivals." },
          { marker: "03", desc: "Welcome richness indices calibrate bonuses to lower customer CAC." }
        ],
        evidenceTitle: "Marketing Creative Messaging panel",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Competitor Copy Hook Audit</span>
              <span class="decision-badge" style="background:rgba(168,85,247,0.1); color:#a855f7; border-color:rgba(168,85,247,0.2);">Analyzed</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Rival value claim:</span>
                <span style="color:#ffbd2e;">"Fastest Payouts" (Saturated)</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Messaging void:</span>
                <span style="color:#57ff60;">"No Wagering Hurdle" (Open)</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>CPA projection:</span>
                <span style="color:#57ff60; font-weight:700;">-18% Acquisition CPA</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-360", "cortex"],
        commercialOutcomes: [
          { title: "Differentiated Spends", desc: "Lower overall customer acquisition cost (CAC) by launching campaigns targeting competitive messaging voids." },
          { title: "Protected campaigns ROAS", desc: "Calibrate welcome wagers dynamically based on real-time competitor promotions richness benchmarks." }
        ],
        finalCTA: "Automate Your Competitor copy surveillance"
      },
      {
        id: "head-of-crm",
        name: "Head of CRM",
        fullName: "Head of CRM",
        slug: "use-cases/roles/head-of-crm.html",
        kicker: "Retention Strategy",
        lede: "Combat player churn contextually by triggering defensive loyalty bonuses when competitor promotions pressure spikes, protecting player lifetime values.",
        manifesto: "CRM directors deploy Jurnii alerts to align loyalty bonus rollovers with active market parities, preventing VIP player defection through highly context-sensitive player retention campaigns.",
        challenge: "CRM desks work blind to competitor player rewards, deploying generic bonuses only after player churn triggers have already occurred, diluting operator margins.",
        mechanics: "We match internal player engagement drops to competitor promo richness surges, alerting player desks to adjust loyalty incentives proactively.",
        proofText: "Proactive loyalty calibrations protect high-value VIP player portfolios and preserve GGR holds.",
        targetPersona: "Heads of CRM use Jurnii triggers to prevent player attrition and stabilize long-term customer margins.",
        capabilities: [
          { title: "Rival Promos Tracking", icon: "tag", desc: "Scrape competitor sign-up offers, sports bonuses, and wagering rollovers globally." },
          { title: "Retention Alert Engine", icon: "bell", desc: "Configure push notifications triggered by sudden changes in competitor welcome wagers." },
          { title: "CRM Margin calibrators", icon: "sliders", desc: "Optimize loyalty distributions relative to competitor Promo Richness scores." }
        ],
        pressure: "Prevent customer attrition, protect Net Gaming holds from reactive margin waste, and maintain VIP customer loyalty contextually.",
        decisions: [
          { decision: "Are player churn flags competitive?", signal: "VIP drop-offs vs rival deposit matches increases", output: "Margin-optimized loyalty wagers triggers" },
          { decision: "When should we deploy rewards?", signal: "Competitor campaigns sweeps timeline forecasts", output: "High-yield seasonal loyalty schedules" }
        ],
        missingInfo: "Unified, automated competitor CRM rewards alerts and wagers multipliers mapping across target regulated markets.",
        weeklyRhythm: [
          { day: "Mon", title: "Alerts check", desc: "Audit competitor VIP welcome surges in Jurnii 360." },
          { day: "Tue", title: "Segment Sync", desc: "Map player engagement thresholds against rival promo index." },
          { day: "Thu", title: "Calibrate", desc: "Define optimized wagers requirements for defensive loyalty." },
          { day: "Fri", title: "Reward VIP", desc: "Deploy targeted loyalty triggers contextually before weekend sport sweeps." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "CRM managers distribute costly bonus money blindly to lost player cohorts." },
          { marker: "02", desc: "High-value VIPs Defect silently to more generous competitor platforms." },
          { marker: "03", desc: "Wagering requirements are duplicated from old wagers sheets." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Loyalty wagers are calibrated dynamically based on competitor RICHNESS index." },
          { marker: "02", desc: "Contextual alerts trigger defensive rewards before VIP player attrition." },
          { marker: "03", desc: "CRM reinvestment yield is protected, securing Net Gaming hold rates." }
        ],
        evidenceTitle: "CRM VIP Segment Risk panel",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">VIP Segment Churn Trigger</span>
              <span class="decision-badge" style="background:rgba(255,189,46,0.1); color:#ffbd2e; border-color:rgba(255,189,46,0.2);">Alert active</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>VIP Cohort Segment:</span>
                <span>Active Sportsbook VIPs</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Competitor threat index:</span>
                <span style="color:#ffbd2e;">High (Ontario region)</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Defensive wagers target:</span>
                <span style="color:#57ff60; font-weight:700;">20x Rollover Match</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-360", "cortex"],
        commercialOutcomes: [
          { title: "VIP Churn Prevention", desc: "Retain high-value player cohorts before they defect to rival targeted welcome wagers." },
          { title: "Protected CRM yields", desc: "Deploy margin-safe player rewards calculated mathematically, avoiding margin erosion." }
        ],
        finalCTA: "Map your CRM Player Retention Risk"
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
        mechanics: "Jurnii provides immediate, low-overhead competitor surveillance by tracking competitor welcome offers and usability states across target jurisdictions. Operators use Jurnii's global repository of 300+ brands analysed to identify welcome offer gaps, and deploy agile, highly targeted counter-campaigns that maximize every dollar spent on paid channels.",
        proofText: "Use Jurnii's repository of 300+ brands analysed to identify high-value market voids and lower acquisition CPA.",
        targetPersona: "Scaling Founders and C-Suite leaders at SMB operators use Jurnii's out-of-the-box dashboards to maintain parity without enterprise-level overheads.",
        capabilities: [
          { title: "Agile Positioning", icon: "zap", desc: "Exploit local market gaps, welcome offer voids, and creative messaging opportunities left open by slower competitor conglomerates." },
          { title: "Budget Efficiency", icon: "coins", desc: "Maximize limited marketing budgets by analyzing and refining winning regional promotional frameworks and bonus wagering thresholds." },
          { title: "Fast Implementation", icon: "check-circle", desc: "Access fully compiled competitor insights from day one, with zero complex database integrations or custom coding required." }
        ],
        pressure: "Compete with heavily resourced conglomerates, lower customer CAC rates, and optimize signups without dedicated analysts teams.",
        decisions: [
          { decision: "Where is the best marketing gap?", signal: "Rival promotions visual maps + regional welcome offers", output: "Targeted localized acquisition campaigns hooks" },
          { decision: "How can signup checkout leak be stopped?", signal: "Audited form validation friction severities", output: "Quick-win layout registration improvements checklist" }
        ],
        missingInfo: "Out-of-the-box promotions RICHNESS and usability benchmarks without manual database scraping teams.",
        weeklyRhythm: [
          { day: "Mon", title: "Rival Scan", desc: "Audit competitor welcome offers in Jurnii 360." },
          { day: "Tue", title: "Friction Check", desc: "Review signup heuristics scorecard issues." },
          { day: "Wed", title: "Launch Copy", desc: "Deploy ad campaigns copy targeting local market gaps." },
          { day: "Fri", title: "Calibrate", desc: "Verify signup conversions and acquisition CPA." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Founders spend hours browsing competitor sites manually." },
          { marker: "02", desc: "Acquisition campaigns copy identical, high-CPA bidding hooks." },
          { marker: "03", desc: "KYC and signup checkout leaks drop prospective customer traffic." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Jurnii dashboards compile all local competitor promotions." },
          { marker: "02", desc: "Challengers target localized value claim gaps ignored by giants." },
          { marker: "03", desc: "Automated heuristics recommend quick-win signup enhancements." }
        ],
        evidenceTitle: "SMB Lean Intelligence dashboard",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">SMB Out-of-the-Box Console</span>
              <span class="decision-badge" style="background:rgba(87,255,96,0.1); color:#57ff60; border-color:rgba(87,255,96,0.2);">Ready</span>
            </div>
            <p style="font-size:13px; color:rgba(255,255,255,0.7); line-height:1.5; margin:0 0 12px 0;">
              Active Jurisdictional Gaps: Identified 2 open promotional spaces in regional welcome structures.
            </p>
            <span style="font-size:12px; color:var(--jurnii-300); font-weight:700;">Lowered acquisition CPA on programmatic search bids by -15%.</span>
          </div>
        `,
        productStack: ["jurnii-360", "jurnii-ux"],
        commercialOutcomes: [
          { title: "Compete Like Giants", desc: "Use global competitive data to launch campaigns out-positioning massive conglomerates." },
          { title: "Lowered CPA Rates", desc: "Recover leaked player momentum at signup checkouts, maximizing media click value." }
        ],
        finalCTA: "Automate Intelligence for Your Lean Team"
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
        ],
        pressure: "Unify scaling departments, enter new regulated regional sectors with high GGR margin parities, and resolve multi-platform UX drifts.",
        decisions: [
          { decision: "Which region contains the best yields?", signal: "Local competitor bonus play-through levels + CPA rates", output: "Targeted jurisdictional growth blueprint model" },
          { decision: "How can platform migration leakage be stopped?", signal: "Post-launch usability audits vs pre-launch Meta Score", output: "Visual priority correction task checklists" }
        ],
        missingInfo: "Unified, standardized promotions tracking and interface scoring to coordinate marketing and product roadmaps.",
        weeklyRhythm: [
          { day: "Mon", title: "Market Radar", desc: "Scan competitor welcome incentives and copywriting hooks." },
          { day: "Tue", title: "Audit Sync", desc: "Check UX scorecards for portfolio brand discrepancies." },
          { day: "Thu", title: "Prioritize", desc: "Map roadmap sprints to address conversion leaks." },
          { day: "Fri", title: "Model ROAS", desc: "Analyze Cortex causal spent lifts before campaign launches." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Scaling departments operate in siloes, copying competitor moves reactively." },
          { marker: "02", desc: "Brand migrations trigger silent player drop-offs without visual metrics." },
          { marker: "03", desc: "expansion strategies rely on delayed, retrospect consulting databases." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Jurnii centralizes promotions database and experience scorecards." },
          { marker: "02", desc: "Heuristics alerts identify form friction severities dynamically." },
          { marker: "03", desc: "Cortex models campaign causal incrementality before seasonal sweeps." }
        ],
        evidenceTitle: "Mid-Market Scaling workflow board",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Scaling Operations Console</span>
              <span class="decision-badge">Scaling Active</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Ontario Launch conversion:</span>
                <span style="color:#57ff60;">Pre-launch target reached</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Active portfolio Meta Score:</span>
                <span>86% Avg</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Time saved vs manual scans:</span>
                <span style="color:#57ff60; font-weight:700;">30+ hours weekly</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-360", "jurnii-ux", "cortex"],
        commercialOutcomes: [
          { title: "Risk-Free Launches", desc: "Validate brand launches and platform migrations through continuous automated onboarding scorecards." },
          { title: "EBITDA Yield Protection", desc: "Model media campaign causal ROI before scaling budgets across competitive channels." }
        ],
        finalCTA: "Build Your Commercial Response Workflow"
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
        targetPersona: "Enterprise Chief Executive Officers and Boards use Jurnii Meta Scores to manage brand portfolios and defend global EBITDA.",
        capabilities: [
          { title: "Multi-Brand Benchmarking", icon: "layers", desc: "Evaluate, rank, and grade your entire portfolio of brands side-by-side under a unified, commercially weighted metric system." },
          { title: "Regulatory Compliance", icon: "shield-check", desc: "Maintain automated audit trails of competitor promotional terms, active welcome bonuses, and creative copy changes." },
          { title: "Enterprise Data Pipes", icon: "database", desc: "Feed structured, continuous competitor promo and UX data directly into local MMM and analytics warehouses via robust APIs." }
        ],
        pressure: "Eliminate reporting data siloes across global multi-brand conglomerates, streamline regulatory audit compliance trails, and justify capital budget allocations.",
        decisions: [
          { decision: "How is global media mix performing?", signal: "Cortex API integration causal models + multi-channel spends", output: "Boardroom-ready budget incrementality forecasts" },
          { decision: "Are regional brands underperforming?", signal: "Experience scoring index comparisons across all domains", output: "Standardized technical experience directives" }
        ],
        missingInfo: "Automated, global competitor campaign historical databases and normalized, API-delivered multi-brand usability grades.",
        weeklyRhythm: [
          { day: "Mon", title: "API Audit", desc: "Verify automated data warehouse pipes and competitor feeds." },
          { day: "Tue", title: "Portfolio Sync", desc: "Grade experience Meta Scores across all regional portals." },
          { day: "Thu", title: "Cortex Model", desc: "Reconcile multi-million dollar campaign spends against rival surges." },
          { day: "Fri", title: "Board Review", desc: "Deliver standardized multi-brand EBITDA yield scores to directors." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Boards are presented with contradictory, subjective departmental slides." },
          { marker: "02", desc: "multi-brand conglomerates suffer from severe local jurisdiction blind spots." },
          { marker: "03", desc: "CFOs allocate media budgets using models that ignore active competitor welcome sweeps." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "API data pipelines stream normalized promotions directly into corporate datastores." },
          { marker: "02", desc: "CEOs track and grade experience scorecards globally on a single console." },
          { marker: "03", desc: "Cortex causal models validate incrementality on million-dollar media spends." }
        ],
        evidenceTitle: "Enterprise Multi-Market Control Console",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Enterprise Data Warehouse API</span>
              <span class="decision-badge" style="background:rgba(168,85,247,0.1); color:#a855f7; border-color:rgba(168,85,247,0.2);">Connected</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>API Data Streams:</span>
                <span>Active webhook pipes</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Brands Benchmarked:</span>
                <span>9 sister domains</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Cortex Causal Reallocation:</span>
                <span style="color:#57ff60; font-weight:700;">$4.85M Recovered</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-360", "jurnii-ux", "cortex"],
        commercialOutcomes: [
          { title: "Standardized Intelligence", desc: "Coordinate local and central teams around a single-source-of-truth usability database and promotions archive." },
          { title: "attributable Media Yields", desc: "Neutralize spend inefficiencies across search, programmatic displays, and VIP CRM loyalty programs." }
        ],
        finalCTA: "Map Enterprise Market Visibility"
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
        ],
        pressure: "Maximize digital customer acquisitions yield, lower paid traffic CPAs, and stand out in hyper-saturated bidding segments.",
        decisions: [
          { decision: "How can search campaigns ROAS be protected?", signal: "Live competitor welcome richness fluctuations in region", output: "Differentiated copywriting claim adjustments" },
          { decision: "Is programmatic display spending high-yielding?", signal: "Cortex causal lift scores vs competitor promo timelines", output: "Incrementality-calibrated bid reallocations" }
        ],
        missingInfo: "Live visibility of competitor signup bonuses richness and causal spent attribution modeling datasets.",
        weeklyRhythm: [
          { day: "Mon", title: "Copy Audit", desc: "Parse competitor advertising hooks and home overlays." },
          { day: "Tue", title: "Richness check", desc: "Scrape rival wagering requirements in Jurnii 360." },
          { day: "Thu", title: "attributable model", desc: "Run Cortex causal models over weekly campaign clicks." },
          { day: "Fri", title: "Deploy bids", desc: "Approve media spent shifting based on identified messaging voids." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Teams copy-paste generic slogans and keywords blind to rival campaigns." },
          { marker: "02", desc: "programmatic budgets are allocated using uncausal last-click spreadsheets." },
          { marker: "03", desc: "Search CPA rates spike when competitor welcome generosity increases." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Jurnii scans competitor active overlay copy and signup wagers." },
          { marker: "02", desc: "Cortex causal engines isolate incrementality against competitor actions." },
          { marker: "03", desc: "Media spent is re-allocated to high-yield channels, lowering CAC." }
        ],
        evidenceTitle: "Marketing campaign operating board",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Marketing Campaign Console</span>
              <span class="decision-badge">Optimized</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Causal ROAS Lift:</span>
                <span style="color:#57ff60;">+46% ROI</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Competitor messaging voids detected:</span>
                <span style="color:#57ff60;">3 open hooks</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>CAC Reduction:</span>
                <span style="color:#57ff60; font-weight:700;">-18% CPA</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-360", "cortex"],
        commercialOutcomes: [
          { title: "differentiated Bidding", desc: "Lower overall acquisition costs by shifting campaigns display copy toward untapped positioning slots." },
          { title: "attributable spend safety", desc: "Prove marketing contribution to Net Gaming hold rates with scientifically audited causal models." }
        ],
        finalCTA: "prioritize your marketing campaigns spends"
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
        targetPersona: "Commercial Analysts and CRM Directors deploy Jurnii margin calibrators to deploy high-yield loyalty rewards.",
        capabilities: [
          { title: "Promo Richness Index", icon: "bar-chart-3", desc: "Standardize the mathematical cost and yield margin impact of competitor deposit matches and retention bonuses." },
          { title: "Churn Analytics", icon: "user-minus", desc: "Trace rival product changes and promotions causing high player leakage and multi-homing defection." },
          { title: "Revenue Auditing", icon: "activity", desc: "Identify conversion leaks and audits in affiliate reward structures, deposit funnels, and registration pathways." }
        ],
        pressure: "Maintain optimal NGR/GGR holds, safeguard commercial margins against copycat bonus wagers, and retain high-value customer portfolios.",
        decisions: [
          { decision: "Are loyalty rewards diluting holds?", signal: "Wagering rollovers matches vs competitor CRM pricing", output: "Promo Richness index calibrated margin limits" },
          { decision: "Where is Net Gaming Revenue leaking?", signal: "Onboarding drop-off severities + deposit portal delays", output: "Targeted signup conversion path updates checklist" }
        ],
        missingInfo: "Automated, regional promotions surveillance databases and standardized wagers wagers decoders.",
        weeklyRhythm: [
          { day: "Mon", title: "Promo check", desc: "Audit rival welcome matches and playthrough multiples in Jurnii 360." },
          { day: "Tue", title: "Margin Sync", desc: "Model sports and casino payout curves against regional holds." },
          { day: "Thu", title: "Triggers check", desc: "Verify VIP cohort defection risks under rival surges." },
          { day: "Fri", title: "CRM Calibrate", desc: "Distribute margin-safe loyalty bonuses contextually." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Analysts spend hours manual scraping competitor wagers documents." },
          { marker: "02", desc: "CRM desks copy rival bonus richness reactively, diluting hold rate yields." },
          { marker: "03", desc: "High-value VIP cohorts defect contextually during rival sports boosts sweeps." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Jurnii scrapers log 100% of regional competitor promotion terms." },
          { marker: "02", desc: "Promo Richness indices calibrate wagers to maximize EBITDA hold." },
          { marker: "03", desc: "Automated triggers alert retention player desks proactively." }
        ],
        evidenceTitle: "Commercial promotions calibration board",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Promotions Calibration Model</span>
              <span class="decision-badge" style="background:rgba(87,255,96,0.1); color:#57ff60; border-color:rgba(87,255,96,0.2);">Calibrated</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Active regional wagers target:</span>
                <span style="font-family:var(--font-mono);">25x play-through match</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>EBITDA Hold Projection:</span>
                <span style="color:#57ff60;">Grade A+ Hold</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Trading analyst time saved:</span>
                <span style="color:#57ff60; font-weight:700;">30+ hours weekly</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-360", "cortex"],
        commercialOutcomes: [
          { title: "protected Hold Rates", desc: "Optimize promotions and wagers thresholds mathematically, safeguarding Net Gaming wagers." },
          { title: "Contextual CRM retention", desc: "Trace rival retention moves to neutralize VIP customer churn before player defection." }
        ],
        finalCTA: "Build Your Commercial Response Workflow"
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
        ],
        pressure: "Accelerate onboarding conversion rates, eliminate form layouts redundancies, and protect engineering capacity from low-impact bugs.",
        decisions: [
          { decision: "Which product tweaks should enter developer backlog?", signal: "Heuristic score gaps + quantified GGR conversion impact", output: "Ranked roadmap sprint priorities checklist" },
          { decision: "Where does user registration pipeline leak?", signal: "form field cognitive loads + document verification obstacles", output: "Optimized single-page registration interface wireframe" }
        ],
        missingInfo: "standardized user experience scores side-by-side with industry best practices across target markets.",
        weeklyRhythm: [
          { day: "Mon", title: "UX Audit", desc: "Run automated usability audits over all portfolio portals." },
          { day: "Tue", title: "Rival Scan", desc: "Benchmark stylesheet grids and typographic reading levels." },
          { day: "Thu", title: "Rank sprint", desc: "Order product backlogs according to conversion leakage impact." },
          { day: "Fri", title: "Deploy UI", desc: "Deliver optimized visual overlays templates to developers." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Product managers coordinate roadmaps based on subjective design debates." },
          { marker: "02", desc: "Design teams wait weeks for retro heuristic agency consultant slides." },
          { marker: "03", desc: "Heavy styling stylesheets payload checks leak mobile checkouts momentum." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Jurnii UX indices score layout usability under unified standards." },
          { marker: "02", desc: "Heuristics scorecards yield prioritized sprint checklists instantly." },
          { marker: "03", desc: "LCP speeds checks catch technical payload latency before dropoffs." }
        ],
        evidenceTitle: "Product department prioritized operating board",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Product Sprint Operating board</span>
              <span class="decision-badge">Ranked Backlog</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:12px;">
              <div style="display:flex; justify-content:space-between; padding:8px; background:rgba(255,95,86,0.1); border-left:3px solid #ff5f56; border-radius:4px;">
                <span>01. KYC validation error prompts</span>
                <span style="color:#ff5f56; font-weight:700;">Critical Leak</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding:8px; background:rgba(255,189,46,0.1); border-left:3px solid #ffbd2e; border-radius:4px;">
                <span>02. Deposit button visual spacing</span>
                <span style="color:#ffbd2e; font-weight:700;">High Impact</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-ux", "jurnii-360"],
        commercialOutcomes: [
          { title: "Roadmap Prioritization", desc: "Align developers sprint tickets with validated player conversion and NGR recovery potential." },
          { title: "Healed Funnel Leaks", desc: "Eliminate conversion-killing KYC verification blocks, boosting player acquisition speed." }
        ],
        finalCTA: "Prioritise your product roadmap"
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
        ],
        pressure: "Defend NGR margins, lower skyrocketing CAC rates under highly regulated compliance, and combat massive player multi-homing rates.",
        decisions: [
          { decision: "How can player signup defection be neutralized?", signal: "KYC validation checks vs competitor wagers limits", output: "Margin-optimized welcome offer structure" },
          { decision: "Is rival sports boost eroding our GGR?", signal: "Live rival odds surges in monitored states", output: "Contextual alert pushes to CRM desks" }
        ],
        missingInfo: "standardized competitor welcome richness indices and live wagers playthrough multipliers scraping.",
        weeklyRhythm: [
          { day: "Mon", title: "Wagers Sweep", desc: "Review rival sports boosts and wagering play-throughs." },
          { day: "Tue", title: "KYC check", desc: "Analyze signup wagers and identity verification flows." },
          { day: "Thu", title: "Cortex Sync", desc: "Model causal ROI impacts before weekend sport surges." },
          { day: "Fri", title: "CRM Calibrate", desc: "Deploy defensive CRM bonuses to protect player cohorts." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Trading desks duplicate rival wagers rollovers blindly." },
          { marker: "02", desc: "High-value VIP cohorts defect to competitor sports boosts sweeps." },
          { marker: "03", desc: "Registration wagers are compiled by manual scraping spreadsheets." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Promo Richness indices calibrate wagers to safeguard holds." },
          { marker: "02", desc: "surveillance webhooks push live notifications of competitor VIP wagers." },
          { marker: "03", desc: "Cortex causal models evaluate programmatic incrementality." }
        ],
        evidenceTitle: "iGaming regulated market intelligence console",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">Jurnii iGaming Console</span>
              <span class="decision-badge" style="background:rgba(87,255,96,0.1); color:#57ff60; border-color:rgba(87,255,96,0.2);">Surveillance</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>regulations:</span>
                <span>Ontario / UK / US states</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Rival welcome richness avg:</span>
                <span>68 wagers index</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Margin hold safety:</span>
                <span style="color:#57ff60; font-weight:700;">Grade A+ protected</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-360", "jurnii-ux", "cortex"],
        commercialOutcomes: [
          { title: "protected EBITDA Holds", desc: "Calibrate regional wagers play-throughs based on active promotions parities, defending Net Gaming wagers." },
          { title: "Healed verification Drops", desc: "Eliminate conversion roadblocks during high-security KYC checks, lower acquisition CAC." }
        ],
        finalCTA: "Benchmark your iGaming market position"
      },
      {
        id: "ecommerce",
        name: "eCommerce",
        fullName: "eCommerce Brands",
        slug: "use-cases/sectors/ecommerce.html",
        kicker: "Conversion Scaling",
        lede: "Maximize checkout conversions, audit transactional friction, and outpace competitor promotion strategies.",
        manifesto: "High-volume digital brands utilize Jurnii to map customer purchase journeys, identify cart abandonment causes, and benchmark promotional campaign effectiveness. By translating visual layout errors and cognitive fatigue into ranked heuristic recommendations, Jurnii ensures eCommerce operators maximize transaction yields and customer lifetime value.",
        challenge: "eCommerce platforms suffer from severe cart abandonment at checkouts and payment gateway selections. Traditional analytics show *where* shoppers drop off, but fail to explain the visual layout errors, confusing input validation messages, or pricing friction causing cognitive fatigue. Teams spend days debating design updates without objective data, while competitors adjust pricing and promotional codes dynamically.",
        mechanics: "Jurnii maps checkout grids, button placement, and copywriting clarity, benchmarking transaction states against leading high-converting digital portals. Jurnii UX audits security signals, payment gateways, and input validation to deliver commercially weighted recommendations that streamline checkout flows and increase purchase yields.",
        proofText: "Repairing transaction journey friction dramatically increases customer conversion rate and purchase yields.",
        targetPersona: "Heads of eCommerce and Digital Merchandising utilize journey mapping to streamline multi-step checkouts and increase LTV.",
        capabilities: [
          { title: "Checkout Optimization", icon: "shopping-cart", desc: "Pinpoint interaction and UI friction causing cart abandonment in high-value purchase and checkout flows." },
          { title: "Price Benchmarking", icon: "tag", desc: "Track competitor pricing, coupon codes, and loyalty perks in real-time across 35 markets monitored simultaneously." },
          { title: "User Flow Mapping", icon: "map", desc: "Model cart additions, payment gateway selections, and multi-step checkouts objectively." }
        ],
        pressure: "Minimize checkout cart abandonment rates, outpace dynamic rival discount coupons, and maximize average order transaction values.",
        decisions: [
          { decision: "Where does checkout cart drop off?", signal: "Payment gateway styling checkboxes + input validation errors", output: "Streamlined single-page checkout grid wireframe" },
          { decision: "Are coupon codes driving incrementality?", signal: "programmatic coupon payouts vs seasonal campaign investments", output: "Causal coupon spend allocation recommendations" }
        ],
        missingInfo: "Objective usability checklist mapping checkout styling barriers to purchase yields.",
        weeklyRhythm: [
          { day: "Mon", title: "checkout Audit", desc: "Audit cart addition and payment gateway layouts." },
          { day: "Tue", title: "Price Bench", desc: "Track competitor pricing and dynamic coupon codes." },
          { day: "Thu", title: "Rank back", desc: "Order developmental checklist by cart recovery yields." },
          { day: "Fri", title: "Ship UI", desc: "Deploy streamlined checkout grids to optimize checkouts." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "Digital teams discuss checkout styling elements without conversion metrics." },
          { marker: "02", desc: "Customers abandon transactions due to heavy validation forms." },
          { marker: "03", desc: "heavy stylesheets delay payment gateways loading, leaking revenue." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Jurnii scorecards establish unified usability checks across checkouts." },
          { marker: "02", desc: "Prioritized recommendations checklists identify cart barriers instantly." },
          { marker: "03", desc: "onboarding transition scoring catches mobile latency before abandonment." }
        ],
        evidenceTitle: "eCommerce checkout purchase yield dashboard",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">eCommerce Yield Console</span>
              <span class="decision-badge" style="background:rgba(0,122,255,0.1); color:#007aff; border-color:rgba(0,122,255,0.2);">Audited</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Cart Completion Rate:</span>
                <span style="color:#57ff60;">74% (+14% lift)</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>active layout barriers fixed:</span>
                <span>2 payment fields resolved</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Average order yield:</span>
                <span style="color:#57ff60; font-weight:700;">Grade A checkout</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-ux", "jurnii-360"],
        commercialOutcomes: [
          { title: "Healed Checkout Leaks", desc: "Minimize cart abandonment rates by optimizing validation error guidance and button positions." },
          { title: "Dynamic Promo Strategy", desc: "Track competitor discount campaigns in real-time, defending product profit margins." }
        ],
        finalCTA: "Benchmark your eCommerce purchase Conversions"
      },
      {
        id: "fintech",
        name: "FinTech",
        fullName: "FinTech & Finance",
        slug: "use-cases/sectors/fintech.html",
        kicker: "Financial Platforms",
        lede: "Streamline onboarding verification pipelines, minimize registration drop-offs, and build platform trust.",
        manifesto: "FinTech platforms deploy Jurnii to secure high-security customer registration, audit KYC and AML processing delays, and design conversion-optimized banking interfaces. By optimizing trust elements and mobile load speeds, Jurnii prevents registration funnel leakage and stabilizes acquisition costs.",
        challenge: "FinTech applications face extreme signup drop-offs during high-security AML, KYC, and document verification steps. Users lose trust when secure interfaces look generic, outdated, or confusing. Standard analytics tools cannot measure how layout security signals and compliance branding affect user confidence, leading to high abandonment rates and lost acquisition spends.",
        mechanics: "Jurnii audits security styling, compliance signals, and input validation messages across FinTech registration funnels. By comparing onboarding flows with industry best practices and 300+ analysed brands, Jurnii UX delivers commercially weighted improvements to ensure onboarding paths project maximum credibility, compliance, and safety.",
        proofText: "Optimizing trust elements and mobile load speeds prevents registration funnel leakage and stabilizes acquisition costs.",
        targetPersona: "VP of Risk and Product Leads at FinTech platforms deploy Jurnii perception scores to secure compliance conversions.",
        capabilities: [
          { title: "Onboarding Friction Audits", icon: "user-check", desc: "Optimize and accelerate high-security AML, KYC, and document upload pipelines." },
          { title: "Trust Elements Evaluation", icon: "lock", desc: "Measure visual security indicators, compliance badges, and customer trust perception levels." },
          { title: "Mobile Performance Scoring", icon: "smartphone", desc: "Ensure instant financial application loading and response speeds across mobile networks." }
        ],
        pressure: "Secure customer trust during AML checks, minimize document upload dropout rates, and satisfy strict compliance requirements.",
        decisions: [
          { decision: "Is secure KYC flow causing dropouts?", signal: "KYC document gate friction vs competitor verification speeds", output: "Compliance-optimized signup interface wireframe" },
          { decision: "Do styling safety signals affect trust?", signal: "Compliance badge visibilities + secure SSL alignments", output: "Trust-optimized visual onboarding framework" }
        ],
        missingInfo: "Standardized visual safety scores mapping secure layout elements to signup conversion parities.",
        weeklyRhythm: [
          { day: "Mon", title: "KYC Audit", desc: "Audit high-security document verification screens." },
          { day: "Tue", title: "Rival Scan", desc: "Compare compliance overlays and trust signals with peers." },
          { day: "Thu", title: "Prioritize", desc: "Rank developmental tickets based on document upload drops." },
          { day: "Fri", title: "Deploy UI", desc: "Launch trust-optimized registration elements to production." }
        ],
        beforeWorkflow: [
          { marker: "01", desc: "FinTech secure forms look generic, causing users to lose trust." },
          { marker: "02", desc: "onboarding KYC checkpoints leak acquired users due to input friction." },
          { marker: "03", desc: "mobile verification steps lag under low-bandwidth networks." }
        ],
        afterWorkflow: [
          { marker: "01", desc: "Jurnii UX indices score layout trust signals under objective metrics." },
          { marker: "02", desc: "Heuristics scorecards pinpoint input validation barriers instantly." },
          { marker: "03", desc: "onboarding transitions remain optimized for secure mobile devices." }
        ],
        evidenceTitle: "FinTech secure onboarding compliance panel",
        evidenceHTML: `
          <div class="usecase-executive-dashboard" data-theme="dark">
            <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-family:var(--font-mono); font-size:12px; color:var(--jurnii-400);">FinTech Trust Console</span>
              <span class="decision-badge" style="background:rgba(87,255,96,0.1); color:#57ff60; border-color:rgba(87,255,96,0.2);">Secure</span>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.5;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Onboarding trust score:</span>
                <span style="color:#57ff60;">92% (Grade A trust)</span>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>AML verification speed:</span>
                <span>Instant upload optimized</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Customer acquisition CAC:</span>
                <span style="color:#57ff60; font-weight:700;">-14% CAC reduction</span>
              </div>
            </div>
          </div>
        `,
        productStack: ["jurnii-ux"],
        commercialOutcomes: [
          { title: "protected customer Trust", desc: "Project absolute credibility during high-security verification checks, maximizing signup completions." },
          { title: "Lowered acquisition CAC", desc: "Reduce document upload dropouts, protecting programmatic spend from conversion leaks." }
        ],
        finalCTA: "Benchmark your FinTech signup Conversions"
      }
    ]
  }
};

// Rich, category-specific premium layout template generator for Use Cases
function getPageHTML(metaTitle, metaDesc, kicker, title, lede, manifesto, capabilities, relatedLinks, levelPrefix, challenge, mechanics, proofText, targetPersona, slug, item) {
  
  // 1. Determine Product Affiliations and Badges
  let productBadgeHTML = '';
  let parentProductUrl = `${levelPrefix}products/jurnii-360.html`;
  if (item.productStack.includes('jurnii-ux') && item.productStack.includes('cortex')) {
    productBadgeHTML = `
      <a href="${levelPrefix}products/jurnii-ux.html" class="product-badge" data-product="jurnii-ux" style="text-decoration:none;">Jurnii UX</a>
      <a href="${levelPrefix}products/cortex.html" class="product-badge" data-product="cortex" style="text-decoration:none; margin-left:8px;">Cortex</a>
    `;
    parentProductUrl = `${levelPrefix}products/jurnii-ux.html`;
  } else if (item.productStack.includes('cortex')) {
    productBadgeHTML = `<a href="${levelPrefix}products/cortex.html" class="product-badge" data-product="cortex" style="text-decoration:none;">Powered by Cortex</a>`;
    parentProductUrl = `${levelPrefix}products/cortex.html`;
  } else if (item.productStack.includes('jurnii-ux')) {
    productBadgeHTML = `<a href="${levelPrefix}products/jurnii-ux.html" class="product-badge" data-product="jurnii-ux" style="text-decoration:none;">Part of Jurnii UX</a>`;
    parentProductUrl = `${levelPrefix}products/jurnii-ux.html`;
  } else {
    productBadgeHTML = `<a href="${levelPrefix}products/jurnii-360.html" class="product-badge" data-product="jurnii-300" style="text-decoration:none;">Powered by Jurnii 360</a>`;
  }

  // 2. Resolve Category CTA and labels
  const primaryCTAUrl = `mailto:demo@jurnii.io?subject=Request%20Demo%20-%20${encodeURIComponent(item.fullName)}`;
  
  // 3. Resolve Metrics Strip
  let metricStripHTML = '';
  if (item.productStack.includes('cortex')) {
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
        <span class="metric-strip-label">ROI on Platform Investment</span>
      </div>
    `;
  } else if (item.productStack.includes('jurnii-ux')) {
    metricStripHTML = `
      <div class="metric-strip-item">
        <span class="metric-strip-num">300+</span>
        <span class="metric-strip-label">Brands Analysed globally</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">70+</span>
        <span class="metric-strip-label">Recommendations per Audit</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">4</span>
        <span class="metric-strip-label">Key UX Dimensions Scanned</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">Mins</span>
        <span class="metric-strip-label">Continuous Audit Execution</span>
      </div>
    `;
  } else {
    metricStripHTML = `
      <div class="metric-strip-item">
        <span class="metric-strip-num">1,000+</span>
        <span class="metric-strip-label">Offers Scanned Weekly</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">35</span>
        <span class="metric-strip-label">Regulated Jurisdictions Monitored</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">21</span>
        <span class="metric-strip-label">Surveillance Areas Scanned</span>
      </div>
      <div class="metric-strip-item">
        <span class="metric-strip-num">30+</span>
        <span class="metric-strip-label">Hours Saved Weekly vs Manual</span>
      </div>
    `;
  }

  // 4. Resolve Product Stack HTML
  let productStackHTML = '';
  item.productStack.forEach(p => {
    if (p === 'cortex') {
      productStackHTML += `
        <div class="usecase-stack-card">
          <span style="color:var(--jurnii-600); font-family:var(--font-mono); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:8px;">Attribution Stack</span>
          <h3>Cortex</h3>
          <p>Causal Media Mix Modeling (MMM) attribution and scenario planning simulation dashboards to reallocate spent with evidence.</p>
          <a href="${levelPrefix}products/cortex.html" class="btn secondary">Explore Cortex &rarr;</a>
        </div>
      `;
    } else if (p === 'jurnii-ux') {
      productStackHTML += `
        <div class="usecase-stack-card">
          <span style="color:var(--jurnii-600); font-family:var(--font-mono); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:8px;">Experience Stack</span>
          <h3>Jurnii UX</h3>
          <p>Continuous server-side heuristic auditing scorecards and Core Web Vitals speed diagnostics mapped directly to NGR restoration.</p>
          <a href="${levelPrefix}products/jurnii-ux.html" class="btn secondary">Explore Jurnii UX &rarr;</a>
        </div>
      `;
    } else if (p === 'jurnii-360') {
      productStackHTML += `
        <div class="usecase-stack-card">
          <span style="color:var(--jurnii-600); font-family:var(--font-mono); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:8px;">Surveillance Stack</span>
          <h3>Jurnii 360</h3>
          <p>Continuous real-time competitive intelligence scraping welcome offers and wagers matches to protect wagers margins.</p>
          <a href="${levelPrefix}products/jurnii-360.html" class="btn secondary">Explore Jurnii 360 &rarr;</a>
        </div>
      `;
    }
  });

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
<body class="usecase-page">

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
    <!-- Audience-Specific Hero -->
    <section class="usecase-hero-premium">
      <div class="container">
        <div class="usecase-hero-copy">
          ${productBadgeHTML}
          <p style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; margin: 16px 0 12px 0;">Use Case &mdash; ${kicker}</p>
          <h1 style="font-size: clamp(32px, 4vw, 48px); font-weight: 800; letter-spacing: -0.03em; margin: 0 0 20px 0; color: var(--foreground); line-height: 1.1;">
            For ${title}
          </h1>
          <p class="page-hero-lede" style="font-size: 18px; color: var(--muted-foreground); line-height: 1.6; max-width: 680px; margin: 0 0 32px 0;">
            ${lede}
          </p>
          <div class="cta-row" style="display: flex; gap: 16px;">
            <a href="${primaryCTAUrl}" class="btn primary">${item.finalCTA}</a>
            <a href="${parentProductUrl}" class="btn secondary">Explore Product Stack</a>
          </div>
        </div>
        
        <!-- Hero Mockup Panel -->
        <div class="usecase-hero-visual">
          ${item.evidenceHTML}
        </div>
      </div>
    </section>

    <!-- Metrics Strip -->
    <div class="metric-strip-wrapper" style="border-bottom: 1px solid var(--border);">
      <div class="container">
        <div class="metric-strip-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; padding: 32px 0;">
          ${metricStripHTML}
        </div>
      </div>
    </div>

    <!-- Manifesto / Operating Context Narrative -->
    <section style="padding: 80px 0; border-bottom: 1px solid var(--border); background: var(--card); text-align: center;">
      <div class="container" style="max-width: 960px;">
        <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 16px;">Audience Operating Context</span>
        <p style="font-size: clamp(18px, 2.2vw, 22px); font-weight: 500; line-height: 1.7; color: var(--foreground); margin: 0; font-family: var(--font-sans); letter-spacing: -0.01em;">
          ${manifesto}
        </p>
      </div>
    </section>

    <!-- Role Context / Pressure Section -->
    <section class="usecase-context-pressure">
      <div class="container" style="max-width: 1100px;">
        <div class="usecase-pressure-grid">
          <div>
            <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Audience Pressure Vectors</span>
            <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 20px 0; color: var(--foreground); line-height: 1.2;">The Pressure Under Audit</h2>
            <p style="font-size: 15.5px; color: var(--muted-foreground); line-height: 1.6; margin-bottom: 24px;">
              ${challenge}
            </p>
            <div class="pressure-callout">
              <h4>Direct Operational Pressures</h4>
              <p>${item.pressure}</p>
            </div>
            <div class="pressure-callout" style="background:rgba(168,85,247,0.02); border-left-color:#a855f7;">
              <h4 style="color:#a855f7;">Information Barrier</h4>
              <p><strong>Currently delayed or missing data:</strong> ${item.missingInfo}</p>
            </div>
          </div>
          
          <div style="background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.015);">
            <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(148,255,150,0.12); color: var(--jurnii-700); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <i data-lucide="shield-check" style="width: 20px; height: 20px;"></i>
            </div>
            <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">How Jurnii Restores Alignment</h3>
            <p style="font-size: 14.5px; color: var(--muted-foreground); line-height: 1.55; margin: 0 0 24px 0;">
              ${mechanics}
            </p>
            <div class="implication-callout" style="background:rgba(255,95,86,0.04); border-left:3px solid #ff5f56; padding: 16px; border-radius: 4px;">
              <span style="font-weight:700; color:#ff5f56; display:block; font-size:13px; margin-bottom:6px;">EBITDA Yield Implication</span>
              <p style="font-size: 13.5px; color: var(--muted-foreground); line-height: 1.45; margin:0;">
                Opinion-driven roadmaps and copycat promotions pricing dilutes Net Gaming wagers hold rates by up to <b>35%</b> globally.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Before vs After Workflow Panel -->
    <section class="usecase-before-after">
      <div class="container" style="max-width: 1100px;">
        <div style="text-align: center; margin-bottom: 48px;">
          <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Operational Rhythm Comparison</span>
          <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0;">Restructuring Broken Team Workflows</h2>
        </div>
        
        <div class="before-after-grid">
          <!-- Before Card -->
          <div class="before-card">
            <h3>Before Jurnii Usability & Radar</h3>
            <div style="display:flex; flex-direction:column; gap:20px;">
              ${item.beforeWorkflow.map(step => `
                <div class="before-after-step">
                  <span class="step-marker">${step.marker}</span>
                  <div class="step-desc">${step.desc}</div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- After Card -->
          <div class="after-card">
            <h3>After Jurnii automated surveillance</h3>
            <div style="display:flex; flex-direction:column; gap:20px;">
              ${item.afterWorkflow.map(step => `
                <div class="before-after-step">
                  <span class="step-marker">${step.marker}</span>
                  <div class="step-desc">${step.desc}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Strategic Decision Map -->
    <section class="usecase-decision-map">
      <div class="container" style="max-width: 1100px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Decision Grid</span>
          <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0;">Strategic Decision Map</h2>
        </div>
        
        <table class="decision-map-table">
          <thead>
            <tr>
              <th style="width: 30%;">Critical Decision</th>
              <th style="width: 35%;">Information Signal Needed</th>
              <th style="width: 35%;">Jurnii Operational Yield Output</th>
            </tr>
          </thead>
          <tbody>
            ${item.decisions.map(d => `
              <tr>
                <td><strong>${d.decision}</strong></td>
                <td><span class="decision-badge">${d.signal}</span></td>
                <td>${d.output}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Weekly Rhythm Timeline -->
    <section class="usecase-operating-workflow">
      <div class="container" style="max-width: 1100px;">
        <div style="text-align: center; margin-bottom: 48px;">
          <span style="color: var(--jurnii-400); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Weekly Timelines</span>
          <h2 style="font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin: 0;">Weekly Commercial Rhythm</h2>
        </div>
        
        <div class="weekly-rhythm-timeline">
          ${item.weeklyRhythm.map(day => `
            <div class="rhythm-card">
              <span class="rhythm-day">${day.day}</span>
              <h3>${day.title}</h3>
              <p>${day.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Jurnii Stack Section -->
    <section class="usecase-stack-section">
      <div class="container" style="max-width: 1100px;">
        <div style="text-align: center; margin-bottom: 48px;">
          <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Product Integrations</span>
          <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0;">Relevant Jurnii Stack</h2>
        </div>
        
        <div class="usecase-stack-grid">
          ${productStackHTML}
        </div>
      </div>
    </section>

    <!-- Commercial Outcomes -->
    <section class="usecase-evidence-section">
      <div class="container" style="max-width: 1100px;">
        <div style="text-align: center; margin-bottom: 48px;">
          <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Target Outcomes</span>
          <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0;">Commercial Outcomes That Matter</h2>
        </div>
        
        <div class="usecase-outcome-grid">
          ${item.commercialOutcomes.map(out => `
            <div class="usecase-outcome-card">
              <div style="width:40px; height:40px; border-radius:8px; background:rgba(148,255,150,0.1); color:var(--jurnii-700); display:flex; align-items:center; justify-content:center; margin-bottom:20px;">
                <i data-lucide="award" style="width:20px; height:20px;"></i>
              </div>
              <h3>${out.title}</h3>
              <p>${out.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Sibling Use Cases Platform Links -->
    <section class="usecase-related-section">
      <div class="container" style="max-width: 1100px;">
        <div style="margin-bottom: 48px;">
          <span style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Platform Connections</span>
          <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 12px 0;">Adjacent Use-Cases</h2>
          <p style="font-size: 16px; color: var(--muted-foreground); margin: 0;">Explore how Jurnii coordinates across adjacent segments.</p>
        </div>
        
        <div class="usecase-related-grid">
          ${relatedLinks.map(l => `
            <a href="${levelPrefix}${l.slug}" class="usecase-related-card">
              <span style="font-family:var(--font-mono); font-size:10px; color:var(--jurnii-600); text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:8px;">Adjacent Profile</span>
              <h4>For ${l.name}</h4>
              <p>${l.sub}</p>
            </a>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="usecase-final-cta">
      <div class="usecase-final-cta-card">
        <h2>Change Your Operating Rhythm Today</h2>
        <p>Stop running commercial programs blind to rival promotions and product friction. Schedule an live demonstration tailored exactly to your department goals.</p>
        <div class="cta-row" style="display: flex; gap: 16px; justify-content: center;">
          <a href="${primaryCTAUrl}" class="btn primary">${item.finalCTA}</a>
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

// Group Hub landing page HTML elevated to premium visual directories
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
<body class="usecase-page">

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
    <!-- Category Hero -->
    <section class="usecase-hero-premium" style="padding: 100px 0 60px;">
      <div class="container" style="max-width: 1100px; display:block; text-align:center;">
        <p style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;">${kicker}</p>
        <h1 style="font-size: clamp(36px, 4.5vw, 54px); font-weight: 800; letter-spacing: -0.03em; margin: 16px 0 24px;">Use Cases & Segment: ${title}</h1>
        <p style="font-size: 19px; color: var(--muted-foreground); max-width: 720px; line-height: 1.6; margin: 0 auto 36px;">
          ${lede}
        </p>
        <p style="font-size:14.5px; color:var(--jurnii-600); font-weight:600; margin:0;">Choose your operating context below to explore tailored parities.</p>
      </div>
    </section>

    <!-- Group Hub Grid -->
    <section style="padding: 60px 0 100px; background:var(--card); border-top:1px solid var(--border); border-bottom:1px solid var(--border);">
      <div class="container" style="max-width: 1100px;">
        <div class="resources-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;">
          ${items.map(item => `
          <a href="${item.slug.substring('use-cases/'.length)}" class="resource-card" style="text-decoration: none; color: inherit; display: flex; flex-direction:column; border: 1px solid var(--border); border-radius: 16px; padding: 40px; background: var(--background); transition: border-color 0.2s ease;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(148,255,150,0.12); color: var(--jurnii-700); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <i data-lucide="${item.capabilities[0].icon || 'circle'}" style="width: 22px; height: 22px;"></i>
            </div>
            <h3 style="font-size: 20px; font-weight: 800; margin: 0 0 12px 0;">For ${item.name}</h3>
            <p style="font-size: 14.5px; color: var(--muted-foreground); line-height: 1.55; margin: 0 0 28px 0; flex-grow:1;">${item.lede}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 700; color: var(--jurnii-600); border-top:1px solid var(--border); padding-top:16px; margin-top:auto;">
              <span>Explore Operating View</span>
              <i data-lucide="arrow-right" style="width:16px; height:16px;"></i>
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
<body class="usecase-page">

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
    <section class="usecase-hero-premium" style="padding: 100px 0 60px; text-align:center;">
      <div class="container" style="max-width: 1100px; display:block;">
        <p style="color: var(--jurnii-600); font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;">Structure</p>
        <h1 style="font-size: clamp(36px, 4.5vw, 54px); font-weight: 800; letter-spacing: -0.03em; margin: 16px 0 24px;">Use Cases & Operating Rhythm</h1>
        <p style="font-size: 19px; color: var(--muted-foreground); max-width: 720px; line-height: 1.6; margin: 0 auto 36px;">
          Jurnii delivers modular digital intelligence tailored around executive roles, operating sizes, functional departments, and industry verticals.
        </p>
      </div>
    </section>

    <!-- Use Cases Directory Master Grid -->
    <section style="padding: 60px 0 100px; background:var(--card); border-top:1px solid var(--border); border-bottom:1px solid var(--border);">
      <div class="container" style="max-width: 1100px;">
        <div class="resources-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
          
          <!-- Column 1: Roles -->
          <div style="background: var(--background); border: 1px solid var(--border); border-radius: 16px; padding: 32px; display: flex; flex-direction: column;">
            <a href="roles.html" style="text-decoration: none; display: block; margin-bottom: 20px;">
              <h3 style="font-size: 18px; font-weight: 800; color: var(--foreground); text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 8px; border-bottom: 1px dotted var(--border); margin:0;">Roles</h3>
            </a>
            <p style="font-size: 13.5px; color: var(--muted-foreground); line-height: 1.5; margin: 0 0 24px 0; flex-grow:1;">Executive decisions and spend alignment.</p>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top:auto;">
              <a href="roles/cmo.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="megaphone" style="width:14px;height:14px;"></i> CMO</a>
              <a href="roles/cco.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="coins" style="width:14px;height:14px;"></i> CCO</a>
              <a href="roles/coo.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="briefcase" style="width:14px;height:14px;"></i> COO</a>
              <a href="roles/cpo.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="layout" style="width:14px;height:14px;"></i> CPO</a>
              <a href="roles/cfo.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="bar-chart-2" style="width:14px;height:14px;"></i> CFO</a>
              <a href="roles/ceo.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="shield" style="width:14px;height:14px;"></i> CEO</a>
            </div>
          </div>

          <!-- Column 2: Company Size -->
          <div style="background: var(--background); border: 1px solid var(--border); border-radius: 16px; padding: 32px; display: flex; flex-direction: column;">
            <a href="company-sizes.html" style="text-decoration: none; display: block; margin-bottom: 20px;">
              <h3 style="font-size: 18px; font-weight: 800; color: var(--foreground); text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 8px; border-bottom: 1px dotted var(--border); margin:0;">Company Size</h3>
            </a>
            <p style="font-size: 13.5px; color: var(--muted-foreground); line-height: 1.5; margin: 0 0 24px 0; flex-grow:1;">Operating maturities from Challenger operators to Conglomerates.</p>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top:auto;">
              <a href="company-sizes/smb.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="store" style="width:14px;height:14px;"></i> SMB Operators</a>
              <a href="company-sizes/midmarket.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="building" style="width:14px;height:14px;"></i> MidMarket Scaling</a>
              <a href="company-sizes/enterprise.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="building-2" style="width:14px;height:14px;"></i> Enterprise Multi-Brand</a>
            </div>
          </div>

          <!-- Column 3: Departments -->
          <div style="background: var(--background); border: 1px solid var(--border); border-radius: 16px; padding: 32px; display: flex; flex-direction: column;">
            <a href="departments.html" style="text-decoration: none; display: block; margin-bottom: 20px;">
              <h3 style="font-size: 18px; font-weight: 800; color: var(--foreground); text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 8px; border-bottom: 1px dotted var(--border); margin:0;">Departments</h3>
            </a>
            <p style="font-size: 13.5px; color: var(--muted-foreground); line-height: 1.5; margin: 0 0 24px 0; flex-grow:1;">Cross-functional pipeline synchronization.</p>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top:auto;">
              <a href="departments/marketing.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="users" style="width:14px;height:14px;"></i> Marketing Team</a>
              <a href="departments/commercial.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="trending-up" style="width:14px;height:14px;"></i> Commercial Desk</a>
              <a href="departments/product.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="layout" style="width:14px;height:14px;"></i> Product Sprint</a>
            </div>
          </div>

          <!-- Column 4: Sectors -->
          <div style="background: var(--background); border: 1px solid var(--border); border-radius: 16px; padding: 32px; display: flex; flex-direction: column;">
            <a href="sectors.html" style="text-decoration: none; display: block; margin-bottom: 20px;">
              <h3 style="font-size: 18px; font-weight: 800; color: var(--foreground); text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 8px; border-bottom: 1px dotted var(--border); margin:0;">Sectors</h3>
            </a>
            <p style="font-size: 13.5px; color: var(--muted-foreground); line-height: 1.5; margin: 0 0 24px 0; flex-grow:1;">conversion sensitive market sectors.</p>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top:auto;">
              <a href="sectors/igaming.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="dices" style="width:14px;height:14px;"></i> iGaming Operators</a>
              <a href="sectors/ecommerce.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="shopping-bag" style="width:14px;height:14px;"></i> eCommerce Brands</a>
              <a href="sectors/fintech.html" style="text-decoration:none; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--jurnii-700);"><i data-lucide="credit-card" style="width:14px;height:14px;"></i> FinTech Portals</a>
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
      item.slug,
      item
    );
    fs.writeFileSync(itemFilePath, pageHTML, 'utf8');
    console.log('Generated Sub-Group LP:', item.slug);
  });
});

// Generate Master use-cases/index.html
const masterFilePath = path.join(root, 'use-cases/index.html');
ensureDirectoryExistence(masterFilePath);
fs.writeFileSync(masterFilePath, getMasterIndexHTML(), 'utf8');
console.log('Generated Refactored Master Hub Hub Page: use-cases/index.html');

console.log('Use case structure successfully built and populated!');
