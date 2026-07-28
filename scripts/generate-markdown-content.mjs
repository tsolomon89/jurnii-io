import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// Feature slugs from feature-data.jsx
const features = [
  { slug: 'brand-design-themes', title: 'Brand Design Themes', category: 'Brand', desc: 'Evaluate brand design themes and visual identity across competitor operators.' },
  { slug: 'brand-market-trends', title: 'Brand Market Trends', category: 'Brand', desc: 'Identify macro visual and promotional trends across digital betting markets.' },
  { slug: 'brand-meta-scoring', title: 'Brand Meta Scoring', category: 'Brand', desc: 'Weighted composite scoring of brand proposition strength and clarity.' },
  { slug: 'brand-perfomance', title: 'Brand Technical Performance', category: 'Brand Performance', desc: 'Technical performance audits assessing latency, asset loads, and responsiveness.' },
  { slug: 'brand-performance', title: 'Brand Performance Overview', category: 'Brand Performance', desc: 'Comprehensive benchmarking of technical experience, trust, and conversion.' },
  { slug: 'brand-preception', title: 'Brand Perception & Trust', category: 'Brand Performance', desc: 'Evaluate trust markers, security seals, and perceived brand reliability.' },
  { slug: 'brand-promotion-analysis', title: 'Brand Promotion Analysis', category: 'Brand', desc: 'Deconstruct promotion richness, wagering terms, and bonus mechanics.' },
  { slug: 'brand-recommendations', title: 'Brand Recommendations Engine', category: 'Brand Performance', desc: 'Prioritised UX and commercial recommendations ranked by revenue impact.' },
  { slug: 'brand-usability', title: 'Brand Usability Benchmarking', category: 'Brand Performance', desc: 'Usability heuristic scoring across desktop and mobile customer journeys.' },
  { slug: 'brand', title: 'Brand Intelligence Overview', category: 'Brand', desc: 'Meta scoring, trends, themes, and promotion richness analysis.' },
  { slug: 'competitor-ai-insights', title: 'Competitor AI Insights', category: 'Competitor Feed', desc: 'AI-synthesised competitive alerts and strategy briefs.' },
  { slug: 'competitor-alerts', title: 'Competitor Real-Time Alerts', category: 'Competitor Feed', desc: 'Slack and email alerts the moment a rival launches or changes a campaign.' },
  { slug: 'competitor-analysis', title: 'Competitor Analysis Suite', category: 'Competitor', desc: 'Automated daily monitoring and parsing of competitor promotion structures.' },
  { slug: 'competitor-comparison', title: 'Competitor Comparison Engine', category: 'Competitor', desc: 'Side-by-side comparison sprints across competitor promo portfolios.' },
  { slug: 'competitor-feed', title: 'Competitor Intelligence Feed', category: 'Competitor Feed', desc: 'Continuous surveillance layer surfacing competitor moves as they go live.' },
  { slug: 'competitor-live-feed', title: 'Competitor Live Feed', category: 'Competitor Feed', desc: 'Live stream of competitor offer updates, odds changes, and campaign tweaks.' },
  { slug: 'competitor-offer-feed', title: 'Competitor Offer Feed', category: 'Competitor Feed', desc: 'Real-time offer feed capturing welcome packages, reload bets, and free spins.' },
  { slug: 'competitor-positioning', title: 'Competitor Positioning Map', category: 'Competitor', desc: 'Mapping how rivals position themselves across regulated jurisdictions.' },
  { slug: 'competitor-promotions', title: 'Competitor Promotions Index', category: 'Competitor', desc: 'Database of daily competitor promotion capture with structured metadata.' },
  { slug: 'competitor', title: 'Competitor Intelligence Overview', category: 'Competitor', desc: 'Parse promotions, positioning, and analysis across your peer operator set.' },
];

