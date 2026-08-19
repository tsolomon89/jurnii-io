---
name: "Write Jurnii Library Articles"
description: "Author and validate substantive, educational Library articles corresponding to public-facing features, solutions, and use cases on the Jurnii platform."
---

# Write Jurnii Library Articles

Use this skill when drafting, revising, or validating substantive educational articles for the Jurnii Library (`content/library/`).

Every article corresponds to a distinct public-facing Product Feature, Solution, or Use Case page on the Jurnii platform, providing deep educational value, commercial analysis, and actionable frameworks for iGaming executives and product leaders.

---

## 1. Prerequisites & Source-of-Truth Hierarchy

Before drafting any article:
1. **Rendered Source Review**: Review the corresponding source route (`content/www/features/*`, `content/www/solutions/*`, or `content/www/use-cases/*`), its rendered components, layout, and purpose.
2. **Context Sources**: Consult canonical context in `.agents/context/`:
   - `.agents/context/brand-guide/00-jurnii-overview.md`
   - `.agents/context/brand-guide/01 · Brand Foundation 35dbbc1fb42481ac9d84de13e4c79327.md`
   - `.agents/context/brand-guide/02 · Market Context & Category Definition 35dbbc1fb42481b29bc7ec4dc14b726f.md`
   - `.agents/context/brand-guide/03 · Strategic Narrative & Messaging Pillars 35dbbc1fb42481868119cc1fb1f1f334.md`
   - `.agents/context/brand-guide/04 · Ideal Customer Profiles 35dbbc1fb4248162b08cd9e26c2ff03e.md`
   - `.agents/context/brand-guide/05 · Product Messaging 35dbbc1fb42481d3b4ddfce531fdf117.md`
   - `.agents/context/brand-guide/06 · Brand Personality & Tone of Voice 35dbbc1fb4248175b083f06c2691693e.md`
   - `.agents/context/commercial-ontology-guide/01-ontology-and-grammar.md`
3. **Application State & Roadmaps**: Preserve the distinction between live and roadmap capabilities. Never present roadmap features as currently available.

---

## 2. Article Requirements & Targets

- **Length**: 1,000 to 3,000 words (excluding front matter). Target 2,500 to 3,000 words. Every paragraph must provide substantive domain analysis, economic frameworks, or technical explanation. No padding or repetitive prose.
- **Audience**: Senior commercial strategists, C-suite (CMO, CPO, COO, CFO), and operational leaders in iGaming, sports betting, and digital gaming.
- **Language**: British English (e.g., *optimise*, *prioritise*, *behaviour*, *modelling*, *categorised*).
- **Voice**: Calm authority, commercially literate, precise, objective, evidence-based. Active voice and present tense.
- **Commercial Connection**: Connect every technical or usability concept directly to financial consequences: Net Gaming Revenue (NGR), Customer Acquisition Cost (CAC), Lifetime Value (LTV), First Time Deposits (FTDs), margin protection, and churn.
- **CTA**: Conclude with a natural path towards a demo or discovery session without converting the article into generic sales copy.

---

## 3. Front Matter & SEO Schema

Every article must use Gray-Matter YAML front matter strictly adhering to the Library `PostSchema`:

```yaml
---
title: "On-Page Title (Clear, Specific, Value-Led)"
description: "Meta description between 145 and 155 characters summarizing the core commercial insight and mechanism."
excerpt: "1-2 sentence executive summary matching or elaborating on the description."
date: 'YYYY-MM-DD'
medium: Article
category: "Category Name"
author: "Fraser Dunk" # Or "Tristan Dexter" or "Jurnii Research"
tags:
  - "Primary Tag"
  - "iGaming"
  - "Secondary Tag"
coverImage: /assets/library/slug-name/cover.png
isIndexable: true
productRefs:
  - "jurnii-ux" # Or "jurnii-360" or "jurnii-mmm"
featureRefs:
  - "feature-slug"
solutionRefs:
  - "solution-slug"
useCaseValueRefs:
  - "use-case-slug"
---
```

