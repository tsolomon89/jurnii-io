# `.agents/context/` — ⚠ cached snapshots, several are STALE or BROKEN

**Do not treat anything in this directory as current.** These are point-in-time captures kept for
provenance. For anything that must be correct, read the live org or the authoritative documents.

| Question | Read this instead |
|---|---|
| What does this field mean? Can I delete it? | [`../../docs/v6/V6_FIELD_USE_CONTRACT.md`](../../docs/v6/V6_FIELD_USE_CONTRACT.md) |
| What is the commercial model? | [`../../docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../../docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md) |
| What fields exist right now? | live `GET /crm/v6/settings/fields?module=<M>&type=all` |
| What workflow rules exist right now? | live `getWorkflowRules` (Zoho Workflow MCP, read verbs only) |

## Known-bad files

| File | Status |
|---|---|
| **`crm_workflow_rules_raw.CAPTURED_AUTH_FAILURE.json`** | 🚨 **NOT a workflow inventory** — renamed 2026-08-17 so the filename stops implying it is one. The whole 841-byte file is a cached *error response*: `"You cannot perform this operation. Connection not authorised"`, `"status": "failure"`. It contains **zero** rules. **The org has exactly 18 rules, 17 active** — live-verified 2026-08-17 via `getWorkflowRules`. Any audit that read this file read nothing |
| **`crm_functions_raw.2026-06-14.STALE.json`** | ⚠ **STALE** — renamed 2026-08-17. Captured 2026-08-02 but its newest `modified_time` is **2026-06-14** (v5 era). Holds 17 entries, metadata only — the `function` objects carry `{id}` and nothing else, no `display_name`, no source. The repo has **38** Deluge files. Use live `getAllAutomationFunctions` |
| **`api_field_names/*.csv`** | ⚠ **STALE.** `zoho_leads_api_names.csv` holds 120 fields against substantially more live — an earlier audit found **79 live Lead fields missing**. `zoho_deals_api_names.csv:40` still lists `Deal_Key` as current, which is a **REDEFINE** candidate. Superseded by the field-use contract and by live `getFields` |

## Files that are still useful

| Path | What it is |
|---|---|
| `activity-workflows/emails/`, `activity-workflows/call_scripts/` | The 41 email templates and per-stage call scripts. Keyed to the 8 **Contact** Stages, which the authoritative model preserves unchanged. ⚠ Two send-gate *descriptions* in `emails/README.md` are drift — see its banner |
| `field_mapping/Jurnii Personas - Job Tile to Contact Role Mapping.csv` | Job title → `Contact_Role1`. Mirrors the map inlined in `processContact.deluge` and `processDeal.deluge` |
| `field_mapping/Jurnii Zoho API - Pick List Values.csv` | Picklist snapshot. ⚠ Picklists round-trip in **display** space; `Task_Stage` stores the actual value `Renewall` while every surface returns `Renewal`. Verify against live before relying on any value |
| `pricing/price_model.csv` | The banded pricing matrix. **`Product.Unit_Price` is NOT the price** — the authoritative model forbids using it as Deal Amount |
| `import_tests/` | Dated import audits. Each carries its own banner. `AUDIT_01_ARCHITECTURE_E2E_QUOTE.md:115` is **live-verified evidence that the approved one-Account-one-Deal model previously worked in this org** |
| `v4-core-e2e-test-log.md` | v4 E2E log. Also evidence for the approved model — it tests a second Deal under one Account as a *duplicate* |
| `zoho-backups/20260615T121415Z/` | Pre-cutover rollback snapshot |

## Rule

Everything here is **historical evidence and is never rewritten** to match current understanding. Where
a file is wrong, it carries a banner or appears in the table above. If you find a new inaccuracy, add a
note — do not edit the captured data.
