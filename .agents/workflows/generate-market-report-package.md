---
title: "Generate Market Report Package"
description: "The complete, orchestrated end-to-end workflow to research, author, validate, and package a Jurnii Market Report and its linked long-form social content."
---

# Generate Market Report Package Workflow

Use this workflow to produce an authoritative Jurnii Market Report and its linked social media package. Every step must be executed in strict sequence.

---

## Workflow Execution Steps

### Step 1: Select Valid Lens and Format Pair
Verify the combination is one of the seven allowed pairs:
- `jurnii-ux` + `full-market`
- `jurnii-ux` + `brand-comparison`
- `jurnii-ux` + `change-detection`
- `jurnii-360` + `full-market`
- `jurnii-360` + `brand-comparison`
- `combined` + `full-market`
- `combined` + `brand-comparison`

> 🛑 **STOP CONDITION 1 (Invalid Combination)**: If an invalid combination is proposed (e.g. `jurnii-360` + `change-detection`, or accidental mixing of UX and 360 without declaring `combined`), halt immediately.

### Step 2: Define Scope, Comparison Units & Thesis Question
1. State the market scope (e.g. `GB` or `BR`).
2. Identify comparison units:
   - For `full-market`: verify $\ge 3$ distinct comparison units within the single declared market.
   - For `brand-comparison`: verify exactly 2 distinct comparison units.
   - For `change-detection`: verify $\ge 1$ named unit with dated before/after observation windows.
3. Formulate the core thesis question (e.g., "Why does promotional intensity fail to translate into customer retention in the UK market?").

> 🛑 **STOP CONDITION 2 (Cardinality / Window Mismatch)**: If fewer than 3 brands exist for full-market, or units do not match brand-comparison cardinality, or detection window lacks baseline data, halt and request cohort adjustment.

### Step 3: Browse Live Application (`https://app.jurnii.io`)
1. Activate browser subagent.
2. Navigate to `https://app.jurnii.io`.
3. If `reportLens` is `jurnii-ux`, inspect `https://app.jurnii.io/user-reports`.
4. If `reportLens` is `jurnii-360`, inspect `https://app.jurnii.io/c360/...`.
5. If `reportLens` is `combined`, inspect both areas.

> 🛑 **STOP CONDITION 3 (Authentication Failure)**: If the app redirects to `/auth` or demands login credentials, record the authentication blocker immediately. Do not guess credentials, bypass security, or silently substitute stale Quill archives as current.

### Step 4: Inventory Sources & Select Newest Comparable Telemetry
1. Enumerate available reports, scores, and date ranges.
2. Select the newest **comparable** evidence across the cohort.
3. For Combined reports: verify both UX and 360 data exist for the cohort with aligned observation windows.

> 🛑 **STOP CONDITION 4 (Missing Stream in Combined)**: If either UX or 360 telemetry is missing for the target brands, abort Combined execution. Do not manufacture cross-product claims.

### Step 5: Extract Structured Data & Visual Assets
1. Pull scoreboard metrics, category scores, journey evaluations, and recommendations directly from the DOM.
2. Extract promotional counts, Promo Richness Index, boost volumes, and mechanic distributions.
3. Crop and capture interface comparisons, charts, or scorecards.
4. Stage raw captures outside Git tracking (e.g. in `.tmp/`).

> 🛑 **STOP CONDITION 5 (Private / PII Exposure)**: If any capture contains internal session keys, cookies, or player PII, discard immediately and recapture cleanly.

### Step 6: Build & Validate Evidence Manifest
1. Construct `evidence-manifest.json` under `.agents/context/market-reports/evidence/` or the report's asset folder.
2. Populate `sources`, `metrics`, `calculations`, `images`, and `claims`.
3. Verify every claim links to at least one valid source.

### Step 7: Formulate Falsifiable Thesis & Key Findings
1. Formulate 3–5 executive findings based strictly on the evidence manifest.
2. Ensure every finding pairs an observable metric with a commercial consequence (FTDs, NGR, CAC, churn, margin).

### Step 8: Author Markdown Report
1. Select the format template from `.agents/skills/jurnii-market-report-authoring/SKILL.md`.
2. Draft the report in `content/library/<slug>.md`.
3. Adhere to British English, calm authority, no body H1, no Unicode em dashes, and explicit date bounds.
4. **Strict Content Boundary**: Do **NEVER** include internal repo paths (e.g. `/.agents/context/...`), manifest dumps, or authenticated platform URLs in the Markdown body. Public reports present executive-facing industry intelligence and conclude with the approved lens-specific commercial CTA.
5. Include the lens-specific CTA (Section 3 of authoring skill).

### Step 9: Process Public-Safe Visual Assets
1. Place approved images into `assets/library/<slug>/`.
2. Embed figures with descriptive captions and semantic alt text.
3. Confirm all assets are approved for public release.

### Step 10: Validate & Inspect Rendered Report
1. Run deterministic market report validation:
   ```bash
   npm run validate:reports
   ```
2. Verify heading hierarchy, metadata conformance, link resolution, and banned phrase absence.
3. Run `npm run build` to verify manifest compilation and Vite bundling.

### Step 11: Author Linked Social Package
1. Activate `.agents/skills/jurnii-market-report-social/SKILL.md`.
2. Draft at least two distinct long-form LinkedIn posts:
   - **Post 1 (Flagship)**: Core thesis, market tension, and performance map.
   - **Post 2 (Focused)**: Specific journey teardown, mechanic contrast, or change event.
3. Save as `social-package.json` alongside the report or in `.agents/context/market-reports/social/`.

### Step 12: Validate Social Package Against Evidence Manifest
1. Run automated social verification:
   - Every statistic maps to a valid `claimId`.
   - Asset IDs resolve to approved images.
   - Post status set to `draft` until final commercial approval.

### Step 13: Final Handoff & Governance Record
1. Document report metadata, as-of dates, and refresh triggers.
2. Note any required public publication sign-offs.
3. Summarize all generated assets in the handoff.
