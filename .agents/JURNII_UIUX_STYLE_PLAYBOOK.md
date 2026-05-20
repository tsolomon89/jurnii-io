# Jurnii UI/UX Style Playbook

This playbook defines the definitive design taste and visual aesthetic for Jurnii.io. Use this reference to calibrate your output during design sprints.

## 1. What Jurnii should feel like visually
* **Calm Authority:** Clean, data-forward, and extremely confident. 
* **Enterprise Intelligence:** It should look like a $100k/year platform used by trading directors and C-level executives.
* **Structured:** High contrast, sharp typography (Geist/Geist Mono), and meticulous spacing.
* **Strategic:** Dark themes for arguments and product positioning; light themes for data clarity.

## 2. What Jurnii should not feel like
* **Not a Startup:** No playful illustrations, no blob shapes, no consumer-app softness.
* **Not a Generic SaaS:** Avoid standard templates (e.g., white cards with a generic blue/purple gradient).
* **Not a Web3/Cyberpunk App:** Avoid excessive glowing effects, neon grids, or overly complex background patterns.
* **Not an Agency Portfolio:** Avoid massive decorative typography and scroll-jacking.

## 3. Good Section Archetypes
* **The Split Argument:** 50/50 layout. Left side makes a dark, high-contrast commercial argument. Right side shows a hyper-specific, high-fidelity intelligence panel.
* **The Data Strip:** A full-width dark or brand-green band highlighting 3 undeniable metrics in Geist Mono.
* **The Elevated Product Grid:** Off-white background with crisp, white product cards featuring subtle borders and structured data (not just text).

## 4. Bad Section Archetypes
* **The "Features" Wall:** 6 identical cards with centered generic icons and two lines of text.
* **The Centered Paragraph:** A massive block of centered text spanning 800px with no visual anchors.
* **The Alternating Zebra Striping:** Mindlessly alternating white and light-grey sections just to break up the page.

## 5. Hero Patterns
* **Dark Background:** Always use the dark brand color (`#252c1e` or `#2a2a27`).
* **Grid Layout:** 2-column. Left: Kicker, H1, Subhead, CTA. Right: A high-fidelity visual anchor (dashboard snippet).
* **Avoid:** Single-column centered text over a generic background image or flat color.

## 6. Intelligence Panel Patterns
* Mockups of structured data, not abstract graphics.
* Use Geist Mono for data points.
* Use subtle borders to define containers.
* Use Brand Green for Jurnii's data, neutral grey for competitor/baseline data.

## 7. Card Patterns
* **Product/Feature Cards:** Left-aligned. Icon (if used) is small and structural. Strong typography hierarchy (kicker -> title -> description). Include a clear arrow or "Explore" meta footer.
* **Hover States:** Subtle lift or border color change. No aggressive scaling or spinning icons.

## 8. Metric/Proof Patterns
* Large typography (Geist Mono).
* Always paired with a specific context label.
* Should feel like an extract from a dashboard.

## 9. Cross-linking Patterns
* Visually distinct from regular feature cards.
* Use a `.feature-link-card` class with a specific variant (`.product`, `.related`, `.solution`).
* Must include clear affordance (arrow).

## 10. Feature-page Patterns
* Start with the Commercial Problem.
* Show the Mechanism (how it works).
* Provide Evidence (metrics, panels).
* End with a targeted CTA.

## 11. Product-page Patterns
* Similar to Feature pages but heavier, more authoritative.
* Extensive use of dark backgrounds for overarching product philosophy.
* Deep-dive data sections on light backgrounds.

## 12. CTA Patterns
* Primary: Brand Green background, Dark Text.
* Secondary: Ghost button (white border on dark, dark border on light).
* Always actionable ("Book a Demo", not "Click Here").

## 13. Mobile Rules
* Ensure complex `.feature-hero-grid` layouts stack elegantly.
* Avoid horizontal scrolling unless explicitly designed for it (e.g., a data table).
* Ensure touch targets are at least 44px.
* Maintain contrast ratios.

## 14. Common Design Failures
* **Failure:** Using inline styles (`style="margin-bottom: 24px;"`). **Fix:** Abstract to a CSS class.
* **Failure:** Everything is Brand Green. **Fix:** Restrict green to CTAs and specific highlights.
* **Failure:** Flat hierarchy. **Fix:** Use font-size, weight, and color to guide the eye.

## 15. Final Design Acceptance Criteria
* Is it structurally semantic?
* Does it use `site.css` exclusively?
* Does it pass the JURNII_VISUAL_CRITIQUE_CHECKLIST with a score of 9+?
* Would a C-suite executive find it credible?
