// ============================================================
// Solutions — content data. Every leaf page + category page reads
// from here, so copy edits live in one place. Structure/layout
// lives in the template (solution-page.jsx / solution-archive.jsx).
// Mirrors the Use Cases system exactly.
// ============================================================

window.SOLUTION_CATS = {
  "competition": {
    "key": "competition",
    "label": "Competition",
    "icon": "radar",
    "href": "/solutions/competition",
    "tagline": "Map rivals, offers, pricing, and positioning.",
    "lede": "Maintain total market awareness — discover new entrants, benchmark competitor offers, calibrate pricing, and track how rivals position themselves across every regulated jurisdiction.",
    "children": [
      "competition-discovery",
      "competition-offers",
      "competition-pricing",
      "competition-postitioning"
    ]
  },
  "benchmarking": {
    "key": "benchmarking",
    "label": "Benchmarking",
    "icon": "gauge",
    "href": "/solutions/benchmarking",
    "tagline": "Score interfaces, journeys, and market position.",
    "lede": "Replace subjective opinion with structured heuristic scoring — benchmark your interface, experience, customer journeys, and market positioning side-by-side against the peer set.",
    "children": [
      "user-interface-benchmarking",
      "user-experience-benchmarking",
      "customer-journey-benchmarking",
      "market-positioning-benchmarking"
    ]
  },
  "attribution": {
    "key": "attribution",
    "label": "Attribution",
    "icon": "git-merge",
    "href": "/solutions/attribution",
    "tagline": "Correlate spend with true incremental yield.",
    "lede": "Move past last-click errors — attribute marketing ROI, decompose cross-channel impact, run marketing mix modelling, and isolate the drivers of real market growth with Cortex causal models.",
    "children": [
      "marketing-roi-attribution",
      "cross-channel-attribution",
      "marketing-mix-modeling-attribution",
      "market-growth-attribution"
    ]
  },
  "optimization": {
    "key": "optimization",
    "label": "Optimization",
    "icon": "trending-up",
    "href": "/solutions/optimization",
    "tagline": "Lift conversion, LTV, retention, and CPA.",
    "lede": "Minimise registration leakage, protect lifetime value, defend against churn, and lower acquisition cost — turning benchmarked friction points into measurable commercial yield.",
    "children": [
      "conversion-rate-optimization",
      "life-time-value-optimization",
      "churn-rate-optimization",
      "customer-aquistion-cost-optimization"
    ]
  }
};

