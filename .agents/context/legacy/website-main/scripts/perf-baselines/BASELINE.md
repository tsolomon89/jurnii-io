# Core Web Vitals — Phase 0 Baselines

Captured: 2026-07-22 · Lighthouse 12 · mobile (Moto G Power emulation)

## Local (http://localhost · this repo)

| Page | Perf score | LCP | TBT | CLS | FCP |
|------|-----------:|----:|----:|----:|----:|
| `jurnii-ux.html` | **30** | 10.5 s | 1,480 ms | 0 | 9.4 s |
| `index.html` | **39** | 10.3 s | 710 ms | 0 | 9.4 s |
| `jurnii-360.html` | **41** | 10.2 s | 610 ms | 0 | 9.3 s |
| `features/competitor-analysis.html` | **44** | 9.9 s | 490 ms | 0 | 9.1 s |

Raw JSON: `scripts/perf-baselines/*-mobile.json`

## Production (https://jurnii.io)

| URL | Perf score | LCP | TBT | CLS | FCP |
|-----|-----------:|----:|----:|----:|----:|
| `/` (home) | **66** | 4.5 s | 190 ms | 0.001 | 4.1 s |

Product pages live at **`/360`** and **`/ux`** (rewrites to `jurnii-360.html` / `jurnii-ux.html`). Local Lighthouse for those HTML files is the primary baseline for this repo.

Note: production home may differ from this static checkout (observed Lenis on prod).

## Primary findings

1. **LCP is dominated by JS boot** — empty `#root` until Babel compiles + React mounts (9–10 s local).
2. **`jurnii-ux` is the worst page** — highest TBT (1.48 s) from ~9 JSX modules + canvas/rec-modal CSS.
3. **CLS is already good (0)** on local — preserve with fixed-height lazy placeholders.
4. Optimisations must validate first against **`jurnii-ux`** and **`jurnii-360`**.
