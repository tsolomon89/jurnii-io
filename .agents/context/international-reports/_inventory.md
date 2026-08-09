# Quill Library — Report Inventory (igaming international)

Source: https://quill.jurnii.io (Jurnii intelligence workspace, "The Filing Cabinet")
Crawled: 2026-08-03
Purpose: Source artifacts for in-depth international/regional igaming research reports (Brazil, UK, LATAM, EU + US).

## Extraction method
Reports render as self-contained "Bundled Page" HTML (JS builds the DOM at runtime) inside a sandboxed `srcdoc` iframe (`sandbox="allow-scripts allow-popups"`, opaque origin). Content is read by removing the sandbox attribute (making the srcdoc same-origin), reloading, and reading `iframe.contentDocument.body.innerText`. Summary metadata (type, date range, tags, regions, versions) comes from the top-document report page.

## Folders (7) + 49 reported items

### Public Reports (8)
| Report | Region | Slug |
|---|---|---|
| William Hill Report Summary Refresh | 🇬🇧 UK | william-hill-report-refresh-f3fok |
| Gaming1 – Netherlands Report Summary | 🇳🇱 NL | gaming1-netherlands-report-summary-v0u4t |
| Vida Vegas Review | 🇧🇷 BR | vida-vegas-review-naww2 |
| Tombola Report Summary July 2026 | 🇬🇧 GB | tombola-report-summary-july-2026-2rwu4 |
| Oha Casino Registration Comparison | TBD | oha-casino-registration-comparison-1khdv |
| BetOnline UX Report Summary | TBD | betonline-ux-report-summary-bw1so |
| World Cup build-up: a bigger boost doesn't mean better odds | 🇬🇧 UK | world-cup-build-up-a-bigger-boost-doesn-t-mean-better-odds-xuc2q |
| Jurnii × Parions Sport — UX Intelligence Report May 2026 | 🇫🇷 FR | jurnii-parions-sport-ux-intelligence-report-may-2026-rrl0f |

### Market Analysis (2)
| Report | Region | Slug |
|---|---|---|
| Jurnii 360 Period Comparison Report: Mar–May 2026 | 🇬🇧 UK | jurnii-360-period-comparison-report-mar-may-2026-f2iyz |
| Boost Generosity & Margin Conceded Trajectory: WH, PP, bet365, Ladbrokes (Spring 2026) | 🇬🇧 UK | boost-generosity-margin-conceded-trajectory-wh-pp-bet365-ladbrokes-spring-2026-fu8pq |

### Operator Analysis (3)
| Report | Region | Slug |
|---|---|---|
| Boost Intelligence: William Hill vs Paddy Power vs bet365 Trajectory Analysis | 🇬🇧 UK | boost-intelligence-william-hill-vs-paddy-power-vs-bet365-trajectory-analysis-mfl8d |
| William Hill vs Paddy Power: Boost Generosity & Margin Conceded Trajectory | 🇬🇧 UK | william-hill-vs-paddy-power-boost-generosity-margin-conceded-trajectory-analysis-0zkud |
| William Hill vs bet365: Boost Generosity & Margin Conceded Analysis | 🇬🇧 UK | william-hill-vs-bet365-boost-generosity-margin-conceded-analysis-ygi59 |

### Feature Matrix Report (3)
| Report | Region | Slug |
|---|---|---|
| Circus vs the Dutch market — Competitive feature audit | 🇳🇱 NL | circus-vs-the-dutch-market-competitive-feature-audit-dafh6 |
| Feature Matrix Demo (Kova) | Demo | feature-matrix-demo-j613q |
| Betsson vs the Market — Competitive Feature Audit (Brazil/Peru) | 🇧🇷🇵🇪 LATAM | betsson-vs-the-market-analysis-brazil-peru-overview-p6k9g |

### Testing & Ad-hoc (1)
| Report | Region | Slug |
|---|---|---|
| Jurnii 360 — Boost Classification Review (2026 Q1–Q2) | 🇬🇧 UK (method) | fixture-league-mapping-report-jurnii-360-h3ii6 |

### Event Analysis (2)
| Report | Region | Slug |
|---|---|---|
| Cheltenham Festival vs Grand National 2026 — Racing Promotions Analysis | 🇬🇧 UK | cheltenham-festival-vs-grand-national-2026-complete-racing-promotions-analysis-sn65a |
| World Cup 2026 — Promotional Activation Timeline | 🇬🇧 UK / intl | world-cup-2026-promotional-activation-timeline-tw7vm |

