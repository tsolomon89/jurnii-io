# Jurnii Market Report & Social Content System: Canonical Specification

> **Authority Statement**: This document is the single canonical authority for the definition, taxonomy, evidence standards, authoring structure, social pipeline, and lifecycle of all Jurnii Market Reports. It supersedes all previous regional-report guidelines, including the legacy Quill-derived taxonomy in `.agents/context/international-reports/` and earlier draft specifications.

---

## 1. Core Definition & Philosophy

A Jurnii Market Report package is:

> **A time-bounded, evidence-led comparative analysis of the iGaming market through a declared Jurnii product lens, delivered as both a site report and a set of long-form social posts that make useful, defensible value statements.**

### Core Tenets
1. **Product-Led, Not Geography-Led**: Geography is a scope or comparison dimension (e.g. `market: GB` or `market: BR`), never the content taxonomy. "UK report" or "Brazil report" is not a valid report type without declaring the product lens, format, observation window, comparison set, and analytical thesis.
2. **Evidence-Bounded**: Every finding, figure, table, and screenshot must be traceable to authenticated product telemetry from Jurnii's intelligence layer (`app.jurnii.io`).
3. **No Decorative Analysis**: Every section, chart, and comparison must serve a commercial purpose and lead to an actionable decision for an operator executive (CPO, CMO, CCO, CEO).
4. **Social Output is a First-Class Deliverable**: A report is not complete without its linked social package containing at least two distinct long-form LinkedIn posts that deliver immediate standalone value.

---

## 2. Taxonomy: Three Lenses and Seven Formats

The system defines exactly **three analytical lenses** and **seven allowed lens/format combinations**. Any other combination is invalid and will be rejected by automated validators.

| Product Lens | Format Key | Cardinality Requirement | Intended Analysis |
|---|---|---|---|
| **Jurnii UX** (`jurnii-ux`) | `full-market` | Exactly 1 market; $\ge 3$ distinct comparison units | Side-by-side leaderboard across three or more brands in one market; shows stronger and weaker performers with screenshot evidence; deepens conditionally into journeys or categories when cohort-wide weakness is evident. |
| **Jurnii UX** (`jurnii-ux`) | `brand-comparison` | Exactly 2 distinct comparison units (same or cross-market) | Head-to-head evaluation between two units (e.g. Brand A vs Brand B in UK, or Brand A / UK vs Brand A / Brazil), with journey/category deep dives and paired interface screenshots. |
| **Jurnii UX** (`jurnii-ux`) | `change-detection` | $\ge 1$ named comparison unit with before/after evidence | Material digital experience changes observed over a bounded period (typically 30–90 days); requires dated before/after telemetry and interface captures. |
| **Jurnii 360** (`jurnii-360`) | `full-market` | Exactly 1 market; $\ge 3$ distinct comparison units | Market-wide view of competitor promotional activity, Promo Richness Index, Share of Promotional Voice (SoPV), and cadence across a normalised observation window. |
| **Jurnii 360** (`jurnii-360`) | `brand-comparison` | Exactly 2 distinct comparison units | Head-to-head commercial proposition evaluation: bonus generosity, odds boost mechanics, release timing, creative cadence, and targeting differences. |
| **Combined** (`combined`) | `full-market` | Exactly 1 market; $\ge 3$ distinct comparison units with aligned UX & 360 data | Deliberately commissioned cross-product analysis answering one central thesis. Connects promotional proposition with experience delivery. UX and 360 data remain traceable before synthesis. |
| **Combined** (`combined`) | `brand-comparison` | Exactly 2 distinct comparison units with aligned UX & 360 data | Two comparison units assessed across both UX quality and commercial activity. Synthesises proposition-versus-experience alignment and commercial implications without unsupported causal claims. |

### Rule on Product Mixing vs Combined
- **Pure Lens Integrity**: An ordinary `jurnii-ux` report must NOT introduce promotional volume, odds boost margin conceded, or SoPV metrics. An ordinary `jurnii-360` report must NOT introduce heuristic usability scores or journey effectiveness ratings.
- **Accidental Mixing is Prohibited**: Past reports that combined promotional tracking and UX audits without declaring a Combined contract represent architectural drift and are strictly invalid.
- **Combined Must Be Explicit**: Cross-product evidence is permitted **only** when `reportLens: combined` is explicitly declared with `productRefs: ['jurnii-ux', 'jurnii-360']`, and both evidence streams are tracked with product-level provenance.

---

## 3. Comparison-Unit Semantics

