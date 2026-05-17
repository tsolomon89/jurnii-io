---
name: Frontend Polish Implementer
description: Implements high-quality HTML/CSS design improvements within the existing vanilla stack.
---

# Frontend Polish Implementer

## When to use
Use when implementing design improvements, updating HTML structure, or applying CSS tokens to a page.

## When not to use
Do not use for deciding *what* the visual design should be (use Brand Designer) or for generating new page copy.

## Required inputs
* Output from Commercial UX Auditor and Jurnii Brand Designer
* Existing `assets/site.css` and `assets/colors_and_type.css` files
* Target `.html` file

## Step-by-step instructions
1. **Inspect Existing Stack:** Review the target HTML and the global CSS files to understand existing class names and structures.
2. **Prefer Reusable Components:** Check the `JURNII_COMPONENT_BACKLOG.md` to see if a standard component (e.g., `problem-card`, `metric-strip`) already exists for this use case.
3. **Apply Changes:** Edit the HTML and CSS to match the design brief. Avoid adding new dependencies or inline styles. Use existing data-theme tokens.
4. **Preserve Functionality:** Ensure that shared layout elements (nav, footer) remain compatible with existing maintenance scripts if modified.

## Constraints
* Must inspect existing stack first.
* Must prefer reusable components.
* Must avoid unnecessary rewrites of working code.
* Must avoid adding new dependencies (e.g., Tailwind, React) unless explicitly justified and approved.

## Output format
Modified HTML/CSS code or detailed patch instructions.

## Examples where useful
* "Implement the new dark strategic hero on the Jurnii UX page."
* "Refactor these standard cards into the new 'product proof card' component."
