---
report: Gaming1 – Netherlands Report Summary (Circus.nl)
operator: Circus (circus.nl) — Gaming1
region: Netherlands (NL)
type: Technical Analysis Report / Competitive Intelligence
date_range: July 2026 (Q2 2026)
version: v1 (Jul 28 2026)
cohort: Circus · Holland Casino · BetCity · Bet365 · Unibet
tags: [Competitive Intelligence, Technical Report, Data Classification, Frontend Architecture]
sources: Feature audit (~130 checks), Journey score matrix, Recommendations log (136 findings)
source_url: https://quill.jurnii.io/report/gaming1-netherlands-report-summary-v0u4t
folder: Public Reports
crawled: 2026-08-03
---

# Gaming1 / Circus.nl — Netherlands Competitive Position (Q2 2026)

**Headline:** Where Circus stands, and where to move next — a synthesis of the NL feature audit, the journey-score benchmark, and 136 UX/performance recommendations.

## Scorecard
- **Overall feature coverage:** #2 of 5 — a point-and-a-half behind Unibet; ahead of BetCity, Holland Casino, Bet365.
- **Overall journey score:** 64/100 — tied lowest with Holland Casino; Unibet and Bet365 both reach 72.
- **Weakest touch points:** Depositing and Playing Games (Casino), both 54/100 — Circus's lowest and lowest vs field.
- **Recommendations logged:** 136 findings (48 high, 63 medium, 25 low) across usability, journeys, perception, performance.

## Journey Score Matrix
Circus is at or below cohort average on 8 of 11 touch points. (Band: Very poor 0–45, Poor 46–60, Average 61–75, Good 76–90, Excellent 91–100.)

| Touch point | Circus.nl | Holland Casino | BetCity | Bet365 | Unibet | Average |
|---|---|---|---|---|---|---|
| Journey Score | 64 (±0) | 65 | 68 | 72 | 72 | 64 |
| Entry & Homepage | 57 (−22) | 68 | 71 | 77 | 83 | 79 |
| Registration | 55 (−13) | 74 | 78 | 82 | 80 | 68 |
| Signing-in | 58 (−7) | 63 | 56 | 61 | 65 | 65 |
| Finding Games (Casino) | 81 (+13) | 72 | 86 | 84 | 80 | 68 |
| Playing Games (Casino) | 54 (−1) | 50 | 50 | 54 | 63 | 55 |
| Finding Bets (Sportsbook) | 75 (+11) | 69 | 71 | 83 | 79 | 64 |
| Placing Bets (Sportsbook) | 81 (+8) | 79 | 78 | 85 | 84 | 73 |
| Depositing | 54 (−4) | 51 | 55 | 55 | 61 | 58 |
| Using Bonus & Promotions | 60 (−1) | 54 | 63 | 63 | 67 | 61 |
| Getting Help | 67 (+4) | 69 | 76 | 76 | 74 | 63 |

## Feature Audit — where gaps line up with weak journeys
Circus is #2 of 5 on overall feature coverage and **leads on compliance and trust**. Gaps concentrate in casino discovery, deposits, registration, and getting help.

### Where Circus leads (strengths)
- **[KSA] Only operator capping daily time limits at 6 hours** (Unibet/Holland Casino allow 8h).
- **[KYC] Hard KYC gate before first deposit** — BSN collected at registration; deposit blocked until verification clears (cleanest KSA-aligned gate).
- **[Withdrawals] KYC status shown before withdrawal amount entry** — eligibility surfaced upfront.
- **[Retention] Only clearly-explained VIP club** — tier, benefits, progress shown (rivals hide/omit).
- **[Unhappy flows] Cleanest error and declined-deposit handling** — reason-plus-retry path.

