# Jurnii Design Orchestration Plan

## Overview
This document outlines the Antigravity orchestration architecture for upgrading the Jurnii website. It defines the specific Rules, Workflows, and Skills required to coordinate brand review, UX auditing, component upgrading, page redesign, browser validation, and final reporting without relying on generic AI hallucinations or anti-pattern scripts.

## Rules
Rules are global, persistent constraints that guide every agent action.

1. **`jurnii-agent-operating-principles.md`**
   * **Why:** Enforces the fundamental operational guardrails.
   * **When to invoke:** Automatically on every agent turn.
   * **Purpose:** Mandates loading brand context before any copy/design changes, prohibits unsupported claims, ensures design serves commercial clarity, and requires browser validation for visual work.
2. **`jurnii-no-scripted-content-generation.md`**
   * **Why:** Prevents the anti-pattern of mass-generating generic SaaS copy via scripts.
   * **When to invoke:** Automatically on every agent turn.
   * **Purpose:** Restricts scripts to auditing/testing/reporting only. Copy must be directly authored from canonical source context.
3. **`jurnii-brand-and-tone.md`**
   * **Why:** Ensures the specific "calm authority" and commercial literacy required by Jurnii.
   * **When to invoke:** Automatically on every agent turn involving content or messaging.
   * **Purpose:** Enforces data-backed claims, specific CTAs, and bans AI hype, UX softness, and consulting filler.
4. **`jurnii-visual-design-system.md`**
   * **Why:** Protects the visual integrity and premium enterprise feel of the site.
   * **When to invoke:** Automatically on every agent turn involving HTML/CSS modifications.
   * **Purpose:** Enforces the Jurnii typography (Geist), dark/light section hierarchy, green accent usage, and prevents generic templates.
5. **`jurnii-design-quality-gates.md`**
   * **Why:** Establishes the definition of "done."
   * **When to invoke:** Automatically before marking any page task as complete.
   * **Purpose:** Requires a page to pass brand, UX, responsive, accessibility, and visual screenshot checks before completion.

## Workflows
Workflows are step-by-step orchestrations invoked on demand to accomplish complex processes.

1. **`jurnii-design-orchestrator.md`**
   * **Why:** Acts as the master controller to prevent disjointed efforts.
   * **When to invoke:** At the start of a full-site or multi-page redesign sprint.
   * **Purpose:** Coordinates the research, design-system planning, component upgrades, page upgrades, browser QA, and final reporting in strict order.
2. **`jurnii-design-system-audit.md`**
   * **Why:** Establishes the baseline before execution.
   * **When to invoke:** Triggered by the master orchestrator before editing components.
   * **Purpose:** Audits tokens, CSS, components, colours, and responsive rules, resulting in the component backlog.
3. **`jurnii-page-design-upgrade.md`**
   * **Why:** Ensures a structured, commercially logical approach to each individual page.
   * **When to invoke:** Triggered sequentially for each priority page.
   * **Purpose:** Creates a page brief (purpose, buyer, proof points, CTA) before editing, then executes the redesign.
4. **`jurnii-browser-ux-review.md`**
   * **Why:** Automates the visual validation step.
   * **When to invoke:** Triggered immediately after a page is redesigned.
   * **Purpose:** Uses the browser subagent to check desktop/tablet/mobile layouts, capture screenshots, and review CTAs and contrast.
5. **`jurnii-final-design-qa.md`**
   * **Why:** Closes the loop and provides evidence of completion.
   * **When to invoke:** Triggered at the end of the orchestration sprint.
   * **Purpose:** Runs a full-site review and produces the final orchestration report.

## Skills
Skills are specialized capabilities the agent dynamically loads to perform specific functional tasks.

1. **`jurnii-brand-designer`**
   * **Why:** Provides the specific logic for applying Jurnii's visual identity.
   * **When to invoke:** When making decisions about colour, typography, data visualisation, and section hierarchies.
2. **`commercial-ux-auditor`**
   * **Why:** Ensures pages serve the CCO/CPO buyer profiles, not just generic UX standards.
   * **When to invoke:** When reviewing page clarity, conversion paths, and commercial logic.
   * **Output format:** Finding -> Commercial Consequence -> Recommended Change -> Affected Section.
3. **`frontend-polish-implementer`**
   * **Why:** Ensures high-quality code changes that respect the existing vanilla HTML/CSS stack.
   * **When to invoke:** When writing the actual HTML/CSS for design improvements.
   * **Constraints:** Must prefer reusable components, avoid unnecessary rewrites, and avoid new dependencies.
4. **`browser-design-qa`**
   * **Why:** Governs the specific checks the browser subagent must perform.
   * **When to invoke:** When validating visual work via the browser.
5. **`design-system-governor`**
   * **Why:** Maintains consistency across shared tokens and UI elements.
   * **When to invoke:** When changing or creating shared CSS tokens, buttons, cards, or metric strips.

## Orchestration Coordination & Artifacts
The orchestration flows sequentially, producing specific artifacts as evidence:

1. **Audit Phase:** The master orchestrator runs the `jurnii-design-system-audit` workflow using the `design-system-governor` and `commercial-ux-auditor` skills.
   * *Artifacts produced:* `JURNII_WEB_DESIGN_SYSTEM.md`, `JURNII_PAGE_DESIGN_AUDIT.md`, `JURNII_COMPONENT_BACKLOG.md`
2. **Component Phase:** Shared UI elements are upgraded using `frontend-polish-implementer`.
   * *Artifacts updated:* `JURNII_COMPONENT_BACKLOG.md`
3. **Page Upgrade Phase:** The `jurnii-page-design-upgrade` workflow processes priority pages. It creates a commercial page brief, applies the `jurnii-brand-designer` skill, and edits the code.
   * *Artifacts produced:* `JURNII_DESIGN_QA_CHECKLIST.md`
4. **Browser QA Phase:** The `jurnii-browser-ux-review` workflow uses the `browser-design-qa` skill to validate the page visually.
   * *Artifacts produced:* WebP recordings, visual screenshots, walkthroughs.
5. **Final Reporting:** The `jurnii-final-design-qa` workflow reviews all checklists.
   * *Artifacts produced:* `JURNII_DESIGN_ORCHESTRATION_REPORT.md`

## Future Agent Usage
Future agents will not need to rethink this architecture. By invoking `/workflow jurnii-design-orchestrator`, the agent will automatically ingest the global Rules, follow the step-by-step Workflows, dynamically adopt the specialized Skills, and generate the required Artifacts for human review.
