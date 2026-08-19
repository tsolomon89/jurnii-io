# Jurnii Zoho CRM — Authoritative Commercial Model  ·  MOVED

> **This document has moved to its canonical location:**
> **[`zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)**
>
> It now sits beside the v6 specifications it supersedes, so that no reader can open the spec pack
> without also seeing the authority that overrides it.
>
> Installed there 2026-08-17. This file is a pointer only — do not edit it, and do not treat any copy
> outside the canonical path as authoritative.

## Why the path changed

The authority document's §12.3 reconciliation list names `README.md`, `docs/SALES_GUIDE.md`,
`docs/v6/*` and `docs/v6/zoho_v6_refactor_spec_pack/`. **None of those resolve at the repository
root.** After the `zoho-functions` consolidation they all live under `zoho-functions/`. The repo-root
`README.md` is a one-line website build stub with no Zoho content, and the repo-root `docs/` holds a
different, newer set (audits and plans) plus unrelated website and analytics documents.

Reading §12.3 against the repo root would let the §12.4 completion test ("no current-authority
statement defines a Deal by Product") pass while every file it was meant to cover stayed unchanged.
Installing the model beside the documents it governs removes that failure mode.

## Companion artifacts

| Artifact | Path |
|---|---|
| Documentation authority map | [`zoho-functions/docs/v6/V6_DOCUMENTATION_AUTHORITY_MAP.md`](../zoho-functions/docs/v6/V6_DOCUMENTATION_AUTHORITY_MAP.md) |
| Conflict ledger | [`zoho-functions/docs/v6/V6_CONFLICT_LEDGER.md`](../zoho-functions/docs/v6/V6_CONFLICT_LEDGER.md) |
| Residual-search report | [`zoho-functions/docs/v6/V6_RESIDUAL_SEARCH_REPORT.md`](../zoho-functions/docs/v6/V6_RESIDUAL_SEARCH_REPORT.md) |
| Field-use contract | [`zoho-functions/docs/v6/V6_FIELD_USE_CONTRACT.md`](../zoho-functions/docs/v6/V6_FIELD_USE_CONTRACT.md) |
