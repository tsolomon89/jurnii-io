# Journey.io / Jurnii.io Agents Configuration

This `.agents` directory serves as the mission control and project configuration hub for Google Antigravity agents working on the Journey.io / Jurnii.io website redesign and rebuild project.

## Agent Architecture
This configuration is built strictly on the current Google Antigravity standards:
- **Rules (`.agents/rules/`)**: Persistent, always-on constraints (e.g., coding standards, safety controls, commercial ontology).
- **Workflows (`.agents/workflows/`)**: Orchestration files with YAML frontmatter, executable via slash-commands (e.g., `/audit-current-site`, `/plan-redesign`), to perform structured tasks.
- **Skills (`.agents/skills/`)**: On-demand reusable instructions (currently leveraging nested skills in `.agents/context/commercial-ontology-guide/agents/skills/`).

## Project Context
The base site files we are working from and iterating upon are located in `.agents/example/`. All future components, redesign steps, and rebuild architectures must align with the rules established here.

## Documentation Consulted
During the creation of this setup, the following Antigravity and Agent concepts were reviewed from official documentation:
- The preference for `.agents` (plural) as the root folder.
- Storing agent rules as Markdown files in the `rules` folder.
- Structuring workflows with YAML frontmatter blocks (`name`, `description`) to enable IDE slash-commands.
- Limiting the creation of `.agents/skills` to strictly on-demand capabilities to prevent bloat.

## Existing Setup Preserved
The existing commercial ontology setup and nested skills found in `.agents/context/commercial-ontology-guide/` have been fully preserved to avoid breaking any established reference architectures.
