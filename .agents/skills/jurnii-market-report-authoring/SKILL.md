---
name: "Jurnii Market Report Authoring"
description: "Authoring evidence-led Jurnii Market Reports across three product lenses and seven analytical templates with strict claim provenance and commercial grammar."
---

# Jurnii Market Report Authoring Skill

Use this skill when drafting or revising a Jurnii Market Report (`medium: Market Report`) in Markdown for the Jurnii Library (`content/library/`).

---

## 1. Prerequisites & Gate Checks

Before drafting:
1. **Evidence Manifest Verification**: A verified `evidence-manifest.json` produced by the research skill must exist and validate cleanly.
2. **Valid Lens/Format Pair**: Verify that the declared `reportLens` and `reportFormat` match one of the seven approved combinations:
   - `jurnii-ux` + `full-market`
   - `jurnii-ux` + `brand-comparison`
   - `jurnii-ux` + `change-detection`
   - `jurnii-360` + `full-market`
   - `jurnii-360` + `brand-comparison`
   - `combined` + `full-market`
   - `combined` + `brand-comparison`
3. **No Scripted Copy Generation**: All report narratives, executive findings, and teardowns must be directly authored by the agent. Automated scripts may only parse data, compute formulas, or validate structure.

---

## 2. Seven Structural Template Contracts

Select the template matching the report's lens and format. Do not improvise layout or skip sections.

### Template 1: UX / Full Market (`jurnii-ux` + `full-market`)
```markdown
## Executive summary
<!-- 3-5 high-impact findings pairing UX scores with commercial consequences -->

## 1. Market UX landscape & leaderboard
<!-- Full cohort scoreboard table: overall UX score, rank, change -->

## 2. Category performance: Journeys, Usability, Performance, Perception
<!-- Comparative breakdown across the 4 Jurnii UX dimensions -->

## 3. Top performer vs laggard: interface deep dive
<!-- Paired visual evidence, interface teardown, cognitive friction points -->

## 4. [Conditional] Cohort-wide journey friction
<!-- Triggered only if data shows a shared journey weakness across all brands -->

## 5. Commercial implications for conversion and retention
<!-- Translation of UX leakage into FTDs, CAC waste, churn, and NGR -->

## 6. Executive decision backlog & what to watch
<!-- 3-5 prioritized recommendations for CPO/Head of UX -->

## Methodology, telemetry dates & limitations
<!-- Audit date, environment, device profiles, score definitions -->
```

### Template 2: UX / Brand Comparison (`jurnii-ux` + `brand-comparison`)
```markdown
## Executive summary
<!-- Central comparative thesis and verdict between the two comparison units -->

## 1. Head-to-head performance scorecard
<!-- Side-by-side dimension table for Unit A vs Unit B -->

## 2. Journey-by-journey breakdown
<!-- Registration, KYC, Deposit, Betting, Withdrawal, Support -->

## 3. Critical interface contrasts
<!-- Paired screenshots illustrating key friction points -->

## 4. Where Unit A leads / Where Unit B leads
<!-- Objective evaluation of competitive moats and vulnerabilities -->

## 5. Commercial fallout: defection risk and CAC yield
<!-- Impact of experience differences on multi-homing player defection -->

## 6. Product roadmap priorities
<!-- Urgent fixes for the trailing operator -->

## Methodology & comparability disclosures
<!-- Measurement window, device parity, limitations -->
```

### Template 3: UX / Change Detection (`jurnii-ux` + `change-detection`)
```markdown
## Executive summary
<!-- Most consequential UX movements over the bounded observation window -->

## 1. Detection window & change inventory
<!-- Table of detected interface, journey, or architectural changes -->

## 2. Before / after visual evidence
<!-- Dated paired screenshots showing the exact design/flow modification -->

## 3. Telemetry movement by brand
<!-- Measured shift in Journey Effectiveness, Usability, or Performance scores -->

## 4. Cross-brand design patterns
<!-- Industry-wide trends and emerging UX conventions -->

## 5. Commercial exposure & hypotheses
<!-- Anticipated impact on conversion velocity or retention -->

## 6. What to monitor in the next cycle
<!-- Key signals and upcoming feature launches to watch -->

## Methodology & detection protocol
<!-- Observation cadence, verification criteria, limitations -->
```

### Template 4: 360 / Full Market (`jurnii-360` + `full-market`)
```markdown
## Executive summary
<!-- Core commercial patterns across the promotional calendar -->

## 1. Promotional market structure & volume
<!-- Total offers tracked, brand distribution, event frequency -->

## 2. Promo Richness Index & Share of Voice
<!-- Intensity-weighted SoPV league table vs raw volume -->

## 3. Mechanic & product mix
<!-- Odds boosts, deposit match, free bets, casino reloads, bet builders -->

## 4. Generosity vs margin conceded
<!-- Analysis of headline boost percentages vs actual bookmaker margin given -->

## 5. Cadence, event windows & timing patterns
<!-- Launch timing curves leading into key sporting fixtures -->

## 6. Commercial implications for trading & marketing
<!-- Margin dilution risks vs recreational acquisition yields -->

## Methodology, taxonomy & observation window
<!-- Detection rules, SoPV formula, observation dates, limitations -->
```

