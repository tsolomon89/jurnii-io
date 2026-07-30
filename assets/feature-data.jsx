// ============================================================
// Features — content data. Every leaf page + category page reads
// from here, so copy edits live in one place. Structure/layout
// lives in the template (feature-page.jsx / feature-archive.jsx).
// Mirrors the Use Cases + Solutions systems exactly.
// ============================================================

window.FEATURE_CATS = {
  "competitor": {
    "key": "competitor",
    "label": "Competitor",
    "icon": "radar",
    "href": "/features/competitor",
    "tagline": "Parse promotions, positioning, and analysis.",
    "lede": "Automated parsing, positioning, and analysis of competitor structures — track every promotion, map how rivals position themselves, and run comparison sprints across your competitive set.",
    "children": [
      "competitor-promotions",
      "competitor-positioning",
      "competitor-comparison",
      "competitor-analysis"
    ]
  },
  "competitor-feed": {
    "key": "competitor-feed",
    "label": "Competitor Feed",
    "icon": "rss",
    "href": "/features/competitor-feed",
    "tagline": "Real-time offers, alerts, and AI insights.",
    "lede": "Real-time notifications, offer monitoring, and AI competitive insights — a continuous surveillance layer that surfaces competitor moves the moment they go live.",
    "children": [
      "competitor-offer-feed",
      "competitor-live-feed",
      "competitor-alerts",
      "competitor-ai-insights"
    ]
  },
  "brand": {
    "key": "brand",
    "label": "Brand",
    "icon": "sparkles",
    "href": "/features/brand",
    "tagline": "Meta scoring, trends, themes, and promotions.",
    "lede": "Evaluate brand design themes, meta scoring, market trends, and promotion richness — a structured read on how your brand presents against the market.",
    "children": [
      "brand-meta-scoring",
      "brand-market-trends",
      "brand-design-themes",
      "brand-promotion-analysis"
    ]
  },
  "brand-performance": {
    "key": "brand-performance",
    "label": "Brand Performance",
    "icon": "gauge",
    "href": "/features/brand-performance",
    "tagline": "Performance, usability, perception, and recs.",
    "lede": "Assess technical performance, usability heuristics, trust perception, and actionable recommendations — turning experience audits into ranked, revenue-weighted fixes.",
    "children": [
      "brand-perfomance",
      "brand-usability",
      "brand-preception",
      "brand-recommendations"
    ]
  }
};

