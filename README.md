# Jurnii Platform
<!-- Last build: 2026-07-28 -->

A monorepo holding three independent systems.

| Path | System | Entry point |
|---|---|---|
| `src/`, `content/`, `assets/`, `scripts/`, `api/` | Marketing **website** (Vite + TypeScript) | `npm run dev` |
| `booking/` | **Booking module** — form widget, serverless backend, Neon Postgres | [`booking/README.md`](booking/README.md) |
| `zoho-functions/` | **Zoho CRM automation** — Deluge functions and workflow rules | [`zoho-functions/README.md`](zoho-functions/README.md) |

## Working here

```bash
npm run dev      # website dev server
npm run build    # compile content manifest + vite build
npm test         # booking test suite
npm run test:db  # booking DB tests (guarded)
```

## Before changing anything in `booking/` or `zoho-functions/`

Read **[`CLAUDE.md`](CLAUDE.md)**. It carries the commercial model that both systems implement, the
Zoho safety rules, and a map of which documents are authoritative.

Two points that catch everyone:

- The approved CRM model is **`Account → Deal`, `Product → Quote`**, with **one Account holding zero or
  one persistent Deal**. The Deluge code still implements a superseded `Deal = Account × Product`
  model, and most code comments describe that superseded model. Authority:
  [`zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md).
- **Zoho is read-only by default.** Never publish a Deluge function, toggle a workflow, or delete a
  field without an explicit instruction.