const solutions = [
  { slug: 'attribution', title: 'Attribution & Yield Modeling', category: 'Attribution', desc: 'Correlate media spend with true incremental yield using causal models.' },
  { slug: 'benchmarking', title: 'Interface & UX Benchmarking', category: 'Benchmarking', desc: 'Score interfaces, player journeys, and market position against peers.' },
  { slug: 'churn-rate-optimization', title: 'Churn Rate Optimization', category: 'Optimization', desc: 'Defend against churn by identifying rival retention offers and friction points.' },
  { slug: 'competition-discovery', title: 'Competition Discovery', category: 'Competition', desc: 'Discover new entrants and track brand portfolio changes in regulated markets.' },
  { slug: 'competition-offers', title: 'Competition Offer Tracking', category: 'Competition', desc: 'Benchmark competitor welcome bonuses, reload offers, and odds boosts.' },
  { slug: 'competition-postitioning', title: 'Competition Positioning Analysis', category: 'Competition', desc: 'Track rival positioning strategies across acquisition and retention channels.' },
  { slug: 'competition-pricing', title: 'Competition Pricing Calibrator', category: 'Competition', desc: 'Calibrate sportsbook odds margins and promo richness against market leaders.' },
  { slug: 'competition', title: 'Competition Intelligence Suite', category: 'Competition', desc: 'Map rivals, offers, pricing, and positioning across every market.' },
  { slug: 'conversion-rate-optimization', title: 'Conversion Rate Optimization (CRO)', category: 'Optimization', desc: 'Lift registration-to-deposit conversion by resolving benchmarked friction.' },
  { slug: 'cross-channel-attribution', title: 'Cross-Channel Attribution', category: 'Attribution', desc: 'Decompose cross-channel acquisition impact beyond last-click shortcuts.' },
  { slug: 'customer-aquistion-cost-optimization', title: 'CAC Optimization', category: 'Optimization', desc: 'Lower acquisition cost by aligning promo mechanics with organic conversion.' },
  { slug: 'customer-journey-benchmarking', title: 'Customer Journey Benchmarking', category: 'Benchmarking', desc: 'Benchmark sign-up, deposit, bet, and withdrawal journeys step-by-step.' },
  { slug: 'life-time-value-optimization', title: 'LTV Optimization', category: 'Optimization', desc: 'Protect player lifetime value through tailored reload incentives and smooth UX.' },
  { slug: 'market-growth-attribution', title: 'Market Growth Attribution', category: 'Attribution', desc: 'Isolate organic market growth from marketing-driven acquisition yield.' },
  { slug: 'market-positioning-benchmarking', title: 'Market Positioning Benchmarking', category: 'Benchmarking', desc: 'Compare brand positioning and market share of voice against direct peers.' },
  { slug: 'marketing-mix-modeling-attribution', title: 'MMM Attribution', category: 'Attribution', desc: 'iGaming-native Bayesian media mix modeling incorporating bonus inputs.' },
  { slug: 'marketing-roi-attribution', title: 'Marketing ROI Attribution', category: 'Attribution', desc: 'Attribute true marketing ROI across digital, offline, and sponsorship channels.' },
  { slug: 'optimization', title: 'Commercial Optimization Suite', category: 'Optimization', desc: 'Lift conversion, LTV, retention, and CPA across customer touchpoints.' },
  { slug: 'user-experience-benchmarking', title: 'UX Benchmarking', category: 'Benchmarking', desc: 'Replace UX opinion with 60+ objective heuristic criteria per journey.' },
  { slug: 'user-interface-benchmarking', title: 'UI Benchmarking', category: 'Benchmarking', desc: 'Evaluate visual design clarity, typography, and interface component consistency.' },
];

const useCases = [
  { slug: 'cmo', title: 'Chief Marketing Officer (CMO)', category: 'Roles', desc: 'Defensible marketing ROI, media mix optimization, and competitor awareness.' },
  { slug: 'coo', title: 'Chief Operating Officer (COO)', category: 'Roles', desc: 'Operational velocity, cross-department alignment, and market expansion insights.' },
  { slug: 'cco', title: 'Chief Commercial Officer (CCO)', category: 'Roles', desc: 'NGR growth, bonus spend efficiency, and competitive margin protection.' },
  { slug: 'smb', title: 'Challenger & SMB Operators', category: 'Company Size', desc: 'Agile market intelligence to outmaneuver legacy incumbents.' },
  { slug: 'midmarket', title: 'Mid-Market Operators', category: 'Company Size', desc: 'Scale acquisition efficiency and defend market share against Tier 1 groups.' },
  { slug: 'enterprise', title: 'Enterprise & Multi-Brand Groups', category: 'Company Size', desc: 'Consolidated multi-jurisdiction intelligence for Tier 1 operators.' },
  { slug: 'marketing', title: 'Marketing Teams', category: 'Departments', desc: 'Campaign performance tracking, channel attribution, and promotional benchmarks.' },
  { slug: 'commercial', title: 'Commercial Teams', category: 'Departments', desc: 'Bonus optimization, price boost tracking, and competitor offer analysis.' },
  { slug: 'product', title: 'Product & Design Teams', category: 'Departments', desc: 'Evidenced-based UX scorecards, friction elimination, and journey benchmarking.' },
  { slug: 'igaming', title: 'iGaming Operators', category: 'Sectors', desc: 'Purpose-built intelligence for sportsbooks, online casinos, and gaming portals.' },
  { slug: 'ecommerce', title: 'eCommerce Platforms', category: 'Sectors', desc: 'Benchmarking checkout flows, payment friction, and conversion funnels.' },
  { slug: 'fintech', title: 'FinTech Applications', category: 'Sectors', desc: 'Onboarding journey audits, KYC friction scoring, and app UX optimization.' },
];

function writeMd(dir, items, refType) {
  fs.mkdirSync(dir, { recursive: true });
  for (const item of items) {
    const filePath = path.join(dir, `${item.slug}.md`);
    if (fs.existsSync(filePath)) continue;
    const content = `---
title: ${item.title}
description: ${item.desc}
category: ${item.category}
order: 10
productRefs: [jurnii-360, jurnii-ux, jurnii-mmm]
---

# ${item.title}

${item.desc}

## Overview

When betting portals share identical platform configurations, user experience and promotional mechanics are the only durable barriers to player defection.

### Key Operational Capabilities

- **Automated Intelligence**: Continuous surveillance and real-time structured updates.
- **Objective Benchmarking**: Replace subjective opinion with verified commercial facts.
- **Decision-Grade Insights**: Surface actionable recommendations directly for commercial and product roadmaps.
`;
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

writeMd(path.join(root, 'content/www/features'), features, 'feature');
writeMd(path.join(root, 'content/www/solutions'), solutions, 'solution');
writeMd(path.join(root, 'content/www/use-cases'), useCases, 'use-case');

console.log('Markdown content generation complete.');
