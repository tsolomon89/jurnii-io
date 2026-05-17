---
name: Browser Design QA
description: Validates visual work using the browser subagent to ensure responsive behavior, contrast, and layout integrity.
---

# Browser Design QA

## When to use
Use when validating visual work after frontend implementation to ensure it meets quality gates across all devices.

## When not to use
Do not use before the implementation is complete, or for functional code unit testing.

## Required inputs
* The local URL or file path of the redesigned page.

## Step-by-step instructions
1. **Launch Subagent:** Start the browser subagent directed at the target page.
2. **Desktop Check:** Verify layout at 1280px+. Check above-the-fold CTA visibility, spacing rhythm, and contrast.
3. **Tablet Check:** Verify layout at 768px. Check for proper reflow and no horizontal overflow.
4. **Mobile Check:** Verify layout at 375px. Check mobile stacking, touch target sizes, and navigation collapse.
5. **Capture Evidence:** Capture screenshots (Desktop, Tablet, Mobile) or a WebP video walkthrough.

## Constraints
* Must check all three primary viewports (desktop, tablet, mobile).
* Must capture screenshots or walkthrough artifacts.
* Must require visible defects to be fixed before marking the review as complete.

## Output format
A QA report artifact detailing checks passed/failed, accompanied by saved visual evidence.

## Examples where useful
* "We just updated the Homepage. Run Browser Design QA to make sure it didn't break on mobile."
