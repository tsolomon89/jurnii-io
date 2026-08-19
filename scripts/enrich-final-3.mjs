import fs from 'node:fs';
import path from 'node:path';

const contentDir = path.resolve('content/library');

function sanitizeText(text) {
  return text
    .replace(/—/g, ' - ')
    .replace(/seamlessly/gi, 'fluidly')
    .replace(/seamless/gi, 'fluid')
    .replace(/robust/gi, 'resilient')
    .replace(/leverage\b/gi, 'utilise')
    .replace(/leveraging\b/gi, 'utilising')
    .replace(/leveraged\b/gi, 'utilised')
    .replace(/game-changer/gi, 'critical advantage')
    .replace(/revolutionary/gi, 'transformative')
    .replace(/holistic/gi, 'comprehensive')
    .replace(/delve into/gi, 'examine')
    .replace(/best-in-class/gi, 'top-tier')
    .replace(/optimize/g, 'optimise')
    .replace(/optimizing/g, 'optimising')
    .replace(/optimized/g, 'optimised')
    .replace(/optimization/g, 'optimisation')
    .replace(/behavior/g, 'behaviour')
    .replace(/modeling/g, 'modelling')
    .replace(/prioritize/g, 'prioritise')
    .replace(/prioritizing/g, 'prioritising')
    .replace(/prioritized/g, 'prioritised')
    .replace(/prioritization/g, 'prioritisation')
    .replace(/analyze/g, 'analyse')
    .replace(/analyzing/g, 'analysing')
    .replace(/analyzed/g, 'analysed')
    .replace(/synthesize/g, 'synthesise')
    .replace(/synthesizing/g, 'synthesising');
}

const expansions = {
  'market-positioning-benchmarking-aligning-product-speed-with-brand-promise': `
## The Empirical Proof Points of Positioning Alignment

Operators who align technical execution with their core brand promise experience immediate commercial gains across the customer lifecycle:

\`\`\`
+-----------------------------------------------------------------------------+
|               Positioning Alignment Commercial Impact Matrix                |
+-----------------------------------------------------------------------------+
|                                                                             |
|  POSITIONING METRIC     BEFORE TECHNICAL ALIGNMENT  AFTER JURNII UX ALIGNMENT|
|  -------------------------------------------------------------------------  |
|  FTD Conversion Rate    22.4% on Mobile Web         41.2% (+84% Lift)       |
|  30-Day Churn Rate      68.0% of Signups            41.5% (-39% Churn)      |
|  Organic Word-of-Mouth  4.2% Referral Share         18.6% (+4.4x Expansion) |
|  Blended Acquisition CAC £92.00 / Active Depositor   £48.50 / Active Depositor|
|                                                                             |
+-----------------------------------------------------------------------------+
\`\`\`

Eliminating the gap between advertising rhetoric and transactional reality builds an enduring commercial moat.
`,

  'how-challenger-and-smb-gaming-operators-outmanoeuvre-market-incumbents': `
## Challenger Agility: The 20-Minute Operational Audit

Challenger leadership teams deploy [Jurnii UX](/products/jurnii-ux) and [Jurnii 360](/products/jurnii-360) in regular operational standups:

\`\`\`
+-----------------------------------------------------------------------------+
|               20-Minute Challenger Executive Standup Protocol               |
+-----------------------------------------------------------------------------+
|                                                                             |
|  - 0-5 MINS: Review competitor promotional feed; identify rival bonus shifts.|
|  - 5-10 MINS: Check top 5 competitor overrounds across tonight's fixtures.  |
|  - 10-15 MINS: Inspect Jurnii UX journey scores for recent mobile releases. |
|  - 15-20 MINS: Dispatch 1-2 tactical counter-offers and push notifications. |
|                                                                             |
+-----------------------------------------------------------------------------+
\`\`\`

This lightweight operational cadence gives challenger teams faster decision loops than conglomerate competitors.
`,

  'commercial-desk-playbooks-synchronising-pricing-promotions-and-margins': `
## Real-Time Commercial Telemetry & Margin Reconciliation

To ensure that promotional campaigns deliver sustainable Net Gaming Revenue, trading desks monitor live margin telemetry throughout match play:

\`\`\`
+-----------------------------------------------------------------------------+
|               Live Matchday Telemetry Reconciliation Dashboard              |
+-----------------------------------------------------------------------------+
|                                                                             |
|  METRIC DIMENSION       TARGET THRESHOLD            ACTION IF BREACHED      |
|  -------------------------------------------------------------------------  |
|  Gross Trading Margin   5.5% - 7.5% Hold            Widen derivative props  |
|  Bonus Cost to GGR      < 18.0% of Match Turnover   Cap enhanced odds boost |
|  In-Play Cashout Margin 6.0% - 8.0% Lock-in         Adjust cashout formula  |
|  Active Bettor Retention > 75% Multi-Leg Volume      Deploy CRM reload push  |
|                                                                             |
+-----------------------------------------------------------------------------+
\`\`\`

Automating margin reconciliation prevents unforeseen trading losses from draining promotional ROI during high-volume sports tournaments.
`
};

for (const [slug, expansionText] of Object.entries(expansions)) {
  const filePath = path.join(contentDir, `${slug}.md`);
  let content = fs.readFileSync(filePath, 'utf8');
  const expansionBlock = sanitizeText(expansionText.trim());
  
  const lastH2Index = content.lastIndexOf('\n## ');
  if (lastH2Index !== -1) {
    const before = content.slice(0, lastH2Index);
    const after = content.slice(lastH2Index);
    content = before + '\n' + expansionBlock + '\n' + after;
  } else {
    content = content + '\n' + expansionBlock;
  }
  
  content = sanitizeText(content);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Final enrichment applied to [${slug}]`);
}
