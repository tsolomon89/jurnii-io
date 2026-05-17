# Feature Page Template Propagation Plan

## List of Feature Pages
- `features/journeys.html` (Upgraded)
- `features/promotions.html` (Pending)
- `features/indices.html` (Pending)

## Compatibility Assessment

### Pages Ready for Direct Template Adoption
**`features/promotions.html`**
- **Assessment**: Can use the template directly. The structure is perfectly 1:1 with the original `journeys.html` (Problem -> Capabilities -> Products -> Related -> Solutions -> Built For).
- **Required Changes**:
  - Apply `.feature-hero-grid` and create a custom `.feature-hero-visual` (e.g., a `.promotions-feed-panel` showing mocked promotional mechanics parsing).
  - Apply `.feature-problem-layout` and `.feature-commercial-panel` to the problem section.
  - Convert generic `.feature-cell` blocks to `.feature-capability-card` and `.feature-link-card` variants.

**`features/indices.html`**
- **Assessment**: Can use the template directly.
- **Required Changes**:
  - Follow the same class replacement strategy as above.
  - The custom hero visual could be an `.index-score-panel` (e.g., showing a ranked list or benchmark score vs market average).

## Required Class Changes (Standard Playbook)
To propagate safely without scripts, developers should manually execute these replacements block-by-block on the target page:
1. Replace `<section class="page-hero">` with `<section class="feature-hero">`. Add the 2-column grid and right-side visual.
2. Replace `<section class="section" id="details">` inner container with `.feature-problem-layout`. Add the right-side commercial panel.
3. Replace `.feature-grid` in the capabilities section with `.feature-capability-grid`. Update children from `.feature-cell` to `.feature-capability-card`.
4. Replace `.feature-grid` in cross-linking sections with `.feature-link-grid cols-2`. Update children to the appropriate `.feature-link-card [variant]`.

## Risk Areas
- **Hero Visual Abstraction**: The new `.feature-hero-grid` requires a semantic, hand-coded HTML/CSS visual panel on the right side. Attempting to copy/paste the `journeys.html` map into `promotions.html` will look incorrect. A unique visual must be designed for each page to maintain the enterprise standard.
- **Content Flow**: Some pages might have 4 capabilities instead of 3, which could cause the `.feature-capability-grid` (defaulting to 3 columns) to wrap unevenly. Grid column adjustments might be needed.

## Recommended Next Sprint
**Sprint: Feature Template Rollout**
- **Objective**: Design the custom hero visual panels (`.promotions-feed-panel` and `.index-score-panel`) and apply the full class playbook to `promotions.html` and `indices.html`.
