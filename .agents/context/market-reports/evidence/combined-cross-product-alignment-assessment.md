# Jurnii Cross-Product Alignment Assessment: UK Tier-1 Sportsbooks (Q3 2026)

## Purpose and Scope

This document synthesises empirical findings across **Jurnii UX** and **Jurnii 360** for the five UK operators where active telemetry exists concurrently in both platform databases as of September 2026:

1. **Midnite**
2. **Paddy Power**
3. **SkyCasino / SkyBet**
4. **William Hill**
5. **Ladbrokes**

In accordance with Jurnii's Canonical Market Report Specification, a **Combined** report lens is valid only when explicitly architected to triangulate product experience against commercial promotional strategy. This document establishes the empirical alignment and commercial thesis governing potential downstream Combined reporting.

---

## 1. Cross-Product Telemetry Matrix

The table below juxtaposes client-side user experience scores (Jurnii UX) against commercial promotional activity and boost volume (Jurnii 360) captured from live application telemetry:

| Operator | Jurnii UX Score (/100) | Technical Perf (/100) | Perception (/100) | UX Debt Recs | Active Promos (24h) | Active Boosts | Market Boost Share | Commercial Posture |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Midnite** | **78** (Good) | **87** | **79** | 108 | 8 | 101 | 9.0% | **Product-Led Challenger** |
| **Paddy Power** | **60** (Poor) | **35** | **63** | 129 | 13 | 66 | 5.9% | **Brand-Led Heritage** |
| **SkyBet** | **54** (Poor) | **44** | **38** | 193 | 12 | 129 | 11.5% | **Ecosystem / Media Hybrid** |
| **William Hill** | **49** (Poor) | **34** | **16** | **465** | 18 | **368** | **32.9%** | **Promotional Volume Maximiser** |
| **Ladbrokes** | **44** (Very Poor) | **45** | **15** | 159 | **29** | 230 | 20.6% | **Promotional Churn Defender** |

---

## 2. Core Strategic Finding: The Promotional Compensation Paradox

The most stark commercial conclusion arising from cross-product triangulation is an inverse relationship between product health and promotional aggression:

### The Heritage Subsidy Trap (William Hill & Ladbrokes)
- **William Hill** and **Ladbrokes** represent the two most aggressive promotional engines in the UK market:
  - Combined, they deploy **598 of the market's 1,117 active boosts** (**53.5% market share**).
  - Ladbrokes generates **29 active sports promotions** (and 75 total offers in 24 hours), the highest cadence in the UK.
  - William Hill alone provides **368 active price boosts** (32.9% of the total market).
- However, both brands anchor the very bottom of the Jurnii UX scoreboard:
  - William Hill registers a Jurnii UX score of **49/100**, burdened by **34/100** Technical Performance and an industry-high **465 UX debt recommendations**.
  - Ladbrokes records **44/100** (Very Poor), held down by a catastrophic **15/100** Customer Perception score and journey friction during mobile bet placement (**57/100**).
- **Commercial Diagnosis**: Heritage operators are utilizing expensive margin subsidies (odds boosts averaging +26% enhancement, £20–£30 Bet & Get bonuses) as an acquisition and retention crutch. They are forced to continuously over-compensate for technical latency, legacy form friction, and negative customer trust by paying bettors to remain on the platform.

### The Product-Led Efficiency Model (Midnite)
- **Midnite** operates at the exact opposite pole:
  - It leads the UX cohort with **78/100** overall, propelled by an outstanding **87/100** Performance rating (sub-1.8s mobile LCP) and strong customer sentiment (**79/100**).
  - Its promotional footprint is highly restrained: only **8 active campaigns** (less than a third of Ladbrokes' volume) and **101 boosts** (9.0% market share).
- **Commercial Diagnosis**: Midnite achieves player retention organically through application speed, interface fluidity, and minimal onboarding friction. It does not require continuous promotional subsidies to preserve engagement.

---

## 3. Financial Implications Under 40% Remote Gaming Duty

Under the UK's 40% duty regime, the promotional compensation model is structurally unsustainable:

1. **Compounding Gross Margin Leakage**: Offering 368 active boosts with an average +26% price uplift dramatically compresses the bookmaker's theoretical margin. When paired with a 40% duty on gross win, the margin cushion required to absorb adverse sporting outcomes is virtually eliminated.
2. **Paid Acquisition Waste**: When an operator spends £120+ to acquire a bettor through a promotional Bet & Get, but that bettor encounters an 11s–12.5s LCP (as at Paddy Power) or KYC submission errors (reflected in William Hill's 465 recommendations and 16/100 Perception), drop-off prior to first deposit destroys return on ad spend.
3. **The Retention Dividend**: For every point of UX improvement that reduces registration drop-off and cashier friction, operators can incrementally withdraw margin-diluting promotional subsidies without increasing customer churn.

---

## 4. Assessment for Future Combined Report Releases

This analysis proves that when Jurnii combines UX and 360 data, the result provides a unique commercial diagnostic unavailable from either product in isolation:

- **When to deploy a Combined Report**: When addressing C-suite leadership (CEOs, CFOs, Private Equity sponsors) where the central strategic question is capital allocation between marketing spend (promotions/bonuses) and engineering spend (product performance/UX).
- **Standard of Proof**: Any future Combined report must reference dual evidence manifests (one UX, one 360), demonstrate direct cohort brand overlap, and maintain strict analytical boundaries to prevent accidental category confusion.
