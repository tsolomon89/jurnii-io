# Build Interface Artifact

This workflow defines the systematic process for building a single, complex visual interface component (an "artifact") for a Jurnii page.

## Process

1. **Identify Page Topic**: Understand the core capability being communicated (e.g., Conversion Optimisation, Competitor Tracking).
2. **Identify Ontology Mapping**: Ensure the visual reflects the Jurnii Commercial Ontology (Features, Solutions, Operators, Values).
3. **Choose Visual Metaphor**: Select an appropriate structural metaphor (e.g., a radar sweep, a journey funnel, an attribution node graph).
4. **Sketch Component Structure**: Write out the layered composition. Examples: A browser frame containing a sidebar, a main SVG diagram area, floating metric cards, and dashed signal layers.
5. **Implement HTML/CSS/SVG**: 
   - Construct the artifact using native HTML structure and inline SVG where needed.
   - Use the Jurnii `artifact-*` CSS classes (e.g., `.interface-artifact`, `.artifact-shell`, `.artifact-floating-card`).
   - Do not use generic images as a substitute for structural HTML layout.
6. **Ensure Mobile Fallback**: Ensure the artifact responds gracefully on narrow viewports, either by stacking elements or relying on a responsive `viewBox`.
7. **Check Accessibility**: Ensure SVGs have titles and critical metrics are available to screen readers.
8. **Report Files Changed**: Document the new HTML partials or CSS additions.
