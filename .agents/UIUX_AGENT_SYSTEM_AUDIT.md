# Jurnii UI/UX Agent System Audit

**Date:** 2026-05-17
**Context:** Pre-sprint audit for establishing the Higher-Taste Jurnii UI/UX Design Studio Workflow.

## 1. Existing Workflows
- `audit-current-site.md`: Structural audit, but lacks deep visual or commercial critique logic.
- `build-interface-artifact.md`: Useful for isolated components.
- `build-page-visual-system.md`: Partially overlaps with the new goal but is lower level.
- `implement-page.md`: Implementation heavy, skips the critique phase.
- `jurnii-design-orchestrator.md`: The current overarching redesign workflow, but it delegates to lower-level implementation steps too early without a dedicated design critique loop.
- `plan-redesign.md`: Focuses heavily on planning structure but lacks taste-based design critique parameters.

## 2. Existing Skills
- `browser-design-qa`: Needs an upgrade to allow strict rejection of implementations and focus more on "premium feel."
- `commercial-ux-auditor`: Good base, needs to be integrated into the sequential design loop as `commercial-ux-strategist`.
- `design-system-governor`: Needs to pivot to `design-systems-architect` to preemptively plan class structures before CSS is written.
- `frontend-polish-implementer`: Good start, but needs to be explicitly constrained to only act *after* critique and architecture planning as `frontend-style-implementer`.
- `jurnii-brand-designer`: Too general; needs to be focused as `jurnii-visual-director` enforcing strict "board-ready" aesthetic rules over generic SaaS styling.

## 3. Existing Rules
- `website-redesign-standards.md`, `jurnii-visual-design-system.md`: Provide basic boundaries but lack the aggressive "taste" constraints required to prevent generic card grids and blobs.

## 4. What is Working
- The agent successfully follows structural rules (e.g., maintaining the commercial ontology).
- The use of `site.css` instead of Tailwind is well established.
- Subagent browser testing provides actual visual validation.

## 5. What is Too Generic
- **Card Grids:** Defaulting to `.feature-cell` for everything creates a monotonous agency brochure feel.
- **Heroes:** The system builds functional but visually weak heroes lacking a strong commercial "intelligence" aesthetic.
- **Icons as Decor:** Tends to rely on generic Lucide icons to fill space rather than structural data visualizations.
- **Process Gap:** The system implements CSS immediately after structural planning without a "visual critique" step to challenge the design concept.

## 6. Skill Upgrades Required
The system will implement a 7-role design studio model:
1. `principal-uiux-designer` (NEW: Critique & Hierarchy)
2. `jurnii-visual-director` (UPGRADE from brand designer: Enforce premium taste)
3. `design-systems-architect` (UPGRADE from design system governor: Define reusable CSS before building)
4. `commercial-ux-strategist` (UPGRADE from commercial ux auditor: Ensure business clarity)
5. `frontend-style-implementer` (UPGRADE from frontend polish implementer: Strict CSS execution)
6. `browser-design-critic` (UPGRADE from browser design QA: Reject poor visual output)
7. `creative-director-review-board` (NEW: Final taste gate)

## 7. The Single Entry Point
A new workflow `/jurnii-uiux-style-orchestrator` will become the definitive command for premium design sprints, superseding the direct use of older workflows like `jurnii-page-design-upgrade` when high visual taste is required.

## 8. The New Multi-Agent Design Loop
1. **Context Intake:** Understand page, content to preserve, and scope.
2. **Principal UI/UX Critique:** Assess current visual weakness and define the design move.
3. **Brand Visual Director Pass:** Apply strict Jurnii dark/light patterns and reject SaaS defaults.
4. **Design Systems Architect Pass:** Define the CSS classes to be created/reused.
5. **Commercial UX Strategist Pass:** Verify business logic supports the design.
6. **Frontend Style Implementer Pass:** Write the HTML/CSS (No scripts, reduce inline styles).
7. **Browser Design Critic Pass:** QA the implementation across viewports. Reject if not premium.
8. **Final Creative Director Review:** Ultimate gatekeeper. Approves or requests revisions.
