---
report: Betsson vs the Market — Competitive Feature Audit (Multi-Market)
operator: Betsson (+ Starcasino, also Betsson Group, in Italy)
regions: [Brazil 🇧🇷, Peru 🇵🇪, Argentina 🇦🇷 (LATAM), Italy 🇮🇹, Finland 🇫🇮, Greece 🇬🇷 (Europe)]
type: Competitive Intelligence / Feature Audit (heatmap + score rings)
date_range: Q2 2026
version: v8 (Jul 8 2026; v7 dropped explicit BR/PE framing to a general functional audit; earlier versions BR/PE-only)
scope: 6 markets · 31 brands · 9 journeys · ~200 feature checks per region
method: Live screenshot & manual review. Scoring 2=present, 1=partial, 0=absent, —=not verified (excluded from denominator)
source_url: https://quill.jurnii.io/report/betsson-vs-the-market-analysis-brazil-peru-overview-p6k9g
folder: Feature Matrix Report
crawled: 2026-08-03
---

# Betsson — Multi-Market Competitive Feature Audit (Q2 2026)

Six markets, thirty-one brands, ~200 feature checks per region. Where Betsson wins the journey, where it gives ground, and the patterns repeating across every market.

**Standout signal — 3 "firsts"** (best-in-class behaviours seen only at Betsson): RG tools at account creation (Peru), pre-launch RTP metadata (Peru), live odds-change banner inside betslip (Peru).

## Market Scoreboards — overall feature coverage (Betsson highlighted)
| Market | Field | Ranking (coverage %) |
|---|---|---|
| Peru 🇵🇪 (71 features) | 5 brands | Betano 81 · **Betsson 77** · Inkabet 69 · Apuestatotal 66 · Teapuesto 54 |
| Brazil 🇧🇷 (56 features) | 6 brands | Betano 82 · bet365 75 · **Betsson 66** · 7Games 66 · Superbet 65 · Esportes da Sorte 58 |
| Italy 🇮🇹 (64 features) | 7 brands | Starcasino 72 · Sisal 70 · Betflag 67 · Goldbet 66 · **Betsson 63** · 888 61 · EPlay24 61 |
| Finland 🇫🇮 (76 features) | 4 brands | **Betsson 79** · Coolbet 79 · Unibet 70 · Paf 53 |
| Greece 🇬🇷 (80 features) | 5 brands | bet365 81 · Superbet 79 · Novibet 76 · Stoiximan 71 · **Betsson 67** |
| Argentina 🇦🇷 (67 features) | 4 brands | **Betsson 66** · BetWarrior 64 · bet365 62 · Betano 58 |

## Betsson coverage per journey, by market (%)
| Journey | PE | BR | IT | FI | GR | AR |
|---|---|---|---|---|---|---|
| Registration | 78 | 69 | 63 | 75 | 50 | 67 |
| Account access | 71 | 63 | 29 | 44 | 60 | 38 |
| Sportsbook | 86 | 89 | 71 | 90 | 86 | 80 |
| Payments (deposits & withdrawals) | 90 | 50 | 65 | 100 | 71 | 75 |
| Casino | 67 | 39 | 28 | 75 | 50 | 55 |
| Bonuses | 70 | 60 | 83 | 63 | 75 | 75 |
| Help | 67 | 92 | 79 | 100 | 67 | 64 |
| App | 67 | 100 | 80 | 100 | 100 | 100 |

Each region leads on a different journey: **Peru** on account access & payments, **Italy** on registration & KYC/bonuses, **Brazil** on sportsbook polish & app, **Greece** on payment breadth, **Finland** steadiest all-rounder (payments/help/app all 100), **Argentina** the tightest race. **Bonus-balance separation** is the one row every market leaves on the table.