### Metadata Standards:
- **SEO Title**: 55 to 60 characters where natural.
- **Meta Description**: 145 to 155 characters.
- **Unique Slugs & Titles**: Every slug, on-page title, and description must be completely unique across the entire library.
- **Publish Date Sequence**: Follow the exact seven-day weekly progression starting `2026-08-18`.

---

## 4. Headings & Document Structure

- **Rendered H1 Rule**: The frontend template (`ArticleTemplate.tsx`) automatically generates the `<h1>` from the front matter `title`. Therefore, **do not include a Markdown `# H1` in the article body**.
- **Body Hierarchy**: Start body sections with `## H2` (descriptive, topical, question- or thesis-driven). Use `### H3` for subsections. Never skip heading levels.
- **Avoid Generic Headings**: Prohibit generic headings like "Introduction", "Overview", "Deep Dive", "Exploring the Topic", or "Conclusion". Use domain-specific headings.

---

## 5. Editorial Prohibitions & Tone Constraints

1. **NO Unicode Em Dash (`—`)**: Use standard hyphens (`-`), colons, commas, semicolons, or parentheses.
2. **NO Meta-Discourse**:
   - ❌ "In this article", "This guide will explore", "We will discuss", "As mentioned above", "In the following section", "Let's dive in", "Read on to discover", "In conclusion", "It is worth noting".
3. **NO Generic AI Openings & Buzzwords**:
   - ❌ "In today's fast-paced digital landscape", "The world of", "When it comes to", "Navigating the complexities of", "Unlock the power of", "Delve into", "A game-changer", "Revolutionary", "Cutting-edge", "Seamless", "Robust", "Leverage" (as verb), "Holistic", "Best-in-class".
4. **NO Fabricated Evidence**:
   - ❌ No fake quotations, unverified customer outcomes, invented metrics, or fabricated case studies.
   - Use fixed canonical proof points (e.g., 70+ recommendations, 4 key dimensions, 1,000+ offers tracked per week, 35 markets monitored, 40+ hours saved per week).
5. **NO Rhetorical Padding**:
   - ❌ No repetitive "not only X, but also Y" constructions or three-part rhetorical lists repeated mechanically across sections.

---

## 6. Linking Rules

- **Source Route Link**: Every article must link naturally to its corresponding source route (e.g., `/features/competitor-promotions` or `/solutions/competition-discovery`).
- **Internal Product & Article Links**: Link to relevant parent products (`/products/jurnii-ux`, `/products/jurnii-360`, `/products/jurnii-mmm`) and related Library articles.
- **Anchor Text**: Use descriptive, natural anchor text reflecting the target entity.

---

## 7. Deterministic Mechanical Validation & Workflow

Before marking an article validated, run the deterministic validator:
```bash
node scripts/validate-library-articles.mjs
```

The script verifies:
1. Front matter schema conformance (PostSchema).
2. Unique titles, slugs, and meta descriptions.
3. Word count between 1,000 and 3,000 words.
4. Absence of Unicode em dashes (`—`).
5. Absence of prohibited meta-discourse and AI cliché phrases.
6. Proper heading hierarchy (no body H1, no skipped heading levels).
7. Resolution of internal links and corresponding source route links.
8. Seven-day publication date progression.

---

## 8. Resuming from the Manifest

When executing in batches:
1. Open `.agents/manifests/library-article-manifest.json` (or `.agents/manifests/library-articles.md`).
2. Identify the first row with status `pending` or `drafting`.
3. Set status to `drafting`.
4. Draft the complete article in `content/library/<slug>.md`.
5. Run the validator: `node scripts/validate-library-articles.mjs`.
6. Run `npm run build` and verify rendering on the local dev server.
7. Mark status `validated` and proceed to the next row.
