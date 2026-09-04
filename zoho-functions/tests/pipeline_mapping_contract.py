"""Reference implementation of the Product Key -> Pipeline mapping.

⚠ PINS CURRENT (SUPERSEDED) BEHAVIOUR.
    Authority: zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md

    Pipeline is a DEAL relationship attribute (§6.3), not a function of the Product key.
    `Deals.Pipeline` is live-readable (confirmed 96/96 over COQL, contradicting the claim at
    _util_resolveDealPipeline.deluge:11-13), so the whole Product -> Pipeline chain retires:
    _util_pipelineForProductKey.deluge is DELETE in V6_CRUD_PLAN.md, and _util_resolveDealPipeline
    is rewritten to read Deals.Pipeline directly.

    THIS CONTRACT IS EXPECTED TO FAIL when the model is corrected. That failure is the intended
    signal — do not "repair" the mapping to keep it green.

Line-for-line mirror of v6/activity/_util_pipelineForProductKey.deluge, the deployed
single source of truth for the Product -> Deal Pipeline rule. Deluge has no local
runner, so the contract is pinned here and exercised by tests/test_pipeline_mapping.py.

LIMITATION: this proves the CONTRACT, not the deployed Deluge. Keep the two in step —
if you change one, change the other in the same commit. A green run here does not mean
production is correct; only republishing + the live E2E does that.
"""


def pipeline_for_product_key(product_key):
    """Map a canonical product key to a pipeline.

    "jurnii_ux" | "jurnii_360" | "jurnii_cortex" -> "B2B"
    "partnership"                                 -> "Partnership"
    ""  (blank)                                   -> "B2B"        (agreed default)
    any other non-blank key                       -> "unresolved" (never silent B2B)
    """
    k = (product_key or "").strip().lower()
    if k == "":
        return "B2B"
    if k == "partnership":
        return "Partnership"
    if k in ("jurnii_ux", "jurnii_360", "jurnii_cortex"):
        return "B2B"
    return "unresolved"