## Where Betsson leads (strengths)
- **[Peru] RG tools surfaced at account creation** — Deposit Limit, Time-Outs, Self-Exclusion, Self-Assessment on the registration confirmation screen. No other operator in the audit does this.
- **[Peru] Pre-launch RTP & game metadata** — game detail page shows theoretical RTP, bet system, provider, max win, release date before launch (best-in-class).
- **[Peru] Odds-change banner inside betslip** — "Las cuotas han cambiado de X a Y" with explicit accept-to-bet CTA (cleanest live-odds-volatility UX).
- **[Peru] Twelve payment methods** — broadest in the Peru cohort (cards, e-wallets, QR, bank rails).
- **[All markets] Sportsbook fundamentals near-perfect** — search, betslip persistence, bet-type switching, error messaging, bet history all pass.
- **[Brazil] Bet-builder with bonuses highlighted in betslip.**
- **[Italy] RG posture held in onboarding** — page-top disclaimer + "Gioco Responsabile" sidebar.
- **[Finland] Only personalised casino lobby** — recently-played/favourites shelf + "Remember me" login (rivals ship neither).
- **[Greece] Widest payment selection** — ~15 methods vs Stoiximan 11, Superbet 10.
- **[Argentina] RG limits built into signup** — "Juego responsable" panel above "Crear cuenta" (deposit/loss/bet/session limits).

## Where Betsson gives ground (gaps)
- **[All markets] No biometric or SSO login on mobile** — Betsson scores 0 on this row everywhere. Only Betano (BR/PE) and Betflag (IT) offer it.
- **[All markets] Bonus balance not separated from real money** — fails/partial in every market; Brazil sharpest (whole cohort scores 0).
- **[Brazil] Only one deposit method (PIX)** — bet365 ships 8 bank-specific PIX variants, Betano 3. Thinnest deposit selection in cohort.
- **[Brazil] No quick-select deposit amounts** — every competitor except bet365 ships preset chips.
- **[Brazil] Recently played / favourites shelf missing** in logged-in casino (present in Peru).
- **[Italy] No SPID / CIE digital identity** — only major Italy operator without it; classic-only flow adds up to 3 days to withdrawal access.
- **[Italy] Narrowest payment selection** — ~3 methods vs Goldbet 17, EPlay24 12.
- **[Finland] No automated identity verification** — Coolbet auto-verifies via Trustly "Pay N Play", Unibet accepts Finnish bank-ID; Betsson offers neither (slowest onboarding-to-cashout).
- **[Greece] No RG mention in onboarding** — bet365 forces mandatory limits step ('Όρια') mid-flow.
- **[Argentina] Self-exclusion access is a gap** — under-3-clicks self-exclusion and national-register integration both score 0.
- **[Industry-wide] No explicit pre-submission bet confirmation** — universal miss; RG/trust opportunity for a first mover.

## Category deep-dives — coverage % per brand (selected leaders)
**Registration:** PE Betano 81 / Betsson 78 · BR Betano 94 / bet365 81 / Betsson 69 · IT Betflag 75 / Betsson 63 · FI Betsson 75 = Coolbet 75 · GR bet365 88 / Betsson 50 · AR Betano 72 / Betsson 67.
**Account access:** PE Betsson 71 = Betano 71 · BR Esportes 75 / Betsson 63 · IT Betflag 64 / Betsson 29 · FI Coolbet 56 / Betsson 44 · GR Stoiximan 67 / Betsson 60 · AR bet365 43 / Betsson 38.
**Sportsbook:** PE Betsson 86 (leads) · BR Betsson 89 = Superbet = bet365 · IT Sisal 73 / Betsson 71 · FI Betsson 90 (leads) · GR Superbet 90 / Betsson 86 · AR Betsson 80 (leads).
**Deposits & withdrawals:** PE Betano 95 / Betsson 90 · BR Esportes 72 = Betano 72 / Betsson 50 · IT EPlay24 88 / Betsson 65 (last) · FI Betsson 100 = Coolbet 100 · GR Betsson 71 (leads) · AR Betano 82 / Betsson 75.
**Casino:** PE Betano 78 / Betsson 67 · BR Betano 100 / Betsson 39 · IT Starcasino 83 / Betsson 28 (last) · FI Coolbet 89 / Betsson 75 · GR bet365 89 / Betsson 50 · AR bet365 72 / Betsson 55.
**Bonus & promotions:** PE Betano 90 / Betsson 70 · BR Betano 80 = bet365 80 / Betsson 60 · IT Sisal 100 / Betsson 83 · FI Coolbet 100 / Betsson 63 · GR Superbet 94 / Betsson 75 · AR Betsson 75 (leads).
**Getting help:** PE Teapuesto 75 / Betsson 67 · BR bet365 100 / Betsson 92 · IT Goldbet 86 / Betsson 79 · FI Betsson 100 (leads) · GR bet365 92 / Betsson 67 · AR BetWarrior 75 / Betsson 64.
**App experience:** PE Betsson 67 (leads) · BR Betsson 100 (tied top; Esportes 0 — no app) · IT ~80 across field · FI Betsson 100 (Unibet/Coolbet 0 — no app) · GR all 100 · AR Betsson 100 (leads).

