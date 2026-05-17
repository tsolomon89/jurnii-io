# Workflow: Jurnii Page Design Upgrade

## Description
Upgrades a single page by defining its commercial logic before implementing the design.

## Steps
1. **Create Page Brief:** Before editing code, clearly define:
   - Commercial purpose
   - Primary buyer/persona
   - Proof points
   - Section hierarchy
   - CTA path
   - Browser QA requirements
2. **UX Audit:** Use the `commercial-ux-auditor` skill to review the current HTML against the brief.
3. **Brand Application:** Use the `jurnii-brand-designer` skill to decide on the appropriate visual hierarchy (e.g., dark strategic hero, light data sections).
4. **Code Implementation:** Use the `frontend-polish-implementer` skill to modify the HTML/CSS. Ensure no anti-pattern scripts are used. Replace generic copy with context-derived Jurnii claims.
5. **Trigger Validation:** Immediately proceed to the `jurnii-browser-ux-review` workflow.