A **comparison unit** is an instance of a brand in a specific market, represented structurally as:
```yaml
brand: string    # e.g. "bet365"
market: string   # ISO 3166-1 alpha-2 or approved code, e.g. "GB", "BR"
```

### Implications
- **Same-Brand / Cross-Market**: Comparing `bet365 / GB` against `bet365 / BR` is a valid `brand-comparison` because the comparison units differ by market.
- **Brand vs Brand / Same Market**: Comparing `Betano / BR` against `Novibet / BR` is a valid `brand-comparison`.
- **Identity Uniqueness**: Two comparison units in a report must differ by brand, market, or both.
- **Full Market Uniformity**: In a `full-market` format, all comparison units must share the single declared market of the cohort.

---

## 4. Source Hierarchy & Ingestion Rules

1. **Primary Source**: Authenticated `https://app.jurnii.io`. All current reports must derive their principal evidence from live platform databases, scoreboards, and telemetry.
2. **Secondary / Backfill Source**: `https://quill.jurnii.io` and the historical Quill repository artifacts (`.agents/context/international-reports/`). Quill is strictly for historical backfill, time-series extension, or recovery when noted. It must **never** be presented as current live telemetry.
3. **External Context**: Primary public regulatory filings, corporate announcements, or operator earnings reports. External sources may provide macroeconomic or regulatory context but **cannot** replace Jurnii product telemetry.

### Provenance Tracking
Every data point in a report must record:
- `sourceId`: Unique reference (e.g. `SRC-001`).
- `system`: `app.jurnii.io`, `quill.jurnii.io` (marked `isBackfill: true`), or `external`.
- `product`: `jurnii-ux` or `jurnii-360`.
- `captureTimestamp`: ISO-8601 timestamp of extraction.
- `analysisPeriod`: Defined start and end dates (`YYYY-MM-DD`).
- `locator`: Safe URL path (free of session tokens, passwords, or temporary parameters).

---

## 5. Seven Structural Report Templates

Every report must strictly follow the analytical sequence of its format contract. Do NOT flatten these into generic article sections.

### Template 1: UX / Full Market (`jurnii-ux` + `full-market`)
1. **Report Header & Metadata**: Title, thesis statement, cohort definition, analysis period, as-of date.
2. **Executive Scoreboard & Leaderboard**: Side-by-side UX index scores, rank orders, top performer, laggard.
3. **Category Breakdown**: Journey Effectiveness, Usability, Performance, Perception comparison table.
4. **Top & Bottom Analysis**: Deep dive into the strongest and weakest performers with interface screenshots.
5. **Cohort-Wide Journey Deep Dive (Conditional)**: Triggered only if cohort-wide weakness is detected (e.g. deposit friction across all brands).
6. **Commercial Consequences**: Impact on FTDs, drop-off, player churn, and estimated revenue leakage.
7. **Executive Decision Backlog & Watch List**: 3–5 prioritised actions for product leadership.
8. **Methodology & Data Freshness**: Audit date, browser/device environment, limitations.
9. **Jurnii UX Call-to-Action**: Soft, specific invitation for a tailored UX audit walkthrough.

### Template 2: UX / Brand Comparison (`jurnii-ux` + `brand-comparison`)
1. **Report Header & Metadata**: The two comparison units, thesis question, observation window.
2. **Head-to-Head Scorecard**: Side-by-side dimension comparison (Journey, Usability, Performance, Perception).
3. **Journey Gap Analysis**: Direct comparison across Registration, KYC, Deposit, Betting, Withdrawal, Help.
4. **Paired Screenshot Walkthrough**: Visual evidence of interface contrast for critical friction points.
5. **Where Unit A Wins / Where Unit B Wins**: Clear, objective delineation of strengths and vulnerabilities.
6. **Commercial Implications**: Comparative CAC efficiency, retention defensibility, and switching vulnerability.
7. **Actionable Roadmap**: What the trailing operator must fix first.
8. **Methodology & Freshness**: Telemetry dates, comparison calibration, limitations.
9. **Jurnii UX Call-to-Action**.

### Template 3: UX / Change Detection (`jurnii-ux` + `change-detection`)
1. **Report Header & Metadata**: Bounded detection window (start date to end date), monitored brand(s), core thesis.
2. **Change Inventory Summary**: Table of detected interface, flow, or performance changes.
3. **Before / After Interface Evidence**: Paired dated screenshots showing exact digital modifications.
4. **Impact Assessment by Brand**: Measured movement in Journey Effectiveness, Usability, or Performance scores.
5. **Cross-Brand Patterns & Hypotheses**: Recurring industry design shifts framed with commercial hypotheses.
6. **Commercial Exposure**: How the observed changes alter conversion speed or player retention.
7. **Monitoring Watch List**: Signals and journeys to track in the subsequent audit cycle.
8. **Methodology & Detection Protocol**: Capture intervals, verification steps, limitations.
9. **Jurnii UX Call-to-Action**.