window.FEATURE_SHARED = {
  "challengeSharedPara": "When betting portals share the same suppliers and identical platform configurations, customer experience is the only durable barrier to player defection. Failing to benchmark your flow speed and copywriting clarity against competitor movements leaves your team fighting fires reactively, eroding margins over time.",
  "solutionHeading": "How Jurnii Solves This",
  "solutionIcon": "shield-alert",
  "capHeading": "Operational Capabilities",
  "capLede": "Objective tools designed to replace subjective opinion with verified digital and commercial facts.",
  "implication": "Friction in onboarding and mismatched promotion structures dilutes Net Gaming Revenue (<b>NGR</b>) and increases Customer Acquisition Cost (<b>CAC</b>) by up to <b>35%</b>.",
  "benchmark": {
    "heading": "How Jurnii Outpaces the Market",
    "lede": "A side-by-side comparison of automated intelligence versus traditional retrospective manual setups.",
    "cols": [
      "Jurnii Intelligence",
      "Legacy Analytics",
      "Manual Agencies"
    ],
    "rows": [
      {
        "feat": "Audit Frequency",
        "jurnii": "Continuous Real-Time",
        "legacy": "Ad-Hoc / Event Triggered",
        "manual": "Monthly / Retrospective"
      },
      {
        "feat": "Attribution Logic",
        "jurnii": "Cortex Causal Models",
        "legacy": "First-Click / Last-Click Errors",
        "manual": "Subjective / Gut Feel"
      },
      {
        "feat": "Data Structure",
        "jurnii": "Normalized Promo Richness",
        "legacy": "Raw Text Snippets",
        "manual": "Scattered Spreadsheets"
      },
      {
        "feat": "UX Recommendations",
        "jurnii": "70+ Ranked Heuristics",
        "legacy": "Simple Funnel Dropout Counts",
        "manual": "High-Level Consultant Slideware"
      },
      {
        "feat": "Jurisdictional Coverage",
        "jurnii": "35 Simultaneous Markets",
        "legacy": "Single Market / Restricted",
        "manual": "Local Only"
      }
    ]
  },
  "cortex": {
    "eyebrow": "Cortex Attribution & NGR Impact",
    "heading": "Causal ROI Optimization",
    "paras": [
      "All data harvested by Jurnii UX and Jurnii 360 is normalized and streamed directly into Cortex, our causal modeling and marketing mix attribution engine. Cortex eliminates last-click errors to attribute campaign success with statistical accuracy.",
      "By cataloging competitor promotions, pricing richness, and interface friction, Jurnii enables your data scientists to export MMM-ready datasets. Model the defensive strength of programmatic and search channels in real-time."
    ],
    "result": "+46% ROAS Lift",
    "resultNote": "Continuous automated scanning prevents competitive blind spots across 35 monitored markets."
  },
  "testimonial": {
    "quote": "Before Jurnii, we calibrated our player onboarding bonuses and VIP tiers on subjective guesswork. Having normalized competitive feeds and causal attribution models shifted our growth playbook completely.",
    "avatar": "GM",
    "name": "General Manager, Europe iGaming Conglomerate",
    "role": "Integrated Portfolio Operations"
  },
  "ecosystem": {
    "heading": "Intelligence Integrations",
    "lede": "Jurnii operates as a single unified system, feeding data seamlessly across your tech stack.",
    "columns": [
      {
        "label": "Related Products",
        "items": [
          {
            "href": "/products/jurnii-ux",
            "title": "Jurnii UX",
            "desc": "Automated usability and visual scoring."
          },
          {
            "href": "/products/jurnii-360",
            "title": "Jurnii 360",
            "desc": "Continuous competitor commercial radar."
          }
        ]
      },
      {
        "label": "Related Solutions",
        "items": [
          {
            "href": "/solutions/competition-offers",
            "title": "Competitor Offers",
            "desc": "Standardised competitor promotion tracking."
          },
          {
            "href": "/solutions/user-experience-benchmarking",
            "title": "UX Benchmarking",
            "desc": "Heuristics-based experience index scores."
          }
        ]
      },
      {
        "label": "Built For",
        "items": [
          {
            "href": "/use-cases/cmo",
            "title": "CMO",
            "desc": "Growth strategy and campaign ROI."
          },
          {
            "href": "/use-cases/cco",
            "title": "CCO",
            "desc": "Margin defense and LTV protection."
          }
        ]
      }
    ]
  }
};

