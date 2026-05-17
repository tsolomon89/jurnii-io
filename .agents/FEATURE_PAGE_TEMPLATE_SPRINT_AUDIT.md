# Feature Page Template Design Audit

## Overview
This audit evaluates the current structural and visual patterns used across `/features/*.html` pages (with `journeys.html` as the canonical reference) and establishes the design system requirements for the template upgrade sprint.

## Current State Analysis

### Reusable Classes Used
Currently, feature pages rely on a very limited set of generic structural classes:
- `.page-hero`
- `.section`, `.section.bg-slate`
- `.h2-section`, `.section-head`
- `.feature-grid`
- `.feature-cell` (used universally for capabilities, products, solutions, and personas)
- `.card-meta`

### Visual Weaknesses
- **Hero Weakness**: The hero is a single-column, centered text block. It lacks a commercial intelligence feel, missing structured data, visual anchors (like a dashboard or diagnostic panel), and premium contrast.
- **Problem Section**: Displayed as a centered paragraph. It lacks visual weight and fails to anchor the commercial consequence.
- **Card-System Issues**: Every cross-link and capability uses `.feature-cell`. This flattens the hierarchy. Linking to a core product (Jurnii UX) looks identical to linking to a related feature (Performance). 
- **Rhythm**: Alternating `.section` and `.section.bg-slate` with `.feature-grid` creates a monotonous "agency brochure" rhythm rather than a structured intelligence platform experience.

### Repeated Inline-Style Patterns
Inline styles are heavily scattered and must be extracted into classes:
- `style="margin-top: 32px;"` (Hero CTA row)
- `style="max-width: 600px; margin-bottom: 24px;"` (Section ledes)
- `style="margin-bottom: 24px;"` (Section headers)
- `style="text-decoration: none; color: inherit; display: block;"` (Cross-link anchor tags)
- `style="width:14px;height:14px;"` (Lucide icons in `.card-meta`)

### Mobile Risks
- The current `.feature-grid` may not have robust stacking contexts if the inner cards become more complex (e.g., adding `.feature-commercial-panel`).
- A complex two-column hero (`.feature-hero-grid`) risks horizontal overflow or awkward stacking if not explicitly managed for `<1024px` and `<768px`.

## Proposed Reusable CSS System

We will implement the following class system in `assets/site.css`:

### 1. Hero
- `.feature-hero`: High-contrast dark wrapper.
- `.feature-hero-grid`: 2-column layout (copy + visual).
- `.feature-hero-copy`: Typography control for kicker, title, and lede.
- `.feature-hero-visual`: Container for the diagnostic panel.
- `.journey-map-panel`: The specific right-side visual for Journeys.

### 2. Commercial Problem
- `.feature-problem-layout`: 2-column split (left: problem, right: commercial impact/proof).
- `.feature-commercial-panel`: The right-side evidence card.

### 3. Capabilities
- `.feature-capability-grid`: Structured grid for capabilities.
- `.feature-capability-card`: Upgraded from `.feature-cell` with Jurnii-specific hierarchy, sharper spacing, and distinct commercial implication text.

### 4. Cross-Linking System
- `.feature-link-section`: Wrapper for linking blocks.
- `.feature-link-grid`: Layout controller.
- `.feature-link-card`: Base card component.
  - `.feature-link-card.product`: Premium, substantial (e.g., dark border, distinct hover).
  - `.feature-link-card.related`: Compact, polished.
  - `.feature-link-card.solution`: Focuses on commercial problem.
  - `.feature-link-card.persona`: Role/industry specific styling.
- `.feature-card-meta`: Standardized link/arrow footer.

## Pages Affected
- `features/journeys.html` (Pass 2 Target)
- `features/promotions.html` (Pass 3 Target)
- Any other feature pages dynamically sharing this structure.

## Implementation Plan (Pass 2)
1. **CSS Construction**: Build out the proposed class system in `site.css`.
2. **HTML Refactoring**: Apply the new classes to `features/journeys.html`, strictly maintaining content and sequence.
3. **Hero Visual**: Build the structured `.journey-map-panel` (registration → deposit → bet flow with friction indicators) using HTML/CSS (no abstract blobs).
4. **Cleanup**: Remove all target inline styles.
5. **QA**: Run local browser subagent testing on Desktop, Tablet, and Mobile.
6. **Reporting**: Produce `.agents/FEATURE_PAGE_JOURNEYS_QA.md` upon completion.
