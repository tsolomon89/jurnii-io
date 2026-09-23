---
name: "Jurnii Market Report Social"
description: "Transforming approved Jurnii Market Reports into defensible, high-value long-form LinkedIn posts and publication-safe visual asset plans."
---

# Jurnii Market Report Social Skill

Use this skill to transform an approved Jurnii Market Report into a structured, linked social package (`social-package.json`) and publication-ready LinkedIn long-form copy.

---

## 1. Social Package Requirements

Every market report must produce a linked social package containing **at least two materially distinct long-form LinkedIn posts**:
1. **Flagship Post**: Frames the overarching thesis, market performance map, and primary tension.
2. **Focused Post**: Deep-dives into one specific finding, journey breakdown, paired interface comparison, or change event.

### What Makes a Strong Jurnii LinkedIn Post
- **Evidence-Backed Hook**: Open with a surprising number, a sharp divergence, or a direct commercial point of view (Score 70+ on specificity and relevance).
- **Concrete Observations**: 2–4 short paragraphs pairing data points with commercial interpretation.
- **Standalone Substantive Value**: Deliver the actual insight directly in the post. Never withhold findings behind a clickbait teaser.
- **Visual Evidence**: Pair with approved charts, data scorecards, or cropped interface comparisons from the report's evidence ledger.
- **Closing Principle & Soft CTA**: Conclude with a memorable commercial rule followed by a low-friction CTA (e.g. "Full benchmark in comments" or "See how your platform compares").

### Editorial Prohibitions
- ❌ **NO Unicode Formatting**: Never use Unicode bold (`𝗳𝗼𝗼`), italic, or circled characters.
- ❌ **NO Generic Launch Clichés**: "We are excited to announce", "Thrilled to share", "Hot off the press", "Check out our latest report".
- ❌ **NO Hashtag Spam**: Maximum 2 relevant industry hashtags (e.g. `#iGaming #ProductDesign` or `#SportsBetting`).
- ❌ **NO Unsupported Claims**: Every statistic must link to a valid `claimId` in the report's evidence manifest.

---

## 2. Default Angles by Report Format

| Report Format | Post 1 (Flagship Angle) | Post 2 (Focused Angle) |
|---|---|---|
| **UX / full-market** | The market leaderboard and the divergence between brand reputation and UX delivery. | The weakest cohort-wide journey (e.g. cashier friction) with paired screenshot teardown. |
| **UX / brand-comparison** | Defensible head-to-head verdict: why Brand A outperforms Brand B. | One critical journey comparison (e.g. registration field density or KYC speed). |
| **UX / change-detection** | The dominant digital product shift observed across the period. | One consequential before/after interface change and its impact on conversion. |
| **360 / full-market** | The market's promotional intensity map: volume vs Share of Promotional Voice (SoPV). | One standout mechanic, pricing strategy, or margin-defense playbook. |
| **360 / brand-comparison** | Strategic contrast: volume-led bonus spending vs disciplined margin protection. | Detailed breakdown of bonus mechanics, wagering terms, or release cadence. |
| **Combined / full-market** | The acquisition-experience disconnect: operators spending millions on offers while leaking players at deposit. | One integrated case study showing how UX friction destroyed promotional ROI. |
| **Combined / brand-comparison** | The holistic commercial verdict: sustainable product-led growth vs subsidised acquisition. | Cross-product alignment analysis for one named brand. |

---

## 3. Social Package JSON Contract (`social-package.json`)

```json
{
  "packageVersion": "1.0.0",
  "reportSlug": "ux-uk-onboarding-benchmarks-q3-2026",
  "reportTitle": "UK Sportsbook Onboarding Benchmarks, Q3 2026",
  "reportLens": "jurnii-ux",
  "reportFormat": "full-market",
  "posts": [
    {
      "id": "POST-01",
      "channel": "linkedin",
      "postType": "flagship",
      "angle": "Leaderboard divergence: why brand scale does not equal journey quality",
      "targetAudience": "CPO, Head of UX, CMO",
      "asOfDate": "July 2026",
      "body": "In UK sports betting, market share does not protect you from journey friction.\n\nWe benchmarked 5 tier-1 UK sportsbooks across 11 core conversion journeys in July 2026. The results show a striking divergence:\n\n• The market's scale leader sits 4th on overall journey effectiveness (67/100).\n• A mid-tier challenger leads the cohort at 74/100, driven by a 2-step registration flow.\n• The biggest drop-off occurs at the cashier: deposit journey scores averaged just 52/100 across all five books.\n\nIn a multi-homing market where 70% of bettors hold accounts with 3+ operators, cognitive friction at deposit is not a retry. It is an immediate switch to a competitor.\n\nWhen player acquisition costs £100+ per registration, an unoptimised cashier is the most expensive line on your P&L.\n\nFull benchmark data and interface teardowns linked below.",
      "claimIds": ["CLM-001", "CLM-002"],
      "assets": [
        {
          "assetId": "IMG-001",
          "caption": "UK Sportsbook Onboarding Scoreboard (July 2026)",
          "alt": "Leaderboard table comparing 5 UK sportsbooks across UX categories",
          "order": 1
        }
      ],
      "cta": {
        "text": "Inspect the full benchmark and journey scorecard",
        "destination": "https://www.jurnii.io/library/ux-uk-onboarding-benchmarks-q3-2026"
      },
      "status": "draft"
    },
    {
      "id": "POST-02",
      "channel": "linkedin",
      "postType": "focused",
      "angle": "Cashier friction teardown: the 4-step deposit hurdle",
      "targetAudience": "Head of Product, Product Managers",
      "asOfDate": "July 2026",
      "body": "Most operators think their registration flow is their primary onboarding hurdle.\n\nOur July 2026 audit across 5 UK tier-1 sportsbooks tells a different story. Registration averaged 71/100. Deposit averaged 52/100.\n\nWhere the leak occurs:\n\n1. Premature verification: 3 of 5 operators demand document upload before displaying available payment methods.\n2. Payment method clutter: 4 operators display 8+ payment options without ordering by player relevance.\n3. Missing trust signals: Only 1 operator displays instant withdrawal confirmation at the point of deposit.\n\nRemoving two unnecessary steps from the cashier flow improves FTD conversion by 3-5%—adding hundreds of thousands in NGR every quarter without spending another penny on media.\n\nExperience is your acquisition multiplier.\n\nFull teardown and screenshots in the report below.",
      "claimIds": ["CLM-003", "CLM-004"],
      "assets": [
        {
          "assetId": "IMG-002",
          "caption": "Paired screenshot teardown of cashier deposit selectors",
          "alt": "Side by side interface contrast of streamlined vs cluttered deposit screens",
          "order": 1
        }
      ],
      "cta": {
        "text": "Read the complete cashier journey analysis",
        "destination": "https://www.jurnii.io/library/ux-uk-onboarding-benchmarks-q3-2026"
      },
      "status": "draft"
    }
  ]
}
```

---

## 4. Publication Verification Gate

Before marking any post `approved`:
1. Verify every claim in `claimIds` resolves to an existing claim in `evidence-manifest.json`.
2. Confirm the natural language `asOfDate` accurately matches the telemetry observation period.
3. Confirm all assets are present in the public tree, have approved captions/alt-text, and contain no private or sensitive data.
4. If any data point lacks public publication approval, keep `status: draft`.
