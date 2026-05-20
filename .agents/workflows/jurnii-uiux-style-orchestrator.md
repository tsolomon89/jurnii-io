---
name: jurnii-uiux-style-orchestrator
description: The single command to run a premium UI/UX web-design sprint with specialist design roles.
---

# Workflow: Jurnii UI/UX Style Orchestrator

**Purpose:** Orchestrate a rigorous multi-agent design studio workflow. This workflow executes a series of specialized design passes to ensure the output is not just structurally correct, but visually premium, highly commercial, and strictly aligned with Jurnii's brand.

## When to use
Use this for any premium design sprint, template upgrade, or page visual overhaul. 

## Command Syntax
`/jurnii-uiux-style-orchestrator [prompt]`
Example: "Run a style-only sprint on `features/journeys.html`. Preserve content. Upgrade the template."

---

## 1. Context Intake
**Identify:**
- Target page/template and associated files.
- The page's commercial purpose.
- The scope of the sprint.

**Explicitly define the rules of engagement:**
- Content changes allowed? (Default: No)
- Layout changes allowed? (Default: Yes)
- CSS/system changes allowed? (Default: Yes)
- Template propagation allowed? (Default: No, unless specified)

## 2. Principal UI/UX Critique
*Load Skill: `principal-uiux-designer`*

Critique the existing page before any implementation begins. Evaluate the first impression, visual hierarchy, section rhythm, information density, and premium B2B credibility.

**Output:** A Markdown table assessing: Area | Current weakness | Why it matters | Design move.

## 3. Brand Visual Director Pass
*Load Skill: `jurnii-visual-director`*

Translate the Jurnii brand into a visual direction. Define the dark/light section strategy, typography hierarchy, card/panel style, and CTA approach. Explicitly reject generic SaaS aesthetics, AI blobs, and decorative icon grids.

**Output:** A visual direction memo.

## 4. Design Systems Architect Pass
*Load Skill: `design-systems-architect`*

Define the reusable pattern before writing CSS. Evaluate which classes exist, which should be reused, which should be created, and which inline styles must be removed.

**Output:** A CSS implementation plan detailing proposed class names and file targets.

## 5. Commercial UX Strategist Pass
*Load Skill: `commercial-ux-strategist`*

Ensure the visual design supports the commercial argument. Verify buyer relevance, proof hierarchy, and CTA paths. (Do not rewrite content unless explicitly permitted).

**Output:** A Commercial UX review memo.

## 6. Frontend Style Implementer Pass
*Load Skill: `frontend-style-implementer`*

Execute the approved visual direction and CSS plan in static HTML/CSS.
- Prefer `assets/site.css`.
- Remove inline styles.
- Preserve content unless allowed.
- Keep changes reviewable and avoid script-based generation.

**Output:** Implementation summary and file changes.

## 7. Browser Design Critic Pass
*Load Skill: `browser-design-critic`*

Open the implemented page in the browser subagent. QA desktop, tablet, and mobile. Review hierarchy, contrast, spacing, and whether it actually looks premium.
**Crucial:** This pass CAN and SHOULD reject the implementation if it fails the premium bar, returning a fix list to the Implementer.

**Output:** Pass/Fail QA report with visual evidence.

## 8. Final Creative Director Review
*Load Skill: `creative-director-review-board`*

Final taste gate. Ask: Is this meaningfully better? Does it feel like Jurnii? Would a CPO/CMO at an iGaming operator trust this? Is the design system stronger?

**Output:** Final approval or required revisions. The sprint is not complete until this passes.
