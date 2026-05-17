# Workflow: Jurnii Design Orchestrator

## Description
The master workflow for managing the Jurnii website redesign. Runs research, audit, design-system planning, component upgrades, page upgrades, browser QA, and final reporting sequentially.

## Steps
1. **System Audit Phase:** Execute the `jurnii-design-system-audit` workflow. This produces `JURNII_WEB_DESIGN_SYSTEM.md` and `JURNII_COMPONENT_BACKLOG.md`.
2. **Page Audit Phase:** Generate a `JURNII_PAGE_DESIGN_AUDIT.md` for all existing routes, identifying current design scores, commercial purpose, primary buyer, current weaknesses, and recommended upgrades.
3. **Component Backlog Execution:** Use the `frontend-polish-implementer` and `design-system-governor` skills to upgrade shared components listed in the backlog.
4. **Iterative Page Upgrades:** For each priority page:
   - Run the `jurnii-page-design-upgrade` workflow.
   - Run the `jurnii-browser-ux-review` workflow to validate visually.
5. **Final QA:** Run the `jurnii-final-design-qa` workflow to compile the final `JURNII_DESIGN_ORCHESTRATION_REPORT.md` and ensure no defects remain.
