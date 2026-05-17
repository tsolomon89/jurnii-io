# Workflow: Jurnii Browser UX Review

## Description
Automates visual validation of a redesigned page using the browser subagent.

## Steps
1. **Open Target Page:** Command the browser subagent to open the newly edited `.html` file.
2. **Viewport Testing:** Validate layout across mobile, tablet, and desktop viewport sizes. Check for stacking, overflow, and proper spacing rhythm.
3. **Element Validation:** Verify that the primary CTA is visible above the fold. Check contrast ratios. Verify navigation and footer functionality.
4. **Capture Artifacts:** Record a WebP walkthrough or capture screenshots as evidence of the page's visual state.
5. **Defect Documentation:** Log any visible defects in the page audit artifact. Do not mark the page upgrade as complete until these defects are fixed by returning to the `frontend-polish-implementer` step.
