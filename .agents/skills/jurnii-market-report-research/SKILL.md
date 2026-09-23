---
name: "Jurnii Market Report Research"
description: "Browser-led source discovery, UX/360 inventory separation, Combined alignment, structured data and image capture, provenance, and evidence ledgers for Jurnii market reports."
---

# Jurnii Market Report Research Skill

Use this skill when discovering, selecting, capturing, and validating product data for Jurnii Market Reports from the live Jurnii application (`https://app.jurnii.io`) or historical recovery archives.

---

## 1. Source Hierarchy & Authentication Protocol

1. **Primary Authority: `https://app.jurnii.io`**
   - Live Jurnii application. All current market reports must derive their evidence from authenticated application sessions.
   - **Browser Navigation Protocol**: Use browser automation tools to inspect live navigation, dashboards, and report libraries.
   - **No Credential Bypassing**: Never invent routes, guess stale URLs, bypass authentication, or request credentials in chat or files.
   - **Authentication Blocker Protocol**: If an authenticated session is unavailable or redirects to a login wall (`/auth`), stop the live-data phase and explicitly record the authentication blocker. Do NOT silently fall back to Quill and label it current.
2. **Secondary / Backfill Authority: `https://quill.jurnii.io` and repository Quill archives**
   - Located in `.agents/context/international-reports/` (dated 2026-08-03).
   - Use Quill strictly to recover historical baseline data, confirm provenance, or extend a time series. Every Quill-derived item must be explicitly marked with `isBackfill: true`.
3. **Tertiary Supporting Authority: External Primary Sources**
   - Public operator disclosures, regulatory filings (e.g. UKGC, SPA/MF Brazil), and earnings calls.
   - Permitted only for framing macroeconomic or regulatory context. Never substitute external commentary for Jurnii product telemetry.

---

## 2. Browser-Led Discovery Workflow

When operating in an authenticated browser session:

1. **Observe Navigation**: Document the current UI navigation paths for Jurnii UX and Jurnii 360.
2. **Enumerate Candidate Sources**:
   - Record UX and 360 inventories separately.
   - For every candidate report/screen, record:
     - `product`: `jurnii-ux` or `jurnii-360`.
     - `reportTitle` & `stableIdentifier`.
     - `comparisonUnit`: `{ brand, market }`.
     - `market`: e.g. `GB`, `BR`.
     - `attributes`: journey (e.g. `registration`, `deposit`), vertical, event, or mechanic.
     - `reportDate`: publication date (`YYYY-MM-DD`).
     - `analysisPeriod`: start and end dates (`YYYY-MM-DD`).
     - `lastUpdatedDate`: if exposed in the UI.
     - `captureTimestamp`: ISO-8601 string.
     - `locator`: safe URL without authentication tokens.
     - Available tables, scoreboards, metrics, and screenshots.
3. **Assess Recency & Comparability**:
   - Select the newest **comparable** evidence across the chosen cohort.
   - Reject mismatched time windows unless explicitly normalised.
   - For `full-market`: verify that at least 3 comparison units in the target market share a uniform or normalised observation window.
   - For `brand-comparison`: verify that both comparison units have aligned measurement periods.
   - For `change-detection` (UX only): verify dated before and after observations exist for each evaluated unit.
4. **Structured Data Extraction**:
   - Extract raw tables and metrics into JSON format.
   - Visually verify axis labels, legends, units (e.g. percentage points vs percent, currency), and brand mappings.
5. **Image & Screenshot Capture**:
   - Where authorized, capture focused crops of interface elements, scorecards, or charts.
   - Do NOT take full-screen captures displaying browser tabs, internal session data, or user profiles.
   - Stage raw captures in `.tmp/` or an ignored directory outside Git tracking.
   - Convert approved visual assets to public-safe derivatives in `assets/library/<slug>/` with descriptive filenames.

---

## 3. Evidence Ledger Construction

Before drafting prose, construct an **Evidence Manifest** (`evidence-manifest.json`):

```json
{
  "manifestVersion": "1.0.0",
  "reportSlug": "ux-uk-onboarding-benchmarks-q3-2026",
  "reportLens": "jurnii-ux",
  "reportFormat": "full-market",
  "sources": [
    {
      "id": "SRC-001",
      "system": "app.jurnii.io",
      "product": "jurnii-ux",
      "reportTitle": "UK Tier 1 Sportsbook Onboarding Audit",
      "stableIdentifier": "ux-audit-uk-q3-2026",
      "comparisonUnit": { "brand": "Brand A", "market": "GB" },
      "market": "GB",
      "reportDate": "2026-08-15",
      "analysisPeriod": { "start": "2026-07-01", "end": "2026-07-31" },
      "captureTimestamp": "2026-09-23T10:00:00Z",
      "locator": "https://app.jurnii.io/ux/benchmarks/uk-sportsbooks",
      "metrics": [
        { "id": "M-01", "name": "Registration Effectiveness", "value": 78, "unit": "/100", "dimension": "Journey Effectiveness" }
      ]
    }
  ],
  "calculations": [
    {
      "id": "CALC-001",
      "name": "Deposit Journey Gap",
      "formula": "Brand A Deposit Score - Brand B Deposit Score",
      "inputs": ["M-01", "M-02"],
      "output": 14,
      "unit": "points"
    }
  ],
  "images": [
    {
      "id": "IMG-001",
      "sourceId": "SRC-001",
      "path": "/assets/library/ux-uk-onboarding-benchmarks-q3-2026/registration-flow-contrast.png",
      "caption": "Comparison of registration form field density between Brand A and Brand B.",
      "alt": "Side by side interface screenshot showing 3 form fields versus 9 form fields.",
      "period": "July 2026",
      "approvalState": "approved",
      "isPublicSafe": true
    }
  ],
  "claims": [
    {
      "id": "CLM-001",
      "statement": "Brand A completed registration with 60% fewer fields than the cohort average.",
      "sourceIds": ["SRC-001"],
      "calculationIds": ["CALC-001"],
      "productProvenance": "jurnii-ux",
      "confidence": "high"
    }
  ],
  "approvalState": "draft"
}
```

---

## 4. Public Safety & Data Hygiene Check

Prior to releasing the evidence ledger to the authoring skill:
- Confirm no internal tokens, cookies, or session headers exist in URLs or manifests.
- Confirm no customer PII or unpublished confidential partner data is included.
- Verify that every image marked `isPublicSafe: true` has been inspected for confidential elements.