### Where Circus gives ground (gaps)
- **[Getting Help] No formal complaints or ADR escalation route** — #5 of 5; help off the persistent header; Dutch support only partial.
- **[Depositing] Thinnest payment set, no mobile payments** — 3 methods (tied fewest with Bet365); only brand with no mobile-payment option.
- **[Casino] No demo play, thin discovery** — no demo mode, weak provider/volatility/RTP filtering (lowest casino coverage).
- **[Registration] One long, unstepped form** — ~13 field groups in a single scroll, no bank-ID fast path (BetCity offers one-click iDIN).
- **[Account History] No net-spend or lifetime-net-position view** — deposits/withdrawals in separate tabs, no summary (RG/transparency gap).

### Feature-matrix coverage by category (Circus % of available points)
| Category | Circus coverage | Notes |
|---|---|---|
| Registration | 72% | No SSO; welcome bonus/verification only partial |
| Account & transaction history | 57% | No net-spend summary, no lifetime net position |
| Casino | 65% | Demo mode absent; filtering partial |
| Sportsbook | 80% | Strong; pre-submission confirmation only partial |
| Account access & login | 56% | No biometric/SSO, no "remember me", no self-serve closure |
| Verification & KSA compliance | 73% | Strong; mandatory limits before first deposit, 6h time cap |
| Bonus & promotions | 95% | Best category — wagering progress, missions, plain-language terms |
| VIP club | 27% (but only operator to show tier/benefits/progress) | T&Cs explanation missing |
| Cashier & deposits | 60% | No mobile payment, no crypto; iDEAL present |
| Withdrawals | 80% | KYC-before-amount strength; no instant/same-day |
| Game & betting features | 76% | 2UP, Bet Builder, SuperOdds present; no SuperSub/ScoreUp |
| Unhappy flows | 79% | Strong bet errors + declined-deposit retry |
| Getting help | 76% | No complaints/ADR route; Dutch support partial |

## Recommendations Log — 136 findings
Weighted toward journeys and performance (together 82% of the log).
- **By lens:** Journeys 67 · Performance 45 · Usability 19 · Perception 5.
- **By journey theme:** Sportsbook & betslip 51 · Help & support 32 · Casino & games 23 · Bonus & promotions 19 · Sign-in & security 13 · Registration 12 · Deposits 8.
- 48 high-severity findings concentrated in sportsbook, help centre, and page-speed work.

### Quick wins (low effort)
- Add required-field markers + inline specific errors (Registration, high impact).
- Replace generic login error copy ("Controleer je inloggegevens…") with field-specific guidance (Signing-in, high).
- Add "Ends in / Expires on" to every promo card (Bonus, high).
- Show min/max bet limits inline in betslip (Placing Bets, low).
- Increase prominence of stake input (Playing Games, low).
- Add short descriptions under Help Centre categories (Getting Help, medium).
- Make "+49 more markets" read/look interactive (Finding Bets, low).
- Add fee/total-charge disclosure before deposit confirmation (Depositing, high).

### Longer-term initiatives (high effort)
- Introduce **iDIN** as a registration alternative (biggest lever on registration friction).
- Break registration into a **stepped flow with progress** (Unibet pattern).
- Add password-strength meter + fast-path/biometric sign-in.
- Ship **demo mode, sort and filter** in casino lobby (drives lowest casino coverage).
- Build a Promotions & Bonuses control centre (opt-in/out + wagering-progress card).
- Add **live chat and formal complaints/ADR route** (Circus is the only brand with neither).
- Expand payment methods (Klarna/Trustly-style + mobile wallet) and align payment-page branding.
- Cut **Time to Interactive from ~25s to under 5s** (render-blocking CSS/JS + unoptimised images sit behind 45 of 136 findings; accessibility score 85).

## Suggested sequence
- **NOW (0–30 days):** Copy, labels, inline fixes — the eight quick wins.
- **NEXT (1–2 quarters):** Registration (iDIN, stepped), casino discovery (demo + sort/filter), help (complaints/live-chat).
- **LATER (this year):** Payments breadth, net-position transparency, JS/image/caching performance programme (TTI + accessibility).

*Sources: Circus vs the Dutch market — Competitive feature audit (NL, Q2 2026) · Journey score matrix · recommendations-ALL-2026-07-28.csv (136 findings). Prepared for Gaming1.*