window.FEATURE_DATA = {
  "competitor-promotions": {
    "cat": "competitor",
    "slug": "competitor-promotions",
    "icon": "tag",
    "label": "Promotions",
    "cardTitle": "Competitor Promotions Tracking",
    "cardSummary": "Track live competitor sign-up offers, sports/casino bonuses, and wagering multiples in real-time.",
    "kicker": "Competitor Core",
    "title": "Competitor Promotions Tracking",
    "lede": "Track live competitor sign-up offers, sports/casino bonuses, and wagering multiples in real-time.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Never let a competitor promotion go unnoticed. Jurnii monitors active sign-up offers across key regulated jurisdictions, helping operators calibrate margins, protect Net Gaming Revenue (NGR), and acquire players dynamically in high-volatility environments.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "In highly commoditised gaming jurisdictions where B2B platform stacks converge, operators waste millions copying rival promo terms blind. Manual compilation of wagering requirements and bonus values takes weeks, leaving CRM and trading teams two steps behind the market and causing severe margin dilution.",
    "solutionPara": "Using Jurnii 360's continuous tracking engine, Jurnii maps competitive bonus terms, welcome incentives, and CRM triggers across 35 regulated markets simultaneously. Our platform normalizes and scores offer generosity through the proprietary Promo Richness Index to deliver instant strategic clarity.",
    "solutionFoot": "Chief Commercial Officers utilize this feature to safeguard operator margins and maintain active market parity.",
    "capabilities": [
      {
        "icon": "tag",
        "title": "Wagering Hurdles Tracking",
        "body": "Compare deposit wagering requirements, play-through multipliers, and spin constraints side-by-side to understand true player acquisition effort and protect operator hold rates."
      },
      {
        "icon": "globe",
        "title": "Geo-Targeted Audits",
        "body": "Isolate regional campaign variations deployed by rival conglomerates in specific states, provinces, or countries to exploit promotional voids and optimize local customer acquisition cost."
      },
      {
        "icon": "activity",
        "title": "Active Signup Scanning",
        "body": "Detect and log newly introduced welcome offers within minutes of launching to empower trading, CRM, and customer marketing response teams instantly."
      }
    ]
  },
  "competitor-positioning": {
    "cat": "competitor",
    "slug": "competitor-positioning",
    "icon": "map-pin",
    "label": "Positioning",
    "cardTitle": "Competitor Positioning Analytics",
    "cardSummary": "Analyze rival market claims, value propositions, and unique landing page positioning hooks.",
    "kicker": "Competitor Core",
    "title": "Competitor Positioning Analytics",
    "lede": "Analyze rival market claims, value propositions, and unique landing page positioning hooks.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Identify how competitors differentiate themselves in saturated markets. Jurnii continuously maps promotional angles and copywriting claims to highlight underserved positioning opportunities in sports and casino markets, driving acquisition yield higher.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Operators copy-paste generic slogans like 'fast payouts' or 'widest markets' without visual or textual distinction. This lack of differentiation drives customer acquisition costs (CAC) higher as bidding wars intensify on identical copy hooks.",
    "solutionPara": "Jurnii parses all on-site copy and homepage banner states, cataloging active value claims and layout structures. It maps the visual dominance of competitive claims to identify untapped promotional angles and copywriting vulnerabilities.",
    "solutionFoot": "Chief Marketing Officers deploy Jurnii positioning maps to defend brand share and optimize digital spend.",
    "capabilities": [
      {
        "icon": "award",
        "title": "Value Claim Analysis",
        "body": "Extract and index all digital copywriting claims, tracking the exact focus of competitor messaging across key player landing zones and signup funnels."
      },
      {
        "icon": "compass",
        "title": "Differentiated Angles",
        "body": "Spot messaging voids in rival advertising matrices to launch highly unique counter-campaigns that stand out in saturated market segments."
      },
      {
        "icon": "layers",
        "title": "Competitive Matrix Maps",
        "body": "Visualize brand placements based on pricing structures, visual premium qualities, and overall ease-of-use indicators relative to regulatory frameworks."
      }
    ]
  },
  "competitor-comparison": {
    "cat": "competitor",
    "slug": "competitor-comparison",
    "icon": "git-compare",
    "label": "Comparison",
    "cardTitle": "Competitor Comparison Engines",
    "cardSummary": "Compare player acquisition pathways, sign-up structures, and deposit requirements side-by-side.",
    "kicker": "Competitor Core",
    "title": "Competitor Comparison Engines",
    "lede": "Compare player acquisition pathways, sign-up structures, and deposit requirements side-by-side.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Run detailed mathematical comparisons of competitive player flows. Calibrate your operator margins by evaluating wagering rules and bonus depth directly against major regional operators on a single canvas.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "With 70-80% of players holding accounts with 3-5 operators simultaneously, loyalty is fragile. If your signup requires two more clicks or has slower KYC checks than a rival, players abandon the funnel permanently.",
    "solutionPara": "Jurnii Normalizes competitive flows into standardized user journey sequences. It maps steps, inputs, KYC checks, and payment integrations side-by-side with global best practices to pinpoint conversion rate leaks.",
    "solutionFoot": "Heads of UX utilize Jurnii comparisons to justify interface updates and outpace regional platform benchmarks.",
    "capabilities": [
      {
        "icon": "git-compare",
        "title": "Side-by-Side Scoring",
        "body": "Evaluate registration, verification (KYC), and payment pipelines against three chosen rivals simultaneously under real-world mobile network conditions."
      },
      {
        "icon": "gift",
        "title": "Bonus Calibration Matrix",
        "body": "Compare wagering multipliers and free spin richness across target categories to determine competitive generosity and prevent CRM margin dilution."
      },
      {
        "icon": "filter",
        "title": "Friction Auditing",
        "body": "Compare click counts, form requirements, and page load delays across competitor checkout pathways to identify strategic interface vulnerabilities."
      }
    ]
  },
  "competitor-analysis": {
    "cat": "competitor",
    "slug": "competitor-analysis",
    "icon": "bar-chart-2",
    "label": "Analysis",
    "cardTitle": "Competitor Analysis Sprints",
    "cardSummary": "Synthesize large-scale competitor marketing moves, promotional patterns, and timing frameworks.",
    "kicker": "Competitor Core",
    "title": "Competitor Analysis Sprints",
    "lede": "Synthesize large-scale competitor marketing moves, promotional patterns, and timing frameworks.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Uncover competitor playbooks systematically. Synthesize months of competitive campaign data to identify launch frequencies, product milestones, and strategic market timing across multiple regulated markets.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Siloed data prevents executive alignment. Product, marketing, and commercial teams operate on separate gut-feels rather than shared market truths, leading to bad budget allocations during peak sporting seasons.",
    "solutionPara": "Jurnii compiles continuous market tracking into executive-ready dashboards and longitudinal reports, enabling strategic planning at 85% confidence rather than reactive 50% guesses.",
    "solutionFoot": "Chief Executive Officers utilize Jurnii summaries to align board presentations and streamline M&A competitive due diligence.",
    "capabilities": [
      {
        "icon": "calendar",
        "title": "Historical Sequencing",
        "body": "Chart competitor campaign durations over seasons to anticipate product updates, mobile updates, and aggressive marketing spend pushes."
      },
      {
        "icon": "trending-up",
        "title": "Margin Calibration Sprints",
        "body": "Evaluate average competitor bonus payout metrics to benchmark your net yield efficiency and hold rates against regional peers."
      },
      {
        "icon": "file-text",
        "title": "Executive Summaries",
        "body": "Generate board-ready competitor profiles, market generics, and compliance histories in a single click for fast corporate planning."
      }
    ]
  },
  "competitor-offer-feed": {
    "cat": "competitor-feed",
    "slug": "competitor-offer-feed",
    "icon": "rss",
    "label": "Offer Feed",
    "cardTitle": "Competitor Offer Feed Integrations",
    "cardSummary": "Access continuous, structured data streams of active competitor promotional campaign terms.",
    "kicker": "Competitor Feed",
    "title": "Competitor Offer Feed Integrations",
    "lede": "Access continuous, structured data streams of active competitor promotional campaign terms.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Transform promotions into machine-readable data. Feed structured competitor promotion files directly into local modeling systems, pricing algorithms, or internal dashboards for always-on visibility.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Scraping competitor campaigns by hand is slow, error-prone, and cannot scale across 400+ weekly offers and 5,000+ monthly sports boosts. This leaves data science teams starved of timely modeling datasets.",
    "solutionPara": "Jurnii delivers direct API endpoints and webhook channels that stream normalized, structured campaign data into your database, CRM, or Marketing Mix Model (MMM) for rapid processing.",
    "solutionFoot": "Cortex models are enriched with always-on Jurnii 360 offer feeds to attribute campaign success with causal accuracy.",
    "capabilities": [
      {
        "icon": "database",
        "title": "Structured API Access",
        "body": "Feed clean competitor offer JSON data directly into your CRM or player platforms for dynamic margin pricing and acquisition calibration."
      },
      {
        "icon": "archive",
        "title": "Historical Archive",
        "body": "Access comprehensive records of expired competitor promos to research holiday trends and winter seasonal playbooks across jurisdictions."
      },
      {
        "icon": "code",
        "title": "Wagering Decoders",
        "body": "Automatically translate complex bonus terms and conditions into clean data rows, including deposit matches, rollovers, and spin values."
      }
    ]
  },
  "competitor-live-feed": {
    "cat": "competitor-feed",
    "slug": "competitor-live-feed",
    "icon": "activity",
    "label": "Live Feed",
    "cardTitle": "Competitor Live Feed Surveillance",
    "cardSummary": "Monitor real-time product updates, page modifications, and creative updates.",
    "kicker": "Competitor Feed",
    "title": "Competitor Live Feed Surveillance",
    "lede": "Monitor real-time product updates, page modifications, and creative updates.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Stay continuously connected to rival movements. Monitor live landing page visual edits and copywriting adjustments as they happen across multi-brand operators to preserve your competitive edge.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Competitors launch aggressive welcome campaigns during major sporting events, catching your commercial team off-guard and eroding active market share in a matter of hours.",
    "solutionPara": "Our scraper network crawls operator domains multiple times daily, tracking DOM shifts, image updates, CSS adjustments, and CTA copywriting edits under simulated user flows.",
    "solutionFoot": "Heads of CRM use the Live Feed to monitor retention bonuses, adjusting internal rewards to prevent player churn.",
    "capabilities": [
      {
        "icon": "eye",
        "title": "Visual Shift Tracking",
        "body": "Detect visual interface alterations, branding shifts, and structural design adjustments on competitive pages the moment they go live."
      },
      {
        "icon": "refresh-cw",
        "title": "Real-time Monitors",
        "body": "Run continuous server-side monitors to detect active page changes, pricing models, payment portals, and affiliate links."
      },
      {
        "icon": "clipboard",
        "title": "Changelog Reporting",
        "body": "Compile daily logs detailing rival feature introductions, navigation shifts, digital wallet integrations, and verification alterations."
      }
    ]
  },
  "competitor-alerts": {
    "cat": "competitor-feed",
    "slug": "competitor-alerts",
    "icon": "bell",
    "label": "Alerts",
    "cardTitle": "Competitor Alerts Network",
    "cardSummary": "Receive instant notifications when competitors launch new offers, adjust rates, or shift copy.",
    "kicker": "Competitor Feed",
    "title": "Competitor Alerts Network",
    "lede": "Receive instant notifications when competitors launch new offers, adjust rates, or shift copy.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "React instantly to market events. Receive direct alerts the exact moment a competitor adjusts their registration, deposit, or retention bonuses to maintain absolute parity.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Missing a rival’s major campaign shift means playing catch-up for weeks while high-value players (who drive 80% of revenue) defect to more generous platforms.",
    "solutionPara": "Configure threshold triggers based on bonus value, wagering multiples, or visual shifts, sending push updates to your commercial team channels via Slack or webhooks.",
    "solutionFoot": "Chief Commercial Officers set up alerts for local competitor moves, ensuring their brand remains a market leader.",
    "capabilities": [
      {
        "icon": "bell",
        "title": "Multi-channel Alerts",
        "body": "Configure custom push alerts via Slack, Microsoft Teams, email, or direct webhook integrations into trading platforms."
      },
      {
        "icon": "sliders",
        "title": "Bonus Shift Detection",
        "body": "Trigger notifications only when wagering terms, deposit percentages, or free spin values shift beyond predefined thresholds."
      },
      {
        "icon": "percent",
        "title": "Custom Thresholds",
        "body": "Define triggers based on maximum bonus values or promotional payout richness indices to avoid alert fatigue."
      }
    ]
  },
  "competitor-ai-insights": {
    "cat": "competitor-feed",
    "slug": "competitor-ai-insights",
    "icon": "brain",
    "label": "AI Insights",
    "cardTitle": "Competitor AI Insights & Predictions",
    "cardSummary": "Deploy advanced ML models to predict competitor marketing pushes and summarize campaign angles.",
    "kicker": "Competitor Feed",
    "title": "Competitor AI Insights & Predictions",
    "lede": "Deploy advanced ML models to predict competitor marketing pushes and summarize campaign angles.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Gain predictive foresight in competitive markets. Leverage specialized neural nets to summarize massive campaign databases and predict rival product timing and advertising strategies.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Raw competitor data is overwhelming. Sorting through thousands of sports boosts, casino offers, and copy variations manually prevents analysts from identifying real strategic patterns.",
    "solutionPara": "Jurnii utilizes proprietary domain-specific ML models to digest competitive databases, classifying campaigns, detecting trends, and predicting launch windows with 85% confidence.",
    "solutionFoot": "Chief Marketing Officers use AI Insights to allocate advertising budget toward highly defensive channels.",
    "capabilities": [
      {
        "icon": "brain",
        "title": "Timing Prediction",
        "body": "Anticipate rival marketing deployments and product launches using deep temporal predictive models trained on historical operator behaviors."
      },
      {
        "icon": "message-square",
        "title": "Ad Copy Summaries",
        "body": "Utilize natural language processing to isolate winning competitor copywriting hooks and visual messaging angles across landing zones."
      },
      {
        "icon": "alert-circle",
        "title": "Anomaly Spotting",
        "body": "Flag unusual competitor acquisition spikes, non-standard bonus structures, or regulatory compliance failures instantly."
      }
    ]
  },
  "brand-meta-scoring": {
    "cat": "brand",
    "slug": "brand-meta-scoring",
    "icon": "sparkles",
    "label": "Meta Scoring",
    "cardTitle": "Brand Meta Scoring Index",
    "cardSummary": "Evaluate and aggregate overall user experience, visual quality, and compliance metrics into unified scores.",
    "kicker": "Brand Core",
    "title": "Brand Meta Scoring Index",
    "lede": "Evaluate and aggregate overall user experience, visual quality, and compliance metrics into unified scores.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Establish a single metric for design and conversion quality. Aggregate visual, usability, speed, and onboarding indicators to score your brand portfolios side-by-side with global peers.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Design discussions are plagued by subjectivity. Executive teams debate colors and fonts instead of focusing on verified conversion friction that drains acquisition efficiency.",
    "solutionPara": "Jurnii UX normalizes hundreds of design, compliance, and performance metrics into a single, authoritative, commercially weighted Meta Score for board reporting.",
    "solutionFoot": "Chief Product Officers leverage Meta Scores to establish clear design standards across their entire operator portfolio.",
    "capabilities": [
      {
        "icon": "sparkles",
        "title": "Unified Visual Index",
        "body": "Combine multiple UX vectors, technical vitals, and accessibility factors into a single, board-ready brand grade."
      },
      {
        "icon": "layers",
        "title": "Portfolio Scoring",
        "body": "Score and compare internal sister brands and regional domains under one standard metric system to track performance."
      },
      {
        "icon": "bar-chart",
        "title": "Executive Benchmark Dashboards",
        "body": "Present high-fidelity design metrics directly to product, marketing, and compliance leadership with absolute clarity."
      }
    ]
  },
  "brand-market-trends": {
    "cat": "brand",
    "slug": "brand-market-trends",
    "icon": "trending-up",
    "label": "Market Trends",
    "cardTitle": "Brand Market Trends Auditing",
    "cardSummary": "Benchmark industry design patterns, color systems, and interactive trends across major operators.",
    "kicker": "Brand Core",
    "title": "Brand Market Trends Auditing",
    "lede": "Benchmark industry design patterns, color systems, and interactive trends across major operators.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Adopt modern UX trends ahead of the competition. Track the evolution of gaming interfaces, dark mode styles, and betslip integrations across global markets to ensure design relevance.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Product roadmaps are built in silos. Operators miss significant market shifts like digital wallets or instant KYC integrations until they have already lost strategic market share.",
    "solutionPara": "Jurnii constantly indexes visual and functional elements of leading operators, reporting on adoption speeds of new designs and UI patterns to guide product priorities.",
    "solutionFoot": "Heads of UX deploy trend reports to keep interfaces modern and aligned with evolving player expectations.",
    "capabilities": [
      {
        "icon": "palette",
        "title": "Design System Mapping",
        "body": "Identify color palettes, border styling, and layout spacing systems gaining regional traction across key demographics."
      },
      {
        "icon": "check-square",
        "title": "Feature Adoption Rates",
        "body": "Measure how fast rival operators deploy new digital wallet or quick-bet features to guide product prioritization decisions."
      },
      {
        "icon": "globe",
        "title": "Global Shift Analysis",
        "body": "Review visual design trends in pioneering markets like Sweden, the UK, and Ontario to anticipate local structural shifts."
      }
    ]
  },
  "brand-design-themes": {
    "cat": "brand",
    "slug": "brand-design-themes",
    "icon": "palette",
    "label": "Design Themes",
    "cardTitle": "Brand Design Themes Auditing",
    "cardSummary": "Audit visual stylesheet systems, typography scale, and layout systems in use by rivals.",
    "kicker": "Brand Core",
    "title": "Brand Design Themes Auditing",
    "lede": "Audit visual stylesheet systems, typography scale, and layout systems in use by rivals.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Standardize aesthetic measurements across competitors. Automatically catalog font families, button border-radius systems, and visual padding to understand contemporary iGaming design standards.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Aesthetic consistency is hard to enforce across multiple regional brands, resulting in visual drift, technical debt, and a compromised premium brand feel.",
    "solutionPara": "Jurnii's CSS scraper normalizes styling properties, documenting typographic scales, font family combinations, spacing utilities, and visual variables automatically.",
    "solutionFoot": "Design Systems Architects use Theme Auditing to establish strict tokens and prevent internal style drift.",
    "capabilities": [
      {
        "icon": "code",
        "title": "Style Sheet Scraping",
        "body": "Scrape and log CSS variables, layout spacing, and visual styling properties across competitor domains to benchmark technical execution."
      },
      {
        "icon": "type",
        "title": "Typography Analysis",
        "body": "Audit visual reading levels, typography hierarchy, and reading ease across player registration flows to prevent cognitive fatigue."
      },
      {
        "icon": "columns",
        "title": "Theme Comparison Matrix",
        "body": "Map brands across minimalist layouts, hyper-promotional patterns, or high-density gaming UIs to locate styling voids."
      }
    ]
  },
  "brand-promotion-analysis": {
    "cat": "brand",
    "slug": "brand-promotion-analysis",
    "icon": "layers",
    "label": "Promotion Analysis",
    "cardTitle": "Brand Promotion Placement Analysis",
    "cardSummary": "Correlate promotional structures and wagering richness to visual placement and layout design.",
    "kicker": "Brand Core",
    "title": "Brand Promotion Placement Analysis",
    "lede": "Correlate promotional structures and wagering richness to visual placement and layout design.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Optimize landing page conversion. Correlate promotional bonus richness directly with structural design, banner sizes, and copywriting placement to maximize player registration yields.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Operators offer rich sign-up incentives but fail to convert players because the promotional design is cluttered, slow, or visually hard to read, diluting marketing spend.",
    "solutionPara": "Jurnii maps promotional banner real estate and layout formats to active bonus richness, indicating which visual formats drive optimal signup yield and lower acquisition CPA.",
    "solutionFoot": "Chief Marketing Officers use these insights to balance creative design with promotional yield expectations.",
    "capabilities": [
      {
        "icon": "edit-3",
        "title": "Copywriting Optimization",
        "body": "Correlate player conversion yields against headline text lengths, CTA button positions, and terms visibility."
      },
      {
        "icon": "layout",
        "title": "Banner Size Audits",
        "body": "Measure how visual real estate allocation on homepages and affiliate landing zones influences player registration success."
      },
      {
        "icon": "activity",
        "title": "Creative Performance Logs",
        "body": "Map historical competitor banner deployments against promotional click-through indicators to model layout efficiency."
      }
    ]
  },
  "brand-perfomance": {
    "cat": "brand-performance",
    "slug": "brand-perfomance",
    "icon": "zap",
    "label": "Performance",
    "cardTitle": "Brand Technical Perfomance",
    "cardSummary": "Measure actual page loading metrics, core web vitals, and asset performance dynamically.",
    "kicker": "Brand Performance",
    "title": "Brand Technical Perfomance",
    "lede": "Measure actual page loading metrics, core web vitals, and asset performance dynamically.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Eliminate latency before player abandonment. Measure and track core web vitals and mobile connection delays under simulated network loads directly against rivals to preserve NGR.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "10% of players drive 80% of revenue, and these high-value players are highly sensitive to latency. A 1-second delay in page load on checkout or betslip causes immediate abandonment.",
    "solutionPara": "Jurnii simulates real-world mobile connection scenarios to test operator domains, cataloging LCP, FID, and CLS scores side-by-side with regional competitors.",
    "solutionFoot": "Chief Operating Officers deploy speed metrics to eliminate infrastructure bottlenecks and defend NGR.",
    "capabilities": [
      {
        "icon": "zap",
        "title": "Core Web Vitals Auditing",
        "body": "Track LCP, FID, and CLS scores dynamically under low-bandwidth mobile environments to catch performance drift."
      },
      {
        "icon": "hard-drive",
        "title": "Asset Size Monitoring",
        "body": "Monitor script file weights, asset packaging, and media optimization indicators to eliminate engineering bloat."
      },
      {
        "icon": "gauge",
        "title": "Competitive Speed Index",
        "body": "Rank operator checkout and betslip speed side-by-side with regional industry competitors to maintain speed supremacy."
      }
    ]
  },
  "brand-usability": {
    "cat": "brand-performance",
    "slug": "brand-usability",
    "icon": "check-circle",
    "label": "Usability",
    "cardTitle": "Brand Usability Heuristics",
    "cardSummary": "Run exhaustive heuristic user experience evaluations on key player onboarding pathways.",
    "kicker": "Brand Performance",
    "title": "Brand Usability Heuristics",
    "lede": "Run exhaustive heuristic user experience evaluations on key player onboarding pathways.",
    "metrics": [
      {
        "num": "300+",
        "label": "Brands Analysed"
      },
      {
        "num": "70+",
        "label": "Recommendations per Audit"
      },
      {
        "num": "4",
        "label": "Key UX Dimensions"
      },
      {
        "num": "Mins",
        "label": "Time to Full Audit"
      }
    ],
    "manifesto": "Evaluate ease-of-use with mathematical objectivity. Identify friction points in sports betting checkout, payment selection, and document upload stages.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Usability evaluations are slow, expensive, and highly subjective when conducted by traditional design agencies, delaying sprint cycles by weeks.",
    "solutionPara": "Jurnii UX runs automated heuristic audits mapped across four dimensions, providing ranked recommendations to clear player onboarding pathways.",
    "solutionFoot": "Chief Product Officers leverage usability scoring to prioritize features and accelerate development roadmaps.",
    "capabilities": [
      {
        "icon": "check-circle",
        "title": "Heuristic Frameworks",
        "body": "Evaluate experience against 12 core onboarding design criteria systematically to replace opinions with facts."
      },
      {
        "icon": "activity",
        "title": "Cognitive Load Evaluation",
        "body": "Spot redundant form fields, confusing terms layouts, and interactive elements causing checkout and registration leakage."
      },
      {
        "icon": "alert-triangle",
        "title": "Error Recovery Audits",
        "body": "Analyze validation prompts, instruction clarity, and error feedback systems across player signup flows."
      }
    ]
  },
  "brand-preception": {
    "cat": "brand-performance",
    "slug": "brand-preception",
    "icon": "eye",
    "label": "Perception",
    "cardTitle": "Brand Trust & Preception",
    "cardSummary": "Audit customer trust, security signals, and visual safety perceptions across key pipelines.",
    "kicker": "Brand Performance",
    "title": "Brand Trust & Preception",
    "lede": "Audit customer trust, security signals, and visual safety perceptions across key pipelines.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Enhance onboarding security confidence. Audit regulatory badges, terms visibility, and data privacy styling elements to maximize player signup success.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Players drop out of verification (KYC) funnels because the secure screens look generic, outdated, or confusing, causing a total collapse in visual trust.",
    "solutionPara": "We audit trust signals, compliance badges, SSL visibility, and secure layout designs to ensure interfaces project maximum authority and safety.",
    "solutionFoot": "Heads of CRM utilize trust scores to align customer messaging and defend brand retention.",
    "capabilities": [
      {
        "icon": "shield",
        "title": "Trust Signals Scraping",
        "body": "Log compliance logos, regulatory text, and payout certifications across landing zones to ensure regulatory safety."
      },
      {
        "icon": "lock",
        "title": "Security Styling Audits",
        "body": "Optimize password forms, terms checkboxes, and account verification panels to reassure players during security steps."
      },
      {
        "icon": "eye",
        "title": "Visual Safety Rankings",
        "body": "Grade player onboarding trust perceptions side-by-side with premier operator portals to locate visual drop-offs."
      }
    ]
  },
  "brand-recommendations": {
    "cat": "brand-performance",
    "slug": "brand-recommendations",
    "icon": "thumbs-up",
    "label": "Recommendations",
    "cardTitle": "Brand Actionable Recommendations",
    "cardSummary": "Obtain automated, high-fidelity actionable suggestions to address UX deficiencies and outpace rivals.",
    "kicker": "Brand Performance",
    "title": "Brand Actionable Recommendations",
    "lede": "Obtain automated, high-fidelity actionable suggestions to address UX deficiencies and outpace rivals.",
    "metrics": [
      {
        "num": "1,000+",
        "label": "Offers Tracked Weekly"
      },
      {
        "num": "35",
        "label": "Regulated Markets Monitored"
      },
      {
        "num": "21",
        "label": "Feature Areas Scanned"
      },
      {
        "num": "30+",
        "label": "Hours Saved per Week"
      }
    ],
    "manifesto": "Receive immediate development blueprints. Access step-by-step UI adjustments to resolve identified friction leaks and outpace adjacent operator competitors.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Product and engineering teams struggle to prioritize bugs based on revenue, wasting development cycles on low-impact layout changes.",
    "solutionPara": "Jurnii ranks all audit findings by severity and commercial weight, providing a development checklist mapped directly to revenue consequences.",
    "solutionFoot": "Chief Product Officers use Jurnii recommendations to build bulletproof roadmap sprints.",
    "capabilities": [
      {
        "icon": "clipboard-list",
        "title": "Actionable Sprints",
        "body": "Obtain clean development task checklists to address identified user onboarding leaks with zero guesswork."
      },
      {
        "icon": "image",
        "title": "Visual Reference Cards",
        "body": "Match recommended UI corrections to verified industry-leading interface layouts for fast developer implementation."
      },
      {
        "icon": "dollar-sign",
        "title": "Yield Impact Mapping",
        "body": "Prioritize design updates based on estimated player conversion, acquisition impact, and NGR recovery potential."
      }
    ]
  }
};
