# International iGaming Reports — Source Artifacts

Crawled from **Quill** (https://quill.jurnii.io — Jurnii intelligence workspace) on **2026-08-03**.
Purpose: structured source material for building in-depth international/regional iGaming research reports (Brazil, UK, LATAM, EU, plus US).

See [`_inventory.md`](_inventory.md) for the full library map and extraction method.

## How these artifacts were produced
Each Quill report renders as a self-contained "Bundled Page" (JS builds the DOM at runtime) inside a sandboxed `srcdoc` iframe. To read the full rendered report, the sandbox attribute was removed (making the srcdoc same-origin), the iframe reloaded, and `contentDocument.body.innerText` captured — i.e. the actual full report, not the summary page. Tables/figures are transcribed; base64-embedded images/charts are not.

## Artifacts by region

### United Kingdom (`united-kingdom/`) — the deepest coverage
Market structure, promotional/boost intelligence, and operator briefings.
- `william-hill-ux-benchmark.md` — WH vs Paddy Power/Bet365/Sky Bet/Ladbrokes UX benchmark.
- `tombola-portfolio-benchmark.md` — Tombola Bingo/Casino + Sky Bet; monthly change-detection across UK operators.
- `world-cup-buildup-boost-margin-uk.md` — WC boost generosity vs margin (Entain the exception).
- `boost-intelligence-wh-pp-bet365-trajectory.md` — 15-week boost/margin trajectory (full data table).
- `boost-generosity-4brand-spring-2026.md` — adds Ladbrokes + per-competition breakdown.
- `wh-vs-paddy-power-boost-trajectory.md`, `wh-vs-bet365-boost-trajectory.md` — pairwise cuts.
- `jurnii360-period-comparison-mar-may-2026.md` — UK market MoM structure (SoPV league, mechanic/product mix).
- `jurnii360-boost-classification-review.md` — boost taxonomy + volume by sport.
- `cheltenham-vs-grand-national-racing-promos.md` — racing event promotions.
- `world-cup-2026-promo-activation-timeline.md` — pre-tournament promo timeline (UK/IE).
- Operator commercial briefings (SoPV + corporate facts): `ladbrokes-uk-sopv-commercial-briefing.md` (has the shared UK SoPV table), `betway-uk-commercial-briefing.md`, `midnite-uk-commercial-briefing.md`, `betfred-uk-commercial-briefing.md`, `entain-global-cmo-briefing.md`, `allwyn-national-lottery-briefing.md`, `ballys-intralot-cco-briefing.md`, `bet365-uk-commercial-briefings.md`.

### Brazil & LATAM (`brazil-latam/`)
- `vida-vegas-brazil-ux-benchmark.md` — vs Stake/Novibet/Betano/Superbet/H2 (licensed .bet.br set).
- `kto-robson-product-intelligence.md`, `kto-rodrigo-cazetv-world-cup-2026.md`, `kto-diego-brazil-market-commercial.md`, `kto-matheus-carvalho-cmo.md` — KTO briefings (Brazil UX benchmark table, market macro: 17.7M bettors, tax, channelisation, CazéTV World Cup).
- `betnacional-flutter-edge-sportsbook.md` — Flutter Edge / BetNacional.

### Netherlands (`netherlands/`)
- `gaming1-circus-nl-report.md` — synthesis (journey scores + recommendations).
- `circus-vs-dutch-market-feature-audit.md` — detailed feature audit (Circus vs Unibet/Bet365/BetCity/Holland Casino).

### France & EU / Nordics (`france-eu/`)
- `parions-sport-france-ux-intelligence.md` — FDJ Parions Sport vs Betclic/Bet365/Unibet/Winamax.
- `oha-casino-norway-registration-reaudit.md` — Norway registration re-audit.

### United States (`united-states/`)
- `betonline-us-ux-benchmark.md` — vs Stake.us/BetMGM/DraftKings/Bet365.
- `fanduel-us-commercial-intelligence.md` — has the shared **US UX benchmark table**.
- `fanduel-us-loyalty-and-casino.md`, `caesars-digital-us-briefings.md`, `betmgm-us-briefings.md` — operator commercial briefings (share, tax, prediction markets, M&A).

### Cross-market (`cross-market/`)
- `betsson-multi-market-feature-audit.md` — **flagship**: Betsson across Brazil, Peru, Argentina (LATAM) + Italy, Finland, Greece (EU). 6 markets, 31 brands.

## Notes & caveats
- **Score rings render as `0/100`** in some feature-audit text extractions (SVG rings); real coverage figures are in the market-scoreboard tables within each artifact.
- **Outbound briefings** (folder "Outbound Landing Pages" in Quill) are personalized sales collateral. Sales boilerplate (methodology, testimonials, book-a-demo) was stripped; only market/operator intelligence retained. Many share a common UK SoPV table or Brazil/US UX table — cross-referenced rather than duplicated.
- **Skipped (not market intelligence):**
  - `feature-matrix-demo-j613q` — a **demo** with synthetic brands (Kova, Playline, Golazo, Jogo9…) mirroring the Betsson multi-market audit structure; no real data.
  - `jurnii-studio-design-report-f2rpi` — a Jurnii Studio design-project source bundle, not a market report.
- Some figures differ slightly between briefings for the same market (e.g. Brazil GGR tax path, FanDuel iGaming share 18% vs 26%) — captured as-stated per source; reconcile before publishing.
