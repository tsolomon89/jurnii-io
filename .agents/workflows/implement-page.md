---
name: implement-page
description: Implement an approved page redesign
---

# Workflow: Implement Page

**Purpose**: Implement an approved page redesign.

Execute the following steps after a redesign plan has been explicitly approved:

1. **Load Skills**: Explicitly read `.agents/skills/writing/SKILL.md` and `.agents/skills/web-design/SKILL.md`. You must apply the writing constraints when generating copy and the visual identity constraints when generating HTML/CSS.
2. **Read Plan**: Read the approved implementation plan.
3. **Inspect Files**: Inspect all affected files in the repository (typically starting in `.agents/example/` or the live frontend root).
4. **Minimal Changes**: Make only the minimal necessary changes required to fulfill the approved plan.
4. **Maintain Consistency**: Keep the page consistent with the project's coding and styling standards.
5. **No Scope Creep**: Strictly avoid unrelated refactors.
6. **Run Checks**: Run any relevant build, lint, or type checks if available in the repository.
7. **Report**: Report exactly which files were changed, any assumptions made during implementation, and any remaining risks or incomplete tasks.
