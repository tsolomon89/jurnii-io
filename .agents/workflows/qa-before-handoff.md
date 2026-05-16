---
name: qa-before-handoff
description: Final QA check before human review or deployment
---

# Workflow: QA Before Handoff

**Purpose**: Final QA before the user reviews or deploys.

Execute these final validation steps:

1. **Run Automation**: Run available lint, type, build, and test commands.
2. **Check Routes**: Check changed routes and pages to ensure they render correctly.
3. **Check Errors**: Verify there are no console errors or build warnings.
4. **Security Check**: Confirm no secrets, `.env` files, or unintended files were modified.
5. **Summarize Changes**: Provide a clear summary of what changed.
6. **Human Review Items**: Summarize what aspects still need human review or approval.
