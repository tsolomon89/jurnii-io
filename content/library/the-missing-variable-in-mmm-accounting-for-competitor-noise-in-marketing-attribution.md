---
title: >-
  The Missing Variable in MMM: Accounting for Competitor Noise in Marketing
  Attribution
description: >-
  Marketing Mix Modeling (MMM) has become the standard framework for budget
  allocation in the online gaming sector. Operators use these statistical models
  to dete...
excerpt: >-
  Marketing Mix Modeling (MMM) has become the standard framework for budget
  allocation in the online gaming sector. Operators use these statistical models
  to dete...
date: '2026-05-10'
medium: Article
category: Econometrics
author: Mitch Vidler
tags:
  - Econometrics
  - iGaming
  - Intelligence
coverImage: /assets/library/the-missing-variable-in-mmm-accounting-for-competitor-noise-in-marketing-attribution/cover.png
isIndexable: true
---
# The Missing Variable in MMM: Accounting for Competitor Noise in Marketing Attribution

By Mitch Vidler, CCO

Marketing Mix Modeling (MMM) has become the standard framework for budget allocation in the online gaming sector. Operators use these statistical models to determine the optimal distribution of their marketing spend across digital acquisition channels, television advertising, sponsorship deals, and affiliate networks. However, the majority of these models suffer from a fundamental structural flaw: they analyze performance in a vacuum. 
By only ingesting internal data—such as media spend, impression volumes, and campaign timings—traditional models ignore the single largest driver of player behavior in iGaming. That driver is competitor activity. 
iGaming is a hyper-competitive, multi-homing market. Players do not make deposit decisions based solely on your marketing creative. They evaluate your offers against the active market set. 
If your attribution models do not account for competitor promotional volume, generosity shifts, and creative cycles, they will produce biased results. They attribute revenue fluctuations to the wrong variables, leading to incorrect budget decisions that dilute your marketing efficiency and compress your net gaming revenue (NGR).

## The Attribution Bias of Internal-Only Models

In statistical modeling, omitting a significant explanatory variable leads to omitted variable bias. In the context of iGaming attribution, this bias is severe. 
When your internal marketing dashboard shows a drop in first-time deposits (FTDs) or an increase in customer acquisition cost (CAC) during a specific week, your team typically searches for internal explanations. They analyze whether the creative is fatiguing, whether bidding algorithms are underperforming, or whether affiliate traffic quality has degraded. 
This internal-only analysis often leads to incorrect conclusions. 
For example, your model may determine that a paid search campaign has become less efficient, prompting you to cut its budget. In reality, the campaign's efficiency did not drop because of internal factors. It dropped because a primary competitor doubled their signup bonus generosity during that exact week, capturing the traffic you paid to attract. 
By failing to ingest external competitor metrics, your model attributes the performance decline to your paid search channel. This error leads to budget cuts on profitable channels, compounding your customer acquisition deficit and limiting long-term growth.

## Quantifying Competitor Noise in Multi-Homing Markets

To build an accurate attribution model, you must quantify competitor noise. In online gaming, this noise is not random; it is highly structured and commercially significant. 
Because 70% to 80% of players hold active accounts with 3 to 5 different operators, players are highly sensitive to relative promotional value. They continuously monitor their apps for the best odds, the lowest wagering requirements, and the richest promotions. 
If a competitor increases their Promo Richness Index score on football by 20%, your sportsbook acquisition efficiency will decline. This decline occurs even if your internal campaign execution is flawless. 
If your statistical model does not include this competitor generosity spike as an independent variable, the model cannot isolate the competitor's impact from your channel's baseline performance. 
The paid media channel is penalized for a market shift it could not control. To prevent this attribution error, you must feed structured, time-series competitor data directly into your modeling infrastructure. You must treat competitive activity as a core input rather than an external footnote.

## Structuring External Variables for MMM Ingestion

The primary barrier to including competitor activity in MMM has been data accessibility. Marketing science teams cannot ingest raw screenshots, PDF newsletters, or manual spreadsheet logs into a regression model. Statistical models require clean, continuous, and structured time-series data at the same temporal grain as your media spend—typically daily or weekly intervals. 
Jurnii 360 solves this data gap by converting unstructured competitor movements into structured, model-ready data exports. 
Jurnii 360 provides automated data feeds covering three key competitive variables:
- **Promo Volume:** The total count of active promotions and odds boosts run by each competitor daily.
- **Promo Richness Index:** Jurnii's proprietary score that quantifies the true generosity of competitor offers, factoring in wagering requirements and expiry terms.
- **Creative Cycles:** The frequency and timing of competitor banner updates and homepage layout shifts.
By exporting this data in structured CSV or JSON formats, your data science team can integrate competitor metrics directly into your MMM database. You can align competitor Promo Richness Index scores with your daily CPA and registration metrics, allowing your model to measure the precise mathematical relationship between competitor generosity and your acquisition volumes.

## The Statistical Impact: Improving R-squared and Model Accuracy

Adding competitive variables to your marketing mix models significantly improves their predictive power and accuracy. Jurnii’s research shows that including competitor Promo Richness Index scores reduces the residual error in attribution regressions, leading to more stable models. 
Specifically, operators who integrate competitive variables see their model's R-squared value increase, indicating a tighter fit between the model's predictions and actual performance. 
Furthermore, the inclusion of competitor data stabilizes the coefficient estimates for your internal media channels. When competitor noise is isolated, the model can calculate the true elasticity of your paid search, paid social, and affiliate spend. 
Attribution error rates drop by up to 15% when external competitive variables are included. 
This improvement in model accuracy has a direct commercial value. It ensures that your budget allocation recommendations are statistically valid, preventing you from over-investing in inefficient channels or cutting budgets on channels that are temporarily suppressed by competitor activity.

## Commercial Decision Enablement: Defending the Marketing Budget

Optimizing attribution models is not just a technical exercise; it is a tool for commercial decision enablement. It provides the CMO with the objective evidence needed to manage board-level discussions and defend marketing budgets. 
When acquisition volumes dip, pressure from the CFO to cut marketing spend increases. In an internal-only data environment, the CMO has few tools to explain the decline other than subjective assertions about market conditions. 
By utilizing Jurnii's MMM data exports, the marketing team can present a fact-based explanation. You can demonstrate that the acquisition dip was driven by a competitor's aggressive promotional campaign, rather than inefficient marketing execution. 
You can show that cutting your marketing budget would compound the acquisition deficit. Instead of panicking and reducing spend, you can maintain your long-term marketing investment, knowing that your channels remain structurally efficient once the competitor noise subsides. This visibility builds organizational trust and ensures stable, long-term commercial planning.

## Grounding Attribution in Market Reality

Attribution models that ignore the competitive landscape are incomplete and lead to incorrect budgeting decisions. To maximize your marketing ROI, you must ground your modeling in market reality. 
Stop assuming your campaigns run in isolation. Ingest structured competitive variables, calculate the Promo Richness Index of your rivals, and build competitor noise into your marketing mix models. 
Upgrade your attribution science, protect your marketing budget, and grow your NGR. 
Benchmark. Act. Outperform.
