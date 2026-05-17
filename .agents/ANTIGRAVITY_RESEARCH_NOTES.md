# Google Antigravity Research Notes

## 1. Sources Checked
* **Internal System Instructions:** Antigravity system prompt instructions (Agent memory).
* **Workspace Introspection:** Local directory structure review (`.agents` folder).
* **Official & Public Documentation (via Web Search):** 
  * Google Antigravity Documentation (`antigravity.google`, `antigravity.im`)
  * Release notes and platform architecture guides for the Gemini-powered agentic IDE (Nov 2025 releases).
  * Community discussions and codelabs regarding Manager/Agent orchestration.

## 2. What Rules are
Rules are permanent, system-level guidelines or behavioral constraints that the agent follows automatically for every turn. They are ideal for enforcing coding standards, brand tone, strict technical requirements, or guardrails (e.g., "always load brand context," "never use tailwind"). They do not need to be manually invoked.

## 3. What Workflows are
Workflows are markdown-based guides providing step-by-step instructions for specific, repeatable tasks. They are on-demand task sequences triggered manually (e.g., via a slash command like `/workflow-name`) or automatically if the agent determines the workflow is highly relevant to the current task. They orchestrate multi-step processes like QA checks or page redesigns.

## 4. What Skills are
Skills are specialized folders of instructions, scripts, and resources that extend the agent's capabilities for complex, specific tasks. They use "progressive disclosure" where the agent reads the `SKILL.md` description first, and only loads the full context when relevant to the task, preventing context bloat. 

## 5. Where workspace Rules should live
Rules can be managed through the IDE's Customizations menu or stored as Markdown files. In this workspace, they should reside in `./.agents/rules/` to maintain modularity.

## 6. Where workspace Workflows should live
Workflows live in the `./.agents/workflows/` directory as markdown files (e.g., `audit-current-site.md`).

## 7. Where workspace Skills should live
Skills live in the `./.agents/skills/` directory. Each skill gets its own folder (e.g., `./.agents/skills/brand-designer/`), which contains at minimum a `SKILL.md` file, and optionally `scripts/`, `examples/`, or `resources/`.

## 8. How `SKILL.md` should be structured
A `SKILL.md` file must contain:
* YAML frontmatter (name, description for routing).
* Detailed Markdown instructions including:
  * When to use / When not to use.
  * Required inputs.
  * Step-by-step instructions.
  * Constraints.
  * Output format.
  * Examples where useful.

## 9. What belongs in a Rule versus a Workflow versus a Skill
* **Rule:** "Always do X" or "Never do Y." Global constraints and brand tone guidelines that apply to all interactions.
* **Workflow:** "Here is the exact 10-step process to audit a page." Procedural orchestrations for a specific, repeatable outcome.
* **Skill:** "Here is the knowledge and specialized method to act as a Commercial UX Auditor." A focused capability that the agent adopts on-demand, including the specific output formatting and constraints for that capability.

## 10. How browser validation and screenshots should be used
The Antigravity browser subagent is used to validate visual work. It can open pages, check layouts (desktop, tablet, mobile), verify responsive behavior, and capture WebP video recordings or screenshots. Screenshots and recordings serve as mandatory visual evidence of completion. Visible defects found during browser QA must be fixed before marking a task as complete.

## 11. How artifacts should be used as review evidence
Artifacts are special markdown documents created by the agent to present structured information, reports, or plans (e.g., `implementation_plan.md`, `task.md`, `walkthrough.md`). They should be used to log QA checklists, page audits, and orchestration reports. Artifacts act as review evidence for the Manager or the human user to verify the agent's logic, decisions, and completion state.

## 12. Documentation conflicts or version caveats
* **Path Convention:** Some public documentation suggests `.agent/` or `.gemini/`, but the local workspace is clearly initialized using `.agents/`. We will standardize on `.agents/`.
* **Manager Orchestration:** The current environment emphasizes autonomous tool calling under a primary agent, but supports spawning a browser subagent for visual validation. We will orchestrate by using the primary agent to execute Workflows and invoke Skills on demand.

## 13. Recommended orchestration structure for this Jurnii website project
1. **Global Enforcement (Rules):** Define strict commercial tone and design quality gates.
2. **Process Orchestration (Workflows):** Create a master orchestrator workflow and sub-workflows for page auditing, design system updates, and browser QA.
3. **On-Demand Capabilities (Skills):** Implement specialized skills for brand design, frontend polishing, and UX auditing.
4. **Evidence & Tracking (Artifacts):** Use markdown artifacts in `.agents/` to track component backlogs, QA checklists, and the final orchestration report.