### Outbound Landing Pages (25) — operator commercial/product intelligence briefings
| Report | Region | Slug |
|---|---|---|
| Jurnii × Caesars Digital — Customer Intelligence Briefing | 🇺🇸 US | jurnii-caesars-digital-customer-intelligence-briefing-2oytk |
| Jurnii × FanDuel — Commercial Intelligence Briefing (June 2026) | 🇺🇸 US | jurnii-fanduel-commercial-intelligence-briefing-june-2026-72h2s |
| Jurnii × FanDuel — Loyalty Intelligence Briefing (Andrew) | 🇺🇸 US | jurnii-fanduel-loyalty-intelligence-briefing-andrew-29egg |
| Ladbrokes Commercial Intelligence Briefing — UK Sportsbook 2026 | 🇬🇧 UK | ladbrokes-commercial-intelligence-briefing-uk-sportsbook-2026-sl69a |
| Jurnii × KTO — Rodrigo, Commercial Intel: CazéTV World Cup 2026 Strategy | 🇧🇷 BR | jurnii-kto-rodrigo-commercial-intelligence-briefing-cazetv-world-cup-2026-strate-4c0eb |
| Jurnii × KTO — Robson, Product Intelligence Briefing | 🇧🇷 BR | jurnii-kto-robson-product-intelligence-briefing-h38ox |
| Jurnii × KTO — Diego, Commercial Intelligence Briefing | 🇧🇷 BR | jurnii-kto-diego-commercial-intelligence-briefing-cedvq |
| Jurnii × Bally's Intralot — Richard, CCO Analysis Report | 🇺🇸/intl | jurnii-x-bally-s-intralot-richard-chief-commercial-officer-analysis-report-co2aw |
| Jurnii × BetNacional — Insights from Head of Product Sportsbook (Tiago) | 🇧🇷 BR | jurnii-x-betnacional-insights-from-head-of-product-sportsbook-vsd65 |
| Jurnii × KTO — Matheus Carvalho, CMO Analysis Report | 🇧🇷 BR | jurnii-kto-matheus-carvalho-cmo-analysis-report-on1tv |
| Jurnii × Betway — Insights from Simon Hopper, Head of CRM & CX | 🇬🇧 UK | jurnii-x-betway-insights-from-simon-hopper-head-of-crm-cx-y2uzb |
| Jurnii × bet365 — Alex, Commercial Intelligence Briefing | 🇬🇧/intl | jurnii-bet365-alex-commercial-intelligence-briefing-fq1c1 |
| Jurnii Studio — Design Report | n/a | jurnii-studio-design-report-f2rpi |
| Jurnii × bet365 — Neil, Commercial Intelligence Briefing | 🇬🇧/intl | jurnii-bet365-neil-commercial-intelligence-briefing-ghsqi |
| Jurnii × BetMGM US West — Regional Marketing Report | 🇺🇸 US | jurnii-x-betmgm-us-west-regional-marketing-report-tasg8 |
| Jurnii × BetMGM — Executive Interview with Anthony Conroy | 🇺🇸 US | jurnii-betmgm-executive-interview-with-anthony-conroy-u91zb |
| Jurnii × BetMGM — Steve Winter, Conversion & Optimization | 🇺🇸 US | jurnii-x-betmgm-steve-winter-conversion-optimization-qnriu |
| Jurnii × BetMGM US East — Kathryn Francis, Regional Marketing Analysis | 🇺🇸 US | jurnii-x-betmgm-us-east-kathryn-francis-regional-marketing-analysis-nf8jr |
| Jurnii × FanDuel Casino Analysis — Asaf Noifeld | 🇺🇸 US | jurnii-x-fanduel-casino-analysis-asaf-noifeld-q8yhl |
| Jurnii × Caesars Digital — Josh Jones, CMO Interview | 🇺🇸 US | jurnii-caesars-digital-josh-jones-cmo-interview-uxf15 |
| Jurnii × Midnite — Commercial Intelligence Briefing | 🇬🇧 UK | jurnii-midnite-commercial-intelligence-briefing-bm6yx |
| Jurnii × Betway — Commercial Intelligence Briefing | 🇬🇧 UK | jurnii-betway-commercial-intelligence-briefing-cd9sd |
| Jurnii × Entain — Charlotte Emery, Global CMO | 🇬🇧/global | jurnii-entain-charlotte-emery-global-cmo-nilcc |
| Jurnii × Betfred — Commercial Intelligence Briefing | 🇬🇧 UK | jurnii-x-betfred-commercial-intelligence-briefing-vm72p |
| Jurnii × Allwyn — Commercial Intelligence Briefing | 🇬🇧/EU | jurnii-allwyn-commercial-intelligence-briefing-8joc9 |

## Crawl status — COMPLETE (2026-08-03)
All substantive market/competitive/operator reports crawled and written as artifacts. See [`README.md`](README.md) for the organized index. Region folders: `united-kingdom/`, `netherlands/`, `brazil-latam/`, `france-eu/`, `united-states/`, `cross-market/`.

**Crawled (26 artifacts):** all 8 Public Reports, 2 Market Analysis, 3 Operator Analysis, 2 of 3 Feature Matrix (Circus NL, Betsson multi-market), 1 Testing & Ad-hoc, both Event Analysis, and the substantive Outbound Landing Page briefings (UK: Ladbrokes, Betway ×2, Midnite, Betfred, Entain, Allwyn, Bally's Intralot, bet365 ×2; US: FanDuel ×3, Caesars ×2, BetMGM ×4 — consolidated per operator).

**Skipped (not market intelligence):**
- `feature-matrix-demo-j613q` — demo with synthetic brands (Kova/Playline/Golazo), mirrors the Betsson audit structure; no real data.
- `jurnii-studio-design-report-f2rpi` — design-project source bundle, not a report.
- `jurnii-betmgm-executive-interview-with-anthony-conroy` — same group facts as other BetMGM briefings (folded into betmgm-us-briefings.md).