### Template 4: 360 / Full Market (`jurnii-360` + `full-market`)
1. **Report Header & Metadata**: Market scope, exact observation window, total promotions tracked, thesis.
2. **Market Promotional Landscape**: Overview of promotion volume, event distribution, and active brand count.
3. **Promo Richness Index & SoPV League Table**: Share of Promotional Voice vs activity volume.
4. **Mechanic & Product Mix**: Distribution of deposit bonuses, odds boosts, free bets, casino reloads, bet builders.
5. **Generosity vs Margin Conceded**: Analysis of boost size vs margin handed to the player.
6. **Event Windows & Cadence Patterns**: Launch timing leading up to major fixtures or weekends.
7. **Commercial Implications for Trading & CRM**: Risk of margin dilution vs lost recreational share of voice.
8. **Methodology, Taxonomy & Freshness**: Scraping/detection parameters, SoPV formula, limitations.
9. **Jurnii 360 Call-to-Action**: Invitation to evaluate competitor promotional radar.

### Template 5: 360 / Brand Comparison (`jurnii-360` + `brand-comparison`)
1. **Report Header & Metadata**: The two comparison units, aligned observation window, thesis.
2. **Commercial Proposition Scorecard**: Total offers, Promo Richness Index, average boost size, SoPV.
3. **Strategic Contrasts**: Volume play vs margin discipline; early release cadence vs last-minute boosts.
4. **Mechanic Breakdown**: Comparative bonus types, wagering restrictions, and sport/gaming focus.
5. **Creative & Messaging Positioning**: Banner velocity, hero messaging, and acquisition hook comparison.
6. **Commercial Fallout**: Which book is paying more for its voice and which protects hold rate.
7. **Tactical Recommendations**: Counter-promotional moves for commercial teams.
8. **Methodology & Observation Dates**: Window normalization, calculation formulas.
9. **Jurnii 360 Call-to-Action**.

### Template 6: Combined / Full Market (`combined` + `full-market`)
1. **Report Header & Metadata**: Market scope, aligned time window, dual-product thesis statement.
2. **The Proposition vs Experience Matrix**: 2x2 positioning map (Promotional Generosity vs UX Quality).
3. **Commercial Radar (Jurnii 360 Stream)**: Promotional volume, SoPV, and acquisition aggression.
4. **Delivery Reality (Jurnii UX Stream)**: Onboarding effectiveness, cashier friction, and retention barriers.
5. **Cross-Product Synthesis**: Identifying operators who over-spend on acquisition only to leak FTDs in the funnel.
6. **Integrated Commercial Consequences**: Net acquisition ROI, leaky bucket quantification, true player yield.
7. **Executive Decision Matrix**: Strategic guidance for C-suite on rebalancing promotional budget into UX.
8. **Dual Methodology, Freshness & Alignment Disclosures**: Exact time windows for both streams and any caveats.
9. **Combined Intelligence Call-to-Action**: Cross-product executive briefing request.

### Template 7: Combined / Brand Comparison (`combined` + `brand-comparison`)
1. **Report Header & Metadata**: Two comparison units, dual-product thesis, aligned observation period.
2. **Dual-Lens Scorecard**: Side-by-side comparison of Commercial Voice (360) and Experience Execution (UX).
3. **Commercial Promise (Jurnii 360)**: What each brand promises to the market (offers, boosts, creative).
4. **Product Reality (Jurnii UX)**: What the player actually experiences across key conversion funnels.
5. **Alignment & Disconnect Analysis**: Where Brand A aligns or fails; where Brand B aligns or fails.
6. **Commercial Verdict**: Sustainable customer acquisition vs unsustainable margin subsidisation.
7. **Integrated Roadmap**: Harmonised product and promotional interventions.
8. **Dual Methodology & Provenance**: Evidence ledger mapping for both UX and 360 claims.
9. **Combined Intelligence Call-to-Action**.

---

## 6. Social Content Contract (First-Class Output)

Every publishable market report **must** have a linked social package containing at least two materially distinct long-form LinkedIn posts:
1. **Flagship Post**: Translates the report's central thesis, market map, and tension into a high-impact narrative.
2. **Focused Post**: Deep-dives into one specific finding, journey breakdown, head-to-head contrast, or change event.

