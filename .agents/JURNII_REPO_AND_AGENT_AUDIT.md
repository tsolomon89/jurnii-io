# Jurnii Repo and Agent-System Audit

## Framework / Stack
The website uses a vanilla, static architecture:
* **HTML:** Pure HTML5 files for structure.
* **CSS:** Vanilla CSS without a preprocessor (no Sass/Tailwind).
* **JS:** Vanilla JavaScript for minor interactive components (e.g., dropdowns) and Lucide for icons. No JavaScript bundler or NPM build step is evident in the root directory.

## Route Structure
The routing structure relies on physical `.html` files organized into logical domain directories:
* `/` (root)
* `/products/`
* `/features/`
* `/solutions/`
* `/use-cases/` (further segmented by `/industry/` and `/role/`)

## Page Inventory
* **Root:** `index.html`
* **Products:** `jurnii-ux.html`, `jurnii-360.html`, `cortex.html`
* **Features:** `journeys.html`, `promotions.html` (and potentially others)
* **Solutions:** `ux-benchmarking.html`, `conversion-optimisation.html`, `competitor-intelligence.html`
* **Use Cases:** `operators.html`, `cpo.html`

## Component Inventory
Given the absence of a UI framework (e.g., React or Vue), components are implemented as raw, copy-pasted HTML snippets defined by CSS classes:
* `nav` (Navigation bar with dropdowns)
* `hero` (Hero section with dashboard artifact variant)
* `problem-card` (Three-column product breakdown)
* `artifact-browser-frame` (Visual mockup representation)
* `footer` (Site footer)

## Styling System
* Custom vanilla CSS.
* **Core files:** `assets/site.css` (layout, component styles) and `assets/colors_and_type.css` (design tokens).

## Token/Theme Files
Tokens are stored as CSS variables in `assets/colors_and_type.css`.
* Defines primitive scales (Concrete neutral scale, Jurnii Green, Blue Dianne).
* Maps primitives to semantic tokens for light (`data-theme="light"`), dark (`data-theme="dark"`), and legacy (`data-theme="jurnii-v1"`) themes.
* Defines typographic scales, font families (Geist, Geist Mono), radii, and 4px-grid spacing variables.

## Existing Agent Folders
The workspace uses the `.agents/` path convention.
* Includes subdirectories for `rules/`, `workflows/`, `skills/`, `context/`, and `example/`.

## Existing Rules
Found in `.agents/rules/`:
* `coding-standards.md`
* `content-and-ontology.md`
* `page-depth-standards.md`
* `project-context.md`
* `safety-and-change-control.md`
* `website-redesign-standards.md`

## Existing Workflows
Found in `.agents/workflows/`:
* `audit-current-site.md`
* `build-interface-artifact.md`
* `build-page-visual-system.md`
* `generate-nanobanana-assets.md`
* `implement-page.md`
* `plan-redesign.md`
* `qa-before-handoff.md`
* `review-page.md`
* `visual-qa.md`

## Existing Skills
Found in `.agents/skills/`:
* `interface-artifact-design`
* `nanobanana-image-generation`
* `svg-diagram-design`
* `visual-qa`
* `web-design`
* `writing`

## Existing Brand/Content Files
Found in `.agents/context/`:
* `brand-guide/`
* `commercial-ontology-guide/`

## Scripts Previously Used
Mechanical updates to global components (nav, footer) and mass generation tasks were previously handled by JavaScript scripts in the root directory:
* `fix_links.js`
* `update_footer.js`
* `update_nav.js`
* `validate_links.js`
* `generate_deep_site.js` (Note: This type of mass-generation script is an anti-pattern for the new redesign rules).

## Current Design-System Weaknesses
* **Duplication & Brittleness:** Shared elements like the navigation and footer are hardcoded into every HTML file and rely on brittle Node scripts (`update_nav.js`) to stay synchronized. Modifying a class name in the nav breaks the script.
* **Lack of Isolation:** CSS is global. Modifying an `artifact-card` style could unintentionally break layouts on other pages.
* **Generic Implementations:** Current components like `problem-card` are standard and lack the premium, deep-tech intelligence feel required by the brand.

## Current UX/Design Weaknesses
* While the layout is functionally acceptable, the visual polish is lacking.
* Insufficient use of "dark strategic hero moments" and dynamic interactive states.
* It does not immediately read as a high-end, board-ready, enterprise iGaming platform.

## Risks Before Redesign
* **Process Conflict:** Running existing workflows might conflict with the new Antigravity Orchestration process we are defining. The legacy rules might misalign with the strict anti-script generation and brand-tone requirements.
* **Script Breakage:** Restructuring the HTML could break the existing maintenance scripts (`update_nav.js`, `update_footer.js`). The new design system must either account for these scripts or document a manual update procedure.
* **Hallucinated Copy:** Without strict enforcement of the brand context rules, agents might attempt to fill redesigned sections with generic SaaS boilerplate instead of canonical Jurnii intelligence claims.
