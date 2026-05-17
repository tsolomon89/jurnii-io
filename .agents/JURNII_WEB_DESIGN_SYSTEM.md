# Jurnii Web Design System

## Design Principles
* **Calm Authority:** Clean, data-forward, confident design. Premium, board-ready aesthetic without decorative excess.
* **Commercial Precision:** Design choices must guide the user to commercial conclusions (NGR, churn, conversion).
* **Not a Startup:** Avoid generic SaaS templates, cyberpunk illustrations, and excessive micro-animations.

## Colour Tokens
* **Dark Brand Backgrounds:** Primary Hero (`#252c1e`), Secondary Dark (`#2a2a27`). Used for strategic arguments and authority moments.
* **Light Product Backgrounds:** Off-white (`#f8f8f7`), Elevated White (`#ffffff`). Used for product explanations and data clarity.
* **Brand Green Accent:** Jurnii Green (`#94ff96`), Deep Green (`#10d03a`). Used for CTAs, data highlights, and hero emphasis. High visibility, but do not overuse.
* **Text:** Dark text (`#2a2a27`) on light backgrounds, Light text (`#f8f8f7`) on dark backgrounds. Muted text (`#807f77`).

## Typography Rules
* **Primary (Geist):** Clean, modern sans-serif. Used for all headings, body text, UI labels, and navigation.
* **Accent (Cormorant Garamond):** Italic weight only. Used strictly for rare editorial emphasis (max one per page) like pull quotes or hero sub-headings. Never body text or UI.
* **Data (Geist Mono):** Used for data labels, numerical outputs, code references, and metrics.

## Spacing Scale
* Based on a 4px grid.
* Standard sections use `--section-padding-y: 96px`.
* Containers use `--container-padding-x: 24px`.

## Section Types
### Hero System
* Dark background (`#252c1e`).
* Headline (makes a category argument), Sub-headline (mechanism), Social proof metric, CTA.
* Visual: Abstract intelligence layer graphic or dashboard mockup.

### Light Product/Data Section System
* Off-white background (`#f8f8f7`).
* Elevated white (`#ffffff`) for product cards or data panels.
* Used to explain features, show tables, and detail the product offering.

## Component Library (Expected)
* **Cards:** Product proof cards with elevated white background, subtle border, Geist typography.
* **Metric Strips:** Full-width or inline blocks showing 3-4 key numbers in Geist Mono.
* **Comparison Tables:** Clean grids comparing Jurnii against "Generic Analytics" or "Manual Agencies."
* **Dashboard Panels:** Mockups of the Jurnii UI focusing on structured data rather than abstract illustrations.
* **Testimonial Blocks:** Editorial pull quotes, potentially using Cormorant Garamond italic.
* **Dark Footer CTA:** A concluding strategic moment on a dark background before the main footer.

## Chart/Data Visualization Rules
* Max 4 colours per chart.
* Jurnii / Client data: Brand Green (`#94ff96`).
* Competitor data: Neutral grey (`#807f77`).

## CTA Styles
* Primary CTAs: Brand Green background, Dark Text.
* Must be specific ("Book a Demo", "Explore Jurnii 360").

## Responsive Rules
* **Desktop:** 1280px+ (Standard layout)
* **Tablet:** 768px (Adjust grid columns, maintain hierarchy)
* **Mobile:** 375px (Stack all multi-column layouts, enlarge touch targets, collapse navigation)

## Accessibility Requirements
* Contrast ratios must meet WCAG AA standards (especially for Brand Green on white/dark).
* Interactive elements must be clearly identifiable and keyboard navigable.