### Editorial Guidelines for Social Posts
- **Evidence-Led Hook**: Open with a specific number, surprising divergence, or sharp commercial tension. Score 70+ on specificity and relevance.
- **Concrete Observations**: Pair every opinion or insight with concrete data or an observable interface behaviour.
- **Short Paragraphs & Cadence**: Varied rhythm, clean bullet points, readable on mobile devices.
- **Standalone Value**: Deliver real analytical substance in the post itself rather than withholding insights behind a clickbait link.
- **No Fluff or Platitudes**: Banish generic announcements ("We are pleased to share..."), Unicode bold/italic gimmicks, or unsubstantiated hype.
- **Claim Traceability**: Every figure in the post must map to a `claimId` in the report's evidence ledger.
- **Visual Assets**: Paired with approved, publication-safe screenshots, charts, or carousels.

### Default Social Angles by Format

| Format Key | Flagship Angle | Focused Angle |
|---|---|---|
| UX / full-market | The market performance map and its clearest winner/laggard tension | The weakest cohort-wide journey or a revealing screenshot contrast |
| UX / brand-comparison | A defensible head-to-head verdict | One journey or category teardown with paired screenshots |
| UX / change-detection | The most consequential pattern across the period's changes | One specific before/after change and its commercial consequence |
| 360 / full-market | The market's dominant promotional or commercial pattern | One standout mechanic, timing decision, or brand strategy |
| 360 / brand-comparison | The strategic contrast between the two commercial playbooks | One offer, richness, cadence, creative, or targeting difference |
| Combined / full-market | The strongest market-level tension between proposition and experience | One integrated opportunity or mismatch supported by both products |
| Combined / brand-comparison | The cross-product head-to-head verdict | One brand's commercial/experience alignment or disconnect |

---

## 7. Machine-Checkable Data Contracts

### Report Front Matter Contract
```yaml
medium: Market Report
reportLens: jurnii-ux | jurnii-360 | combined
reportFormat: full-market | brand-comparison | change-detection
productRefs:
  - jurnii-ux     # exactly ['jurnii-ux'] for UX, ['jurnii-360'] for 360, ['jurnii-ux', 'jurnii-360'] for Combined
analysisPeriod:
  start: YYYY-MM-DD
  end: YYYY-MM-DD
asOf: YYYY-MM-DD
sourceCapturedAt: ISO-8601 timestamp
comparisonMode: snapshot | delta | trajectory | event-window | before-after
cohort:
  comparisonUnits:
    - brand: string
      market: string
  markets:
    - string
evidenceManifest: relative/path/to/evidence-manifest.json
socialPackage: relative/path/to/social-package.json
dataFreshnessNote: string
publicationStatus: draft | approved
isIndexable: boolean
```

---

## 8. Public Safety & Data Governance

1. **Public Repository Boundary**: The GitHub repository is public.
2. **Prohibited Artifacts**:
   - Raw authenticated DOM dumps containing bearer tokens, cookie headers, or internal session state.
   - Unreleased proprietary operator figures not approved for public citation.
   - PII of any kind (internal staff names, player accounts, customer support communications).
3. **Asset Handling**:
   - Raw browser captures must be staged in `.tmp/` or explicitly ignored directories outside the git tracking tree.
   - Only approved, cropped, publication-safe images may be placed into `assets/library/<slug>/`.
   - All visual assets must have explicit alt text, caption, source attribution, and approval state in the evidence ledger.

---

## 9. Lifecycle & Refresh Protocol

```
[Discovery & Selection]
       │
       ▼
[Evidence Ledger Build] ──► Fails Validation? ──► Abort / Request Access
       │
       ▼
[Markdown Report Authoring] (Strict Template Structure)
       │
       ▼
[Social Package Generation] (>= 2 Distinct Long-Form Posts)
       │
       ▼
[Deterministic Validation] ──► Fails Check? ──► Revise Prose / Data
       │
       ▼
[Publication Gate (Draft / Approved)]
       │
       ▼
[Refresh Trigger] (Quarterly or Major Event) ──► Re-run Discovery & Supersede
```

When new live platform data becomes available:
1. Re-run source discovery via `app.jurnii.io`.
2. If updating an existing report slug, record the previous edition in a historical archive manifest and note the refresh date.
3. If publishing a new time window, create a new slug (e.g. `q4-2026`), update relevant index cards, and set canonical references where appropriate.