window.SOLUTION_SHARED = {
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
            "href": "/products/jurnii-mmm",
            "title": "Cortex",
            "desc": "Causal attribution and planning mix."
          }
        ]
      },
      {
        "label": "Core Features",
        "items": [
          {
            "href": "/features/brand-usability",
            "title": "Usability",
            "desc": "Standardized heuristic usability auditing."
          },
          {
            "href": "/features/competitor-promotions",
            "title": "Promotions",
            "desc": "Automate promotional campaign tracking."
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

window.SOLUTION_DATA = {
  "competition-discovery": {
    "cat": "competition",
    "slug": "competition-discovery",
    "icon": "search",
    "label": "Discovery",
    "cardTitle": "Competition Discovery Solutions",
    "cardSummary": "Identify emerging operators and new brand launches entering your target jurisdictions automatically.",
    "kicker": "Competition",
    "title": "Competition Discovery Solutions",
    "lede": "Identify emerging operators and new brand launches entering your target jurisdictions automatically.",
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
    "manifesto": "Maintain total market awareness. Jurnii continuously maps regional operators, tracking fresh multi-brand conglomerates and boutique platforms before they claim market share.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Boutique operators enter regulated markets quietly, bidding up player acquisition keywords and eroding your regional market share before you notice.",
    "solutionPara": "Jurnii scans regional licensing databases and ad registries, notifying you the moment a new brand launches welcome offers in your jurisdiction.",
    "solutionFoot": "Chief Executive Officers use discovery solutions to maintain strategic market leadership.",
    "capabilities": [
      {
        "icon": "map",
        "title": "Operator Mapping",
        "body": "Map active gaming and casino sites inside regulated regional boundaries automatically to preserve market share."
      },
      {
        "icon": "alert-circle",
        "title": "New Entrant Alerts",
        "body": "Receive immediate notifications the moment a new brand launches welcome offers or CRM campaigns in your region."
      },
      {
        "icon": "globe",
        "title": "Jurisdictional Audits",
        "body": "Audit regional operator saturation across Ontario, Sweden, UK, and emerging states to identify market voids."
      }
    ]
  },
  "competition-offers": {
    "cat": "competition",
    "slug": "competition-offers",
    "icon": "gift",
    "label": "Offers",
    "cardTitle": "Competition Offers Intelligence",
    "cardSummary": "Standardize competitor promotion tracking to continuously deploy winning acquisition campaigns.",
    "kicker": "Competition",
    "title": "Competition Offers Intelligence",
    "lede": "Standardize competitor promotion tracking to continuously deploy winning acquisition campaigns.",
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
    "manifesto": "Eliminate promotional speculation. Systematize tracking of deposit bonus percentages, spin counts, and sports betting boosts across your competitors.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "CRM and trading teams duplicate competitor promotions reactively without knowing if those mechanics actually drive incrementality, causing margin dilution.",
    "solutionPara": "Jurnii normalizes competitor sports and casino offers, scoring their generosity using the proprietary Promo Richness Index.",
    "solutionFoot": "Chief Commercial Officers deploy offers intelligence to align CRM strategy with real-world market context.",
    "capabilities": [
      {
        "icon": "gift",
        "title": "Bonus Richness Index",
        "body": "Standardize bonus yield calculations based on active wagering hurdles and rollover requirements."
      },
      {
        "icon": "tag",
        "title": "Ad Campaign Parsing",
        "body": "Extract competitor banner messaging, creative headers, and copywriting hooks dynamically across landing zones."
      },
      {
        "icon": "calendar",
        "title": "Holiday Trend Logs",
        "body": "Review competitor Christmas, World Cup, and Super Bowl promotional timelines to anticipate spend."
      }
    ]
  },
  "competition-pricing": {
    "cat": "competition",
    "slug": "competition-pricing",
    "icon": "dollar-sign",
    "label": "Pricing",
    "cardTitle": "Competition Pricing Calibration",
    "cardSummary": "Calibrate player margins, deposit rules, and wagering requirements against real-time market data.",
    "kicker": "Competition",
    "title": "Competition Pricing Calibration",
    "lede": "Calibrate player margins, deposit rules, and wagering requirements against real-time market data.",
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
    "manifesto": "Protect operator margin while remaining highly competitive. Align welcome offers and player rewards with continuous, structured regional metrics.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Over-generous sign-up bonuses erode operator margins, while overly restrictive wagering rules kill player acquisition and drive players to rivals.",
    "solutionPara": "We model payout curves and margin impact across different spin multipliers and wagering requirements to find the commercial sweet spot.",
    "solutionFoot": "Chief Commercial Officers use pricing calibration to defend yield thresholds across target markets.",
    "capabilities": [
      {
        "icon": "dollar-sign",
        "title": "Margin Defense Tools",
        "body": "Prevent margin erosion by tracking minimum deposit and payout limits across competitors in real-time."
      },
      {
        "icon": "sliders",
        "title": "Wagering Calibrators",
        "body": "Model payout curves across different spin multipliers and sports wagering terms to optimize yields."
      },
      {
        "icon": "activity",
        "title": "ROI Auditing Engine",
        "body": "Audit rival affiliate rewards and player acquisition pipelines automatically to detect pricing shifts."
      }
    ]
  },
  "competition-postitioning": {
    "cat": "competition",
    "slug": "competition-postitioning",
    "icon": "compass",
    "label": "Positioning",
    "cardTitle": "Competition Postitioning Strategy",
    "cardSummary": "Discover untapped marketing hooks and value claims by mapping rival operator positioning.",
    "kicker": "Competition",
    "title": "Competition Postitioning Strategy",
    "lede": "Discover untapped marketing hooks and value claims by mapping rival operator positioning.",
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
    "manifesto": "Differentiate with absolute precision. Isolate positioning angles left open by competitor marketing layouts to establish highly defensive, low-CPA campaigns.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Acquisition campaigns collapse when operators fail to stand out, forcing them to rely on price generosity and bonus size alone.",
    "solutionPara": "Jurnii maps the copywriting and messaging space, signaling where competitors have left visual or conceptual voids.",
    "solutionFoot": "Chief Marketing Officers deploy positioning strategy to optimize ROAS across paid media channels.",
    "capabilities": [
      {
        "icon": "compass",
        "title": "Value Claim Maps",
        "body": "Graph active brands based on core value propositions, speed, safety, or bonus size."
      },
      {
        "icon": "file-text",
        "title": "Copywriting Auditing",
        "body": "Parse competitor landing page copy to identify dominant positioning themes and messaging voids."
      },
      {
        "icon": "crosshair",
        "title": "Segment Expansion",
        "body": "Target high-value player personas ignored by slow-moving regional operators with custom copy."
      }
    ]
  },
  "user-interface-benchmarking": {
    "cat": "benchmarking",
    "slug": "user-interface-benchmarking",
    "icon": "layout",
    "label": "User Interface",
    "cardTitle": "User Interface Benchmarking",
    "cardSummary": "Grade aesthetic layouts, grid structure, and visual clarity against leading global operators.",
    "kicker": "Benchmarking",
    "title": "User Interface Benchmarking",
    "lede": "Grade aesthetic layouts, grid structure, and visual clarity against leading global operators.",
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
    "manifesto": "Establish visual excellence without subjective debates. Benchmark stylesheet setups, typographic layouts, and visual real estate side-by-side with global peers.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Subjective design reviews delay product releases by weeks and often fail to fix the layout errors that actually block players and kill conversion.",
    "solutionPara": "We run automated visual audits, scoring layout spacing, color contrast accessibility, and grid balance against industry best practice.",
    "solutionFoot": "Design Systems Architects use UI Benchmarking to enforce brand guidelines and visual consistency.",
    "capabilities": [
      {
        "icon": "layout",
        "title": "Aesthetic Scoring",
        "body": "Grade interface quality, layout spacing, and grid balance using automated structural analysis."
      },
      {
        "icon": "palette",
        "title": "Design System Logs",
        "body": "Scrape and archive rival typographic scales, border systems, and color systems for fast engineering reuse."
      },
      {
        "icon": "eye",
        "title": "Contrast Integrity Checks",
        "body": "Assert readability and styling accessibility requirements across player flows to satisfy compliance."
      }
    ]
  },
  "user-experience-benchmarking": {
    "cat": "benchmarking",
    "slug": "user-experience-benchmarking",
    "icon": "smile",
    "label": "User Experience",
    "cardTitle": "User Experience Benchmarking",
    "cardSummary": "Automate user flow assessments across core player registration, verification, and deposit funnels.",
    "kicker": "Benchmarking",
    "title": "User Experience Benchmarking",
    "lede": "Automate user flow assessments across core player registration, verification, and deposit funnels.",
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
    "manifesto": "Calibrate player friction objectively. Replace sluggish, manual usability audits with automated heuristic evaluation of your key transactional pathways.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Manual UX audits are slow, retrospective, and fail to scale across multi-brand and multi-market operator portfolios.",
    "solutionPara": "Jurnii UX runs automated usability scans across key player journeys, grading each against 12 core onboarding heuristics.",
    "solutionFoot": "Chief Product Officers leverage UX benchmarking to prioritize development sprints and vindicate roadmaps.",
    "capabilities": [
      {
        "icon": "smile",
        "title": "Heuristic Benchmarks",
        "body": "Benchmark player flows against 12 core onboarding design principles to replace opinion with facts."
      },
      {
        "icon": "zap",
        "title": "Cognitive Fatigue Audits",
        "body": "Isolate interaction points and redundant inputs causing player dropoffs during signup."
      },
      {
        "icon": "route",
        "title": "Onboarding Flow Scores",
        "body": "Grade transaction flow paths against leading global sportsbooks to guide sprint updates."
      }
    ]
  },
  "customer-journey-benchmarking": {
    "cat": "benchmarking",
    "slug": "customer-journey-benchmarking",
    "icon": "milestone",
    "label": "Customer Journey",
    "cardTitle": "Customer Journey Benchmarking",
    "cardSummary": "Visualize player transition states and identify interaction friction points in high-value checkouts.",
    "kicker": "Benchmarking",
    "title": "Customer Journey Benchmarking",
    "lede": "Visualize player transition states and identify interaction friction points in high-value checkouts.",
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
    "manifesto": "Optimize the path to first bet. Map complete player progression pathways from landing page to successful deposit to repair leakage funnels.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Players abandon transactions at secure verification and wallet selection steps, but analytics logs fail to show the visual cause.",
    "solutionPara": "Jurnii models the visual flow of transactions, documenting friction thresholds and identifying design bottlenecks.",
    "solutionFoot": "Heads of UX deploy journey benchmarking to repair leaky pipelines and secure player loyalty.",
    "capabilities": [
      {
        "icon": "milestone",
        "title": "Transition State Maps",
        "body": "Model user progress through verification (KYC), wallet selection, and checkouts systematically."
      },
      {
        "icon": "alert-triangle",
        "title": "Friction Point Logs",
        "body": "Flag redundant form entries, laggy inputs, and validation obstacles across multi-brand setups."
      },
      {
        "icon": "filter",
        "title": "Dropoff Analytics",
        "body": "Track where high-value customers abandon onboarding steps to target UX updates."
      }
    ]
  },
  "market-positioning-benchmarking": {
    "cat": "benchmarking",
    "slug": "market-positioning-benchmarking",
    "icon": "globe",
    "label": "Market Positioning",
    "cardTitle": "Market Positioning Benchmarking",
    "cardSummary": "Quantify design quality and promotional value to identify regional market growth opportunities.",
    "kicker": "Benchmarking",
    "title": "Market Positioning Benchmarking",
    "lede": "Quantify design quality and promotional value to identify regional market growth opportunities.",
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
    "manifesto": "Secure regional market share. Map your portfolio's visual UX grade and bonus structures against target competitors to identify strategic regional growth zones.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Entering a new jurisdiction is high-risk when operators are blind to the exact design expectations and promotional rules of the local market.",
    "solutionPara": "We analyze local competitors, mapping their visual scores and Promo Richness Index positions to outline regional growth blueprints.",
    "solutionFoot": "Chief Executive Officers deploy market benchmarking to guide international expansion budgets.",
    "capabilities": [
      {
        "icon": "globe",
        "title": "Regional Strategy Matrix",
        "body": "Map competitor strength and design grades across target states and countries dynamically."
      },
      {
        "icon": "plus-circle",
        "title": "Market Gaps Detection",
        "body": "Spot underserved visual preferences or promotional voids in target regions to launch counter-campaigns."
      },
      {
        "icon": "shield",
        "title": "Competitor Strength Index",
        "body": "Identify highly entrenched operators to refine acquisition spend strategies and protect margins."
      }
    ]
  },
  "marketing-roi-attribution": {
    "cat": "attribution",
    "slug": "marketing-roi-attribution",
    "icon": "pie-chart",
    "label": "Marketing ROI",
    "cardTitle": "Marketing ROI Attribution",
    "cardSummary": "Correlate marketing yield directly with competitor promotions and onboarding design changes.",
    "kicker": "Attribution",
    "title": "Marketing ROI Attribution",
    "lede": "Correlate marketing yield directly with competitor promotions and onboarding design changes.",
    "metrics": [
      {
        "num": "+46%",
        "label": "True Marketing ROI Lift"
      },
      {
        "num": "$4.85M",
        "label": "Budget Reallocated"
      },
      {
        "num": "3x",
        "label": "Attribution Speed"
      },
      {
        "num": "40x",
        "label": "ROI on Platform Investment"
      }
    ],
    "manifesto": "Isolate true campaign impact. Determine how competitor deposit boosts and copywriting pivots influence your regional acquisition yield and CPA rates.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Marketing attribution is broken, relying on last-click attribution that ignores competitor promotions and regional UX quality, causing massive budget waste.",
    "solutionPara": "Cortex correlates competitor promotional richness and internal UX scores with campaign yield to reveal true marketing contribution.",
    "solutionFoot": "Chief Marketing Officers use Cortex to justify marketing mix updates and defend acquisition budgets.",
    "capabilities": [
      {
        "icon": "pie-chart",
        "title": "CPA Correlation Engine",
        "body": "Correlate customer acquisition cost fluctuations against competitor campaign shifts and bonus variables."
      },
      {
        "icon": "gift",
        "title": "Promo Richness Modeling",
        "body": "Measure player acquisition yields against rival bonus and wagering conditions using proprietary Cortex models."
      },
      {
        "icon": "shield",
        "title": "Yield Protection Planning",
        "body": "Refine campaign budgets when competitor promo richness spikes to protect overall marketing ROAS."
      }
    ]
  },
  "cross-channel-attribution": {
    "cat": "attribution",
    "slug": "cross-channel-attribution",
    "icon": "split",
    "label": "Cross-Channel",
    "cardTitle": "Cross-Channel Attribution",
    "cardSummary": "Model competitor campaign impacts across digital programmatic, social, and search channels.",
    "kicker": "Attribution",
    "title": "Cross-Channel Attribution",
    "lede": "Model competitor campaign impacts across digital programmatic, social, and search channels.",
    "metrics": [
      {
        "num": "+46%",
        "label": "True Marketing ROI Lift"
      },
      {
        "num": "$4.85M",
        "label": "Budget Reallocated"
      },
      {
        "num": "3x",
        "label": "Attribution Speed"
      },
      {
        "num": "40x",
        "label": "ROI on Platform Investment"
      }
    ],
    "manifesto": "Gain complete cross-channel foresight. Map competitor campaign footprints to understand where acquisition spend is most defensive and high-yielding.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Programmatic, affiliate, and search budgets operate in siloes, leaving operators blind to the combined impact of competitive moves across channels.",
    "solutionPara": "Cortex integrates competitor promotion streams with cross-channel spend data to model the defensive strength of each channel.",
    "solutionFoot": "Heads of Acquisition use Jurnii cross-channel data to balance programmatic bids with CRM retention campaigns.",
    "capabilities": [
      {
        "icon": "split",
        "title": "Channel Footprint Analysis",
        "body": "Map competitor campaign footprints across programmatic, search, and social dynamically."
      },
      {
        "icon": "dollar-sign",
        "title": "Spend Efficiency Audits",
        "body": "Identify channels where rival promo richness is driving customer acquisition spikes to re-allocate funds."
      },
      {
        "icon": "sliders",
        "title": "Defensive Budgeting",
        "body": "Calibrate cross-channel spend strategies based on real-time competitor campaign shifts to defend market share."
      }
    ]
  },
  "marketing-mix-modeling-attribution": {
    "cat": "attribution",
    "slug": "marketing-mix-modeling-attribution",
    "icon": "bar-chart-3",
    "label": "Marketing Mix Modeling",
    "cardTitle": "Marketing Mix Modeling Attribution",
    "cardSummary": "Feed structured, clean competitor promotional metrics directly into local analytics data warehouses.",
    "kicker": "Attribution",
    "title": "Marketing Mix Modeling Attribution",
    "lede": "Feed structured, clean competitor promotional metrics directly into local analytics data warehouses.",
    "metrics": [
      {
        "num": "+46%",
        "label": "True Marketing ROI Lift"
      },
      {
        "num": "$4.85M",
        "label": "Budget Reallocated"
      },
      {
        "num": "3x",
        "label": "Attribution Speed"
      },
      {
        "num": "40x",
        "label": "ROI on Platform Investment"
      }
    ],
    "manifesto": "Build automated, data-driven marketing models. Streamline competitor promotional tracking data to feed custom predictive models and yield optimization boards.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Data scientists waste 80% of their time scraping and normalizing competitor data instead of modeling budget allocation and incrementality.",
    "solutionPara": "Jurnii streams clean competitor data straight into local data warehouses, ready for direct MMM processing.",
    "solutionFoot": "Chief Marketing Officers use Cortex MMM pipes to provide board-ready marketing yield models.",
    "capabilities": [
      {
        "icon": "database",
        "title": "Structured Data Pipes",
        "body": "Export competitor campaign histories via automated JSON or CSV feeds into local datastores."
      },
      {
        "icon": "bar-chart-3",
        "title": "Predictive Spend Engines",
        "body": "Model acquisition yields based on historical regional competitor promo patterns and media footprints."
      },
      {
        "icon": "network",
        "title": "Cortex API Integration",
        "body": "Synchronize local player analytics databases with comprehensive competitor datasets for causal modeling."
      }
    ]
  },
  "market-growth-attribution": {
    "cat": "attribution",
    "slug": "market-growth-attribution",
    "icon": "trending-up",
    "label": "Market Growth",
    "cardTitle": "Market Growth Attribution",
    "cardSummary": "Attribute regional user acquisition and market share gains to visual design updates.",
    "kicker": "Attribution",
    "title": "Market Growth Attribution",
    "lede": "Attribute regional user acquisition and market share gains to visual design updates.",
    "metrics": [
      {
        "num": "+46%",
        "label": "True Marketing ROI Lift"
      },
      {
        "num": "$4.85M",
        "label": "Budget Reallocated"
      },
      {
        "num": "3x",
        "label": "Attribution Speed"
      },
      {
        "num": "40x",
        "label": "ROI on Platform Investment"
      }
    ],
    "manifesto": "Prove design return on investment. Quantify how resolved player journey friction directly translates into market share gains and user onboarding yields.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Design and product teams struggle to prove the direct revenue contribution of usability improvements to the board, stalling investment.",
    "solutionPara": "Cortex models player signup yield fluctuations against resolved Jurnii UX audit findings, proving design ROI.",
    "solutionFoot": "Chief Product Officers deploy UX ROI models to secure investment for core product infrastructure.",
    "capabilities": [
      {
        "icon": "trending-up",
        "title": "UX ROI Attribution",
        "body": "Correlate design system improvements directly with customer onboarding rates and registration yields."
      },
      {
        "icon": "globe",
        "title": "Regional Growth Logs",
        "body": "Audit market share growth following targeted usability and visual refinement sprints in specific states."
      },
      {
        "icon": "award",
        "title": "Executive Yield Summaries",
        "body": "Present structured design and commercial conversion correlations directly to product and finance leadership."
      }
    ]
  },
  "conversion-rate-optimization": {
    "cat": "optimization",
    "slug": "conversion-rate-optimization",
    "icon": "percent",
    "label": "Conversion Rate",
    "cardTitle": "Conversion Rate Optimization",
    "cardSummary": "Isolate and repair player conversion leaks inside high-security registration and deposit funnels.",
    "kicker": "Optimization",
    "title": "Conversion Rate Optimization",
    "lede": "Isolate and repair player conversion leaks inside high-security registration and deposit funnels.",
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
    "manifesto": "Maximize player signup yields. Calibrate checkout fields, security badges, and layout aesthetics to minimize abandonment and accelerate active conversions.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Minor UX details in registration and KYC checkpoints cause silent abandonment, draining marketing budgets and driving up CPA.",
    "solutionPara": "Jurnii UX identifies exact usability issues, ranking them by severity so development teams can clear funnels immediately.",
    "solutionFoot": "Heads of UX use conversion optimization to optimize mobile flows and outpace competitors.",
    "capabilities": [
      {
        "icon": "percent",
        "title": "Friction Minimization",
        "body": "Isolate and remove fields causing player dropoffs during verification, KYC, and first deposit."
      },
      {
        "icon": "layout",
        "title": "Checkout Redesigns",
        "body": "Adopt verified, high-converting checkout grids and deposit button configurations to clear paths."
      },
      {
        "icon": "check-circle",
        "title": "A/B Benchmark Sprints",
        "body": "Validate interface revisions directly against leading sportsbook portals under real user conditions."
      }
    ]
  },
  "life-time-value-optimization": {
    "cat": "optimization",
    "slug": "life-time-value-optimization",
    "icon": "heart",
    "label": "Life Time Value",
    "cardTitle": "Life Time Value Optimization",
    "cardSummary": "Boost player loyalty and retention by auditing layout usability and visual experience.",
    "kicker": "Optimization",
    "title": "Life Time Value Optimization",
    "lede": "Boost player loyalty and retention by auditing layout usability and visual experience.",
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
    "manifesto": "Protect customer lifetime value. Audit post-login betting boards, loyalty perks UI, and deposit ease to build deep visual trust and engagement.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "iGaming players hold multiple accounts, and will immediately defect if their post-login betting experience is slow, laggy, or confusing.",
    "solutionPara": "Jurnii UX benchmarks post-login dashboards and reward pages, highlighting layout upgrades that secure player loyalty.",
    "solutionFoot": "Heads of CRM use usability audits to build high-converting reward pages and VIP dashboards.",
    "capabilities": [
      {
        "icon": "heart",
        "title": "Retention Audits",
        "body": "Isolate usability friction points causing player churn post-registration during daily active bet cycles."
      },
      {
        "icon": "award",
        "title": "Loyalty UI Evaluation",
        "body": "Optimize presentation of player clubs, loyalty milestones, and reward claims to maximize engagement."
      },
      {
        "icon": "activity",
        "title": "Engagement Logs",
        "body": "Monitor betslip usability, payout speed parameters, and deposit pathways systematically."
      }
    ]
  },
  "churn-rate-optimization": {
    "cat": "optimization",
    "slug": "churn-rate-optimization",
    "icon": "user-minus",
    "label": "Churn Rate",
    "cardTitle": "Churn Rate Optimization",
    "cardSummary": "Identify and prevent customer loss by analyzing competitor promotions and onboarding updates.",
    "kicker": "Optimization",
    "title": "Churn Rate Optimization",
    "lede": "Identify and prevent customer loss by analyzing competitor promotions and onboarding updates.",
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
    "manifesto": "Combat player churn proactively. Track competitor retention campaigns and usability enhancements that are pulling players away from your platform.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "Traditional retention strategies are reactive, attempting to recover players with expensive bonus cash only after they have already defected.",
    "solutionPara": "Jurnii 360 warns CRM teams when competitors deploy highly generous retention offers, enabling timely defensive pricing and margin calibration.",
    "solutionFoot": "Chief Commercial Officers deploy churn alerts to protect active margins in aggressive markets.",
    "capabilities": [
      {
        "icon": "user-minus",
        "title": "Competitor Move Warnings",
        "body": "Receive alerts when rivals introduce high-richness loyalty promos or sports boosts in your region."
      },
      {
        "icon": "plus-circle",
        "title": "Product Gap Analysis",
        "body": "Isolate product features rivals are deploying to secure active customer retention and prevent churn."
      },
      {
        "icon": "sliders",
        "title": "Margin Calibration Sprints",
        "body": "Re-calibrate payout metrics to protect yields and NGR when competitor churn triggers spike."
      }
    ]
  },
  "customer-aquistion-cost-optimization": {
    "cat": "optimization",
    "slug": "customer-aquistion-cost-optimization",
    "icon": "shopping-bag",
    "label": "Customer Acquisition Cost",
    "cardTitle": "Customer Aquistion Cost Optimization",
    "cardSummary": "Decrease player acquisition costs by resolving player onboarding friction and optimizing layouts.",
    "kicker": "Optimization",
    "title": "Customer Aquistion Cost Optimization",
    "lede": "Decrease player acquisition costs by resolving player onboarding friction and optimizing layouts.",
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
    "manifesto": "Achieve acquisition efficiency. Lower overall customer acquisition cost by securing registration pathways and optimizing welcome offer layouts using data-backed designs.",
    "challengeEyebrow": "The iGaming Challenge",
    "challengeTitle": "Operating Blind in a Saturated Market",
    "challengePara": "High customer acquisition costs (CAC) drain marketing budgets, eroding operator NGR and GGR in highly competitive regions.",
    "solutionPara": "Jurnii UX and Jurnii 360 optimize landing pages and signup paths, ensuring every marketing click translates to a successful active player conversion.",
    "solutionFoot": "Chief Marketing Officers use CAC optimization to optimize digital campaigns and improve media ROAS.",
    "capabilities": [
      {
        "icon": "shopping-bag",
        "title": "CPA Reduction Engine",
        "body": "Correlate resolved player journey friction directly with reduced marketing CPA and higher yields."
      },
      {
        "icon": "layout",
        "title": "Welcome Page Optimization",
        "body": "Refine landing zone layouts, button spacing, typographic clarity, and trust badges systematically."
      },
      {
        "icon": "sliders",
        "title": "Promo Calibrators",
        "body": "Deploy ideal signup bonuses and wagering rules calculated to lower customer CAC while protecting margins."
      }
    ]
  }
};
