---
report: Oha Casino Registration Comparison
operator: OHA Casino
region: Norway (NO)
type: UX Audit — registration re-audit (mobile)
date_range: June 2026
source_url: https://quill.jurnii.io/report/oha-casino-registration-comparison-1khdv
folder: Public Reports
crawled: 2026-08-03
---

# OHA Casino — Mobile Registration Re-Audit (Norway, June 2026)

**Headline:** A small step forward. The biggest wins are still on the table. Overall score **65 → 68 (+3)** — both versions stay in the Average band (61–75). Redesign fixed input controls and in-journey navigation but resolved none of the core conversion blockers. Previous flow: 9 steps; current: 11 steps.

## What improved
- Persistent field labels (above every input, replacing placeholder-only).
- Validation on blur (real-time confirmation mid-flow).
- Back button on Step 2 (correct earlier answers without losing place).
- Single date-of-birth field (unified vs 3 DD/MM/YYYY boxes).
- Clearer, field-level error messages.
- Paste-code button + resend countdown on SMS step.

## Where it still falls short
- **Errors don't guide recovery** — flag the problem but not what valid input looks like or how to fix it.
- **No password guidance** — no strength meter, no requirements, no real-time feedback.
- **Placeholders repeat the label** instead of showing a format example ("e.g. john@email.com").
- **Country code is numbers only** — no flags/country names (barrier for international users).
- **Dead calendar icon** — DOB calendar icon looks tappable but does nothing (false affordance).
- **Cramped side-by-side fields** — validation messages truncate; pairing fields backfires (reads cluttered).

## Recommended Step-1 rebuild
Format-example placeholders, live password-strength meter + requirement checklist (8+ chars, uppercase, lowercase, number), country picker with flags & names, explicit required markers, inline validation that guides recovery, submit enabled only when valid.

*Jurnii Score is a composite usability rating (0–100). Re-audit compares previous vs current OHA Casino mobile registration journeys, June 2026.*