### Template 5: 360 / Brand Comparison (`jurnii-360` + `brand-comparison`)
```markdown
## Executive summary
<!-- Strategic contrast between the two commercial playbooks -->

## 1. Commercial proposition scorecard
<!-- Head-to-head metrics: volume, generosity, Promo Richness Index, SoPV -->

## 2. Strategic contrasts: Volume vs precision
<!-- Detailed comparison of promotional philosophy and execution -->

## 3. Offer mechanics and wagering terms
<!-- Bonus types, qualification criteria, rollover requirements -->

## 4. Creative velocity and messaging
<!-- Hero banner rotations, campaign themes, acquisition hooks -->

## 5. Commercial consequences for hold rate & CAC
<!-- Who is overpaying for voice; who is protecting margin -->

## 6. Counter-promotional playbook
<!-- Actionable tactical moves for commercial leadership -->

## Methodology & window alignment
<!-- Normalised time windows, tracking parameters, limitations -->
```

### Template 6: Combined / Full Market (`combined` + `full-market`)
```markdown
## Executive summary
<!-- Central thesis integrating commercial radar with experience delivery -->

## 1. The Proposition vs Experience positioning matrix
<!-- 2x2 map: Promotional Generosity vs UX Score -->

## 2. Acquisition pressure: Jurnii 360 commercial stream
<!-- SoPV, promotional intensity, bonus spending by operator -->

## 3. Retention reality: Jurnii UX experience stream
<!-- Onboarding friction, cashier drop-off, journey effectiveness -->

## 4. The acquisition-experience disconnect
<!-- Operators who overspend on marketing while leaking players in the funnel -->

## 5. Integrated commercial economics
<!-- Net acquisition efficiency, true player yield, margin impact -->

## 6. Executive strategic decisions
<!-- Rebalancing marketing spend into UX engineering -->

## Dual methodology, alignment & freshness disclosures
<!-- Disclosed observation periods for both streams, alignment caveats -->
```

### Template 7: Combined / Brand Comparison (`combined` + `brand-comparison`)
```markdown
## Executive summary
<!-- Cross-product verdict on Brand A vs Brand B -->

## 1. Dual-lens commercial scorecard
<!-- Paired metrics: 360 Voice/Generosity alongside UX Quality -->

## 2. Commercial promise (Jurnii 360)
<!-- Promotional campaigns, bonus promises, acquisition aggression -->

## 3. Digital delivery (Jurnii UX)
<!-- Actual player onboarding, deposit journey, and usability -->

## 4. Alignment & disconnect analysis
<!-- Evaluating promise-versus-delivery gaps for both operators -->

## 5. Commercial verdict: Sustainable vs subsidized growth
<!-- Long-term economic viability of the two strategies -->

## 6. Integrated intervention plan
<!-- Coordinated commercial and product recommendations -->

## Provenance, alignment & data disclosures
<!-- Dual evidence manifest mapping and limitations -->
```

---

## 3. Lens-Specific Call-to-Action (CTA)

Every report must conclude with a specific CTA matching its product lens:

### Jurnii UX CTA
```markdown
---

### Benchmark your product experience

Jurnii UX gives product leaders continuous visibility into competitive journey performance across 300+ operators. Identify registration bottlenecks, payment friction, and retention hurdles before they impact your NGR.

[**Request a UX Audit Walkthrough**](/contact) · [Explore Jurnii UX](/products/jurnii-ux)
```

### Jurnii 360 CTA
```markdown
---

### Monitor every competitor promotion in real time

Jurnii 360 tracks live promotional activity, odds boosts, creative messaging, and generosity metrics across the market. Never again be two weeks behind a competitor move.

[**Request a 360 Intelligence Briefing**](/contact) · [Explore Jurnii 360](/products/jurnii-360)
```

### Combined Intelligence CTA
```markdown
---

### Unify promotional intelligence with experience benchmarking

Combined Jurnii intelligence connects what competitors launch with how your digital product delivers. Stop leaking acquisition spend in the onboarding funnel.

[**Book a Strategic Intelligence Demonstration**](/contact)
```

---

## 4. Strict Editorial Rules & Voice

1. **British English**: *optimise, prioritise, categorised, behaviour, modelling*.
2. **Calm Authority**: Objective, evidence-bound, senior commercial tone. No exclamation marks.
3. **No Body H1**: The frontend template automatically renders the H1 from front matter `title`. Start Markdown body with `## Executive summary`.
4. **No Unicode Em Dashes (`—`)**: Use standard hyphens (`-`), colons, commas, or parentheses.
5. **No Unsupported Superlatives or Buzzwords**: Prohibit "revolutionary", "game-changing", "seamless", "delightful", "leverage" (as verb), "holistic", "best-in-class".
6. **No Vague Dates**: Never write "recently", "current", "latest", or "last month" without explicit date bounds (e.g. "Between 1 July and 31 July 2026").