## Registration friction — steps to activation
- **Peru:** Betsson 3 (CE/Passport path available); Inkabet DNI fast-reg 1 step; Apuestatotal single-scroll; Betano 4 (SSO→1 tap).
- **Brazil:** Betsson **3 + mandatory facial recognition = 4 effective (highest friction)**; Esportes 1 (lowest); bet365 2 (loss/login limits mandatory in Step 2).
- **Italy:** Betsson 3, classic-only (no SPID/CIE) → 8–10 min, slowest activation; 888 SPID path ~3 min; Betflag CIE vs Classica choice; Sisal retail receipt activation.
- **Finland:** Betsson 3; Paf/Unibet 2; Coolbet 3 (SMS verification).
- **Greece:** Betsson 3 (persistent welcome-bonus banner); bet365 5 (highest friction, RG limits Step 4).
- **Argentina:** Betsson 3 (DNI+CUIT auto-fill, live password meter, sworn 18+/PEP declaration); bet365 5–6; BetWarrior ended in Renaper ID-check error.

## Payment method breadth (count per brand, market max)
- 🇵🇪 Peru (max 12): **Betsson 12** · Inkabet 11 · Teapuesto 10 · Apuestatotal 10 · Betano 7.
- 🇧🇷 Brazil (max 8): bet365 8 · Betano 3 · 7Games 3 · Esportes 2 · **Betsson 1** · Superbet 1.
- 🇮🇹 Italy (max 17): Goldbet 17 · EPlay24 12 · Sisal 10 · Starcasino 8 · 888 6 · Betflag 6 · **Betsson 3**.
- 🇫🇮 Finland (max 13): **Betsson 13** · Paf 10 · Coolbet 7 · Unibet 4.
- 🇬🇷 Greece (max 15): **Betsson 15** · Stoiximan 11 · Superbet 10 · bet365 4.
- 🇦🇷 Argentina (max 5): **Betsson 5** = BetWarrior 5 · Betano 4.

## KYC trigger points (notable)
- **Peru — Betsson:** post-registration banner (non-blocking) + hard block at first deposit — only operator to enforce a deposit gate pre-KYC.
- **Brazil — Betsson:** identity check at Step 1 after CPF input; **withdrawal facial-recognition gate has no fallback** (testing failed, user locked out).
- **Italy — Betsson:** reduced functionality until document review (24–72h); no SPID fast-track.
- **Finland — Betsson:** trigger not captured; rivals use Trustly Pay N Play / bank-ID.
- **Argentina — Betsson:** KYC at withdrawal ("Retirada no disponible — Verificar ahora").

## Notable defects / watch-outs
- **[Brazil] Withdrawal facial-recognition gate has no recovery path** — user locked out.
- **[Brazil] Casino lobby ships without filters** ("Mais Populares"/"Novos Jogos" only).
- **[Peru] "Cardholder name" error string in English** in Mastercard deposit flow (localisation bug).
- **[Italy] Only top brand without SPID/CIE** → up to 3 days to first withdrawal.

## Where to invest next — three highest-leverage moves
1. **Bring Brazil deposit breadth in line with bet365** — add ≥3 PIX entry points + quick-select chips (cohort gap −60 pts).
2. **Bonus-balance separation across every market** — turns a regulatory chore into a trust differentiator (cohort gap 0/6 brands in Brazil).
3. **Add biometric or SSO login on mobile** — near-universal miss (only 1/11 brands ship it); a weekend's work.

*Note: headline "coverage score rings" rendered as 0/100 in text extraction (SVG rings); real coverage figures are in the market scoreboards above. Sources: per-market Competitive Audit Matrices (PE, BR, IT, FI, GR) + Auditor Notes. Method: live screenshot audit, per-feature pass/partial/absent, unverified rows excluded from denominators.*
