# 03 — Design System and Rationale

The Jurnii visual and UX system is built to establish trust, demonstrate absolute technical precision, and make dense, complex operational metrics immediately readable.

## Design Choices & Business Rationale

| Design Choice | Where it appears | Why it matters (Business Reason) |
|---|---|---|
| **Dual-Theme Progression (Dark to Light)** | Homepage, Product Heroes, and Solutions pages. | **Dark heroes** build high-contrast visual authority and frame premium dashboard mockups. This transitions to **light data sections** to make scorecards and tables readable and easy to scan, keeping visitors engaged. |
| **Color Palette (Concrete Neutral, Jurnii Green, and Blue Dianne Teal)** | **Concrete** (`#f8f8f7`) for backgrounds. **Jurnii Green** (`#94ff96`) for accents. **Blue Dianne** (`#31484b`) for dark themes. | **Concrete** prevents visitor eye fatigue. **Jurnii Green** is used strictly for CTAs and positive metrics to draw immediate focus to conversion actions. **Blue Dianne** avoids generic "black" layouts, establishing a professional, premium institutional feel. |
| **Geist Sans Serif Typography** | Headings, sub-headings, and body text. | A highly legible variable font that keeps multi-metric tables, matrices, and comparative lists sharp, clean, and board-ready. |
| **Cormorant Garamond Editorial Accent** | Strategic eyebrows and italic accents. | Adds a premium, editorial editorial touch to high-level positioning claims, setting Jurnii apart from generic, hyper-casual SaaS software templates. |
| **Geist Mono Data Typography** | Scorecard gauges, data metrics, and technical labels. | Visually reinforces that Jurnii is an automated data platform, ensuring that scores and figures look highly technical and trustworthy. |
| **Dynamic Semicircle Gauges** | Homepage Hub, Product Scorecards, and Solutions pages. | Translates abstract, numbers-heavy performance tables into simple, color-coded visual grades (Average, Poor, Excellent) that executives can scan in 2 seconds. |
| **Active Signal Path SVGs** | Hero browser mockups and product diagrams. | Visually demonstrates the "combining mechanism" of Jurnii UX and Jurnii 360 flowing into Cortex without using heavy, slow video assets or lengthy text descriptions. |
| **Lucide Icon Wayfinding** | Dropdown navigation panels, features grids, and metric cards. | Guides the visitor's eye to categorize features and solutions instantly, reducing navigation friction. |

---

## Practical UX Rationale
* **Data-First over Jargon:** Operators do not buy vague promises. They buy data. The design prioritizes structured data panels, cards, and live comparison tables over decorative stock imagery or generic illustrations.
* **Frictionless Navigation:** Custom dropdown columns are organized strictly by operational silos (e.g., Competitor feeds, Usability performance). This lets a VP of CRM or CMO jump directly to their exact interest area in one click.

---

## Implementation reference

Main files reviewed:
* `assets/colors_and_type.css` (Primitive and semantic tokens for light/dark/v1 themes, fonts, scales)
* `assets/site.css` (Grids, responsive styling, interactive hub components)
* `assets/animations.js` (Micro-interaction styles)
