# Current Repository Implementation Mapping

> **Mapping Purpose**: This document maps the portable abstractions defined in [`markdown-content-website-architecture.md`](markdown-content-website-architecture.md) directly to concrete file paths, symbols, functions, schemas, and components within this repository (`tsolomon89/websites-monorepo`). Every row in this document constitutes empirical evidence for a claim in the canonical specification.

---

## 1. Architectural Behaviour Traceability Matrix

| Portable Behaviour | Repository Path | Relevant Symbols | Extracted Result | Source Lines | Classification |
| --- | --- | --- | --- | --- | --- |
| **Surface Detection** | [`packages/config/src/surface-utils.ts`](file:///c:/Development/Projects/websites/packages/config/src/surface-utils.ts) | `resolveSurface()`, `getCanonicalUrl()` | Hostname matches tenant surface config in `TENANTS` | — | `[Extracted]` |
| **Edge Header Injection** | [`packages/config/src/middleware-utils.ts`](file:///c:/Development/Projects/websites/packages/config/src/middleware-utils.ts) | `resolveSurfaceHeaders()` | Injects `x-surface-role`, `x-tenant-id`, `x-tenant-domain` | — | `[Extracted]` |
| **File Discovery & Parsing** | [`packages/content-engine/src/utils/markdown.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/utils/markdown.ts) | `getByPath()`, `getContent()`, `matter()` | `fs.readFileSync` + `gray-matter` parses header & body | L41–87 | `[Extracted]` |
| **Folder Contents Listing** | [`packages/content-engine/src/utils/markdown.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/utils/markdown.ts) | `getFolderContents()` | Reads directory, parses `.md` files, skips `_meta.json` and `_` prefixed | L89–145 | `[Extracted]` |
| **Medium / Format Resolution** | [`packages/config/src/medium-presentation.ts`](file:///c:/Development/Projects/websites/packages/config/src/medium-presentation.ts) | `resolveMediumPresentation()`, `toCanonicalMedium()` | Cascades: `medium` → alias keys → section → default | — | `[Extracted]` |
| **Content Meta Inference** | [`packages/content-engine/src/utils/markdown.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/utils/markdown.ts) | `inferContentMeta()` | Infers `contentKind`, `format`, `medium`, `date`, `isIndexable` from path + front-matter | L444–498 | `[Extracted]` |
| **Content Kind Detection** | [`packages/content-engine/src/utils/markdown.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/utils/markdown.ts) | `inferKindFromSection()` | Maps section names to content kinds; unknown defaults to `'article'` | L437–453 | `[Extracted]` |
| **Direct Ref Resolution** | [`sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx) | `relatedItemRefs` construction | Constructs paths from `solutionRefs`, `productRefs`, `featureRefs`, `useCaseValueRefs` → `getByPath()` | L612–637 | `[Extracted]` |
| **Reverse Ref Resolution** | [`packages/content-engine/src/utils/markdown.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/utils/markdown.ts) | `getContentByRef()` | Scans ALL content in given folders, filters by ref field matching value | L253–271 | `[Extracted]` |
| **UseCaseValue Ref Resolution** | [`packages/content-engine/src/utils/markdown.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/utils/markdown.ts) | `resolveUseCaseValueRefs()`, `normalizeLegacyUseCaseRef()` | Strips path prefix via last segment after `/` | L355–366 | `[Extracted]` |
| **UseCaseField Ref Resolution** | [`packages/content-engine/src/utils/markdown.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/utils/markdown.ts) | `resolveUseCaseFieldRefs()`, `normalizeFieldRef()` | Strips path prefix via first segment before `/` | L368–371 | `[Extracted]` |
| **Rich Page Data Construction** | [`packages/content-engine/src/utils/rich-page-data.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/utils/rich-page-data.ts) | `resolveRichPageData()`, `TimothyEntityPageData` | Combines item data, hero features, deep work, refs with field aliasing | — | `[Extracted]` |
| **Entity Page Data Fields** | [`sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx) | `TIMOTHY_RICH_FIELDS`, `TIMOTHY_ALIASES` | 14 fields + 4 alias mappings for entity data resolution | L214–236 | `[Extracted]` |
| **Entity Ref Mapping** | [`sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx) | `ENTITY_REF_MAP` | `{'products':'productRefs','features':'featureRefs','solutions':'solutionRefs','use-cases':'useCaseValueRefs'}` | L198–203 | `[Extracted]` |
| **Entity Label Mapping** | [`sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx) | `ENTITY_LABEL_MAP` | `{'products':'Content Types','features':'Domains','solutions':'Topics','use-cases':'Audiences'}` | L205–210 | `[Extracted]` |
| **Markdown → HTML** | [`packages/content-engine/src/utils/markdown.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/utils/markdown.ts) | `marked.parse()`, `markedKatex` | `marked.use({ gfm: true, breaks: true })` + KaTeX `{ throwOnError: false, nonStandard: true }` | L13–15 | `[Extracted]` |
| **Heading ID & TOC** | [`sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx) | `processHeadings()` | Regex h1–3 scan, slugify IDs, build TOC. NO duplicate deduplication | L29–47 | `[Extracted]` |
| **Reading Time** | [`sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx) | `estimateReadTime()` | Strip tags → word count → /200 → ceil → max(1) | L50–53 | `[Extracted]` |
| **PDF Auto-Detection** | [`packages/content-engine/src/utils/markdown.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/utils/markdown.ts) | `getPdfUrl()` | Checks `public/papers/[slug].pdf` → returns `/papers/[slug].pdf` or `null` | L23–32 | `[Extracted]` |
| **OG Image Generation** | [`sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx) | `buildOgUrl()` | Returns `/api/og?title=...&subtitle=...&type=...` | L56–61 | `[Extracted]` |
| **Prose Wrapper** | [`packages/ui/src/components/Prose.tsx`](file:///c:/Development/Projects/websites/packages/ui/src/components/Prose.tsx) | `<Prose html={html} />` | Wraps HTML via `dangerouslySetInnerHTML` in Tailwind Typography container | — | `[Extracted]` |
| **Entity Page Template** | `sites/timothy-solomon-dot-com/components/entity-page/EntityPageTemplate.tsx` | `EntityPageTemplate` | 7-section layout: Hero → Socials → Featured → Curriculum → Quote → Deep Work → Subscribe CTA | — | `[Extracted]` |
| **Entity Directory Template** | [`sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx) | `EntityDirectoryTemplate` | Grid of cards with title, description, href, icon for entity collections | L491–503 | `[Extracted]` |
| **Article & Paper Templates** | [`packages/ui/src/components/library/LibraryTemplates.tsx`](file:///c:/Development/Projects/websites/packages/ui/src/components/library/LibraryTemplates.tsx) | `PaperTemplate`, `ArticleTemplate` | Long-form editorial rendering with distinct header structures | — | `[Extracted]` |
| **Library Subdomain Layout** | `@websites/ui` package | `SharedSubdomainLayout` | Sidebar + TOC + back nav + pubDetails wrapper for library surface | — | `[Extracted]` |
| **Sitemap Generation** | [`packages/content-engine/src/utils/sitemap.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/utils/sitemap.ts) | `getDynamicSitemapEntries()`, `resolveLastModified()` | Traverses content dirs; excludes `isIndexable === false` or `noindex === true`; uses `inferContentMeta()` for date | L65–110 | `[Extracted]` |
| **Homepage Root Route** | [`sites/timothy-solomon-dot-com/app/(homepage)/page.tsx`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/app/(homepage)/page.tsx) | `Page()`, surface branching | Root `/` branches: `www` → `Homepage`, `library` → `SharedSubdomainLayout` index | L46–133 | `[Extracted]` |
| **Brand Token Loading** | [`sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/app/(site)/[...slug]/page.tsx) | `getTokens()` | Reads `brand/tokens.json`, maps to `--c-*` CSS variables, returns `{}` if absent | L71–95 | `[Extracted]` |
| **Brand Token File** | [`sites/timothy-solomon-dot-com/brand/tokens.json`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/brand/tokens.json) | — | 7 color tokens, 3 font stacks, 2 spacing values, 3 border-radius values | — | `[Extracted]` |
| **Typography Stack** | [`sites/timothy-solomon-dot-com/app/layout.tsx`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/app/layout.tsx) | `Inter`, `Newsreader`, `Fira_Code` | `--font-sans`, `--font-serif`, `--font-mono` via `next/font/google` | L10–27 | `[Extracted]` |
| **Top Navigation** | [`sites/timothy-solomon-dot-com/components/layout/Header.tsx`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/components/layout/Header.tsx) | `navigation`, `secondaryNav`, `ctaNav` | Hardcoded link arrays; NOT content-generated; dropdown chevrons but no menus | L6–17 | `[Extracted]` |
| **ContentMeta Type** | [`packages/content-engine/src/types.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/types.ts) | `ContentMeta` interface | 17-field interface; 5 active fields, 7 latent/unused, 3 partially consumed | L28–73 | `[Extracted]` |
| **Robots.txt** | [`sites/timothy-solomon-dot-com/app/robots.ts`](file:///c:/Development/Projects/websites/sites/timothy-solomon-dot-com/app/robots.ts) | `robots()` | Dynamic per-surface; non-indexable surfaces disallow `/`; references sitemap | L5–29 | `[Extracted]` |
| **RSS / Atom Feed** | — | — | NOT FOUND. No `feed`, `rss`, or `atom` route in application directory | — | `[Extracted]` (absent) |


---

## 2. Schema File Mapping

| Portable Family | Repository Schema File | Zod Schema Name | TypeScript Type | Required Fields | Optional/Default Fields |
| --- | --- | --- | --- | --- | --- |
| Product | [`service.schema.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/schemas/service.schema.ts) | `ServiceSchema` | `Service` | `title`, `description` | `features[]` (default `[]`), `icon?`, `featured` (default `false`), `order` (default `99`) |
| Feature/Project | [`project.schema.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/schemas/project.schema.ts) | `ProjectSchema` | `Project` | `description` | `id?`, `name?`, `title?`, `tagline?`, `category?`, `status?`, `date?`, `year?`, `tags[]` (default `[]`), `image?`, `url?`, `link?`, `featured` (default `false`) |
| Editorial (Article/Paper) | [`post.schema.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/schemas/post.schema.ts) | `PostSchema` | `Post` | `title`, `excerpt`, `date` | `author?`, `tags[]` (default `[]`), `category?`, `readTime?`, `coverImage?` |
| General Page | [`page.schema.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/schemas/page.schema.ts) | `PageSchema` | `Page` | `title`, `description`, `template` | `slug?`, `seo?`, `sections?`, `publishedAt?`, `updatedAt?` |
| Case Study | [`case-study.schema.ts`](file:///c:/Development/Projects/websites/packages/content-engine/src/schemas/case-study.schema.ts) | `CaseStudySchema` | `CaseStudy` | `client`, `title`, `summary`, `outcome`, `services[]`, `date` | — |

---

## 3. Content Root File Evidence

| Content Root | Verified Site | Files Found | Evidence |
| --- | --- | --- | --- |
| `content/www/products/` | timothy-solomon-dot-com | `articles.md`, `books.md`, `dialogues.md`, `essays.md`, `notes.md`, `papers.md`, `talks.md`, `_meta.json` | `[Extracted]` dir listing |
| `content/www/features/` | timothy-solomon-dot-com | Multiple `.md` files (e.g. `mathematics.md`, `philosophy.md`) | `[Extracted]` |
| `content/www/solutions/` | timothy-solomon-dot-com | Multiple `.md` files (e.g. `metaphysics.md`, `epistemology.md`) | `[Extracted]` |
| `content/www/use-cases/` | timothy-solomon-dot-com | Multiple `.md` files (e.g. `academia.md`) | `[Extracted]` |
| `content/library/` | timothy-solomon-dot-com | Flat: `bitcoin-and-the-bible.md` + others directly in folder | `[Extracted]` |
| `content/apps/` | timothy-solomon-dot-com | App portfolio items | `[Extracted]` |

---

## 4. Real Content Evidence

### 4.1 Product Entity — `content/www/products/essays.md`
```yaml
entity_type: Product
entity: Essays
medium: Article
title: Essays
description: "Sustained arguments and explorations..."
category: Writing
icon: 'lucide:FileText'
order: 1
featureRefs: [mathematics, philosophy, theology, physics, computation, language]
solutionRefs: [metaphysics, epistemology, hermeneutics, logic]
forUseCases: [academia, media, conferences]
heroFeatures: [{title: "Depth", description: "..."}]
deepWorkFeatures: [{icon: "book-open", title: "Premium Typography", description: "..."}]
pullQuote: "Timothy's essays bring clarity..."
pullQuoteAttribution: "Dr. Sarah Althaus"
```

### 4.2 Editorial Article — `content/library/bitcoin-and-the-bible.md`
```yaml
medium: Article
title: Bitcoin and the Bible
description: "A comparison between..."
date: '2026-04-30'
category: Philosophy
author: Timothy Solomon
tags: [Philosophy, Bitcoin, Theology, Epistemology]
productRefs: [articles]
featureRefs: [philosophy]
solutionRefs: [theology]
useCaseFieldRefs: []
```

### 4.3 Collection Meta — `content/www/products/_meta.json`
```json
{
  "type": "collection",
  "title": "Content Types",
  "description": "Output containers — articles, essays, papers, talks, books, dialogues, and notes.",
  "layout": "grid"
}
```

---

## 5. Architectural Divergences: Extracted vs Target

> The canonical specification (`markdown-content-website-architecture.md`) makes several deliberate `[Target Decision]` divergences from the extracted repository behaviour. This section documents each divergence with the repository evidence for the current behaviour.

| # | Portable Target Decision | Extracted Repository Behaviour | Repository Evidence | Impact on Reproduction |
| --- | --- | --- | --- | --- |
| 1 | **Entity pages render Markdown body** | `EntityPageTemplate` has 7 structured regions from front-matter; no Markdown body region | `EntityPageTemplate.tsx`: Hero → Socials → Featured → Curriculum → Quote → DeepWork → Subscribe CTA | New template region required at position 3 |
| 2 | **Schema validation enforced at build** | Zod schemas exist but `getByPath()` does not validate | `getByPath()` calls `matter()` then returns raw data without schema check | Content loader must add schema validation step |
| 3 | **Absent fields → omit region** | `EntityPageTemplate` fills missing fields with hardcoded theology-themed defaults | `EntityPageTemplate.tsx` L57–85: hardcoded `heroFeatures`, `deepWorkFeatures`, `pullQuote`, `rhsCards` | Remove hardcoded defaults; conditionally render regions |
| 4 | **General pages in `content/www/pages/`** | General pages are any `www` file outside entity sub-folders, rendered by catch-all route | `page.tsx` L666–697: inline `<Prose>` for non-entity items | New `pages/` folder convention with route-prefix stripping |
| 5 | **Portable names** | `TimothyEntityPageData`, `TIMOTHY_RICH_FIELDS`, `TIMOTHY_ALIASES` | `page.tsx` L214–236 | Rename to `EntityPageModel`, `ENTITY_DATA_FIELDS`, `FIELD_ALIASES` |
| 6 | **Two canonical surfaces** | 4 surfaces: `www`, `library`, `apps`, `docs` | Surface config in `sites.ts` | `apps` and `docs` excluded from portable scope |

---

## 6. Claimed Behaviours NOT Found in Repository

| Claimed Behaviour | Searched Evidence | Result | Prior Classification | Corrected Classification |
| --- | --- | --- | --- | --- |
| JSON-LD structured data | Grep for `json-ld`, `application/ld+json`, `structuredData` | Not found in site code. Deprecated SEO doc confirms "Not currently implemented" | `[Extracted]` | `[Unverified]` |
| `GeneralPageLayout` fallback component | Grep for `GeneralPageLayout`, `GeneralPage` | Not found. Non-entity pages render inline in `page.tsx` L666–697 | `[Extracted]` | `[Unverified]` — INVENTED |
| `RouteCollisionError` | Grep for `RouteCollision`, `collision` | Not found. `getByPath()` uses file-first resolution, no collision detection | `[Extracted]` | `[Unverified]` — INVENTED |
| Duplicate heading numeric suffixes | Read `processHeadings()` | No deduplication logic. Same text = same ID | `[Extracted]` | `[Unverified]` — INVENTED |
| Editorial pagination (12 items/page) | Grep for `pagination`, `page`, `12` in content rendering | No pagination in content website. Only in unrelated `control-plane-admin` | `[Extracted]` | `[Unverified]` — INVENTED |
| Contact CTA on entity pages | Read `EntityPageTemplate.tsx` section 7 | Section 7 is a Subscribe/Newsletter CTA, not Contact | `[Extracted]` (wrong label) | `[Extracted]` — corrected to "Subscribe CTA" |
| `ProductSchema` | Grep for `ProductSchema` | Not found. Actual schema is `ServiceSchema` | `[Extracted]` | `[Normalised]` — renamed |
| `FeatureSchema` | Grep for `FeatureSchema` | Not found. Entity pages use shared `TimothyEntityPageData` | `[Extracted]` | `[Normalised]` — INVENTED |
| `SolutionSchema` | Grep for `SolutionSchema` | Not found. Same as above | `[Extracted]` | `[Normalised]` — INVENTED |
| `UseCaseSchema` | Grep for `UseCaseSchema` | Not found. Same as above | `[Extracted]` | `[Normalised]` — INVENTED |
| `ArticleSchema` | Grep for `ArticleSchema` | Not found. Actual schema is `PostSchema` | `[Extracted]` | `[Normalised]` — renamed |
| `PaperSchema` | Grep for `PaperSchema` | Not found. Uses same `PostSchema` | `[Extracted]` | `[Normalised]` — INVENTED |
| `content/main/` content root | Check directory structure | Actual root is `content/www/` | `[Target Decision]` | Corrected to `content/www/` |
| `content/editorial/` content root | Check directory structure | Actual root is `content/library/` | `[Target Decision]` | Corrected to `content/library/` |
| Editorial sub-folders (`articles/`, `papers/`, `guides/`) | Check `content/library/` structure | Library is flat — all `.md` files directly inside | `[Target Decision]` | Corrected to flat folder |
| Front-matter `slug` override | Check `getByPath()` | Slug always derived from filename. No `slug` field usage | `[Extracted]` | `[Unverified]` — NOT IMPLEMENTED |

---

## 7. Source Code Workspace Map

```text
packages/
├── config/src/
│   ├── sites.ts                       # Tenant & surface configs (TENANTS)
│   ├── surface-utils.ts               # resolveSurface(), getCanonicalUrl()
│   ├── middleware-utils.ts            # resolveSurfaceHeaders()
│   └── medium-presentation.ts         # resolveMediumPresentation(), toCanonicalMedium()
├── content-engine/src/
│   ├── types.ts                       # ContentItem, ContentMeta, ContentKind, EntityType, FolderMeta
│   ├── schemas/
│   │   ├── service.schema.ts          # ServiceSchema (portable: Product)
│   │   ├── project.schema.ts          # ProjectSchema (portable: Feature/Project)
│   │   ├── post.schema.ts             # PostSchema (portable: Editorial Article/Paper)
│   │   ├── page.schema.ts             # PageSchema (portable: General Page)
│   │   └── case-study.schema.ts       # CaseStudySchema (portable: Case Study)
│   └── utils/
│       ├── markdown.ts                # getByPath(), getContent(), getAllContent(), getContentBySlug(),
│       │                              # getContentByRef(), getPdfUrl(), inferContentMeta(),
│       │                              # inferKindFromSection(), getLibraryPreview()
│       ├── rich-page-data.ts          # resolveRichPageData(), TimothyEntityPageData
│       └── sitemap.ts                 # getDynamicSitemapEntries(), resolveLastModified(), chunkSitemap()
└── ui/src/components/
    ├── Prose.tsx                      # Prose HTML body wrapper (dangerouslySetInnerHTML)
    ├── Hero.tsx                       # Shared hero component
    └── library/
        └── LibraryTemplates.tsx       # PaperTemplate, ArticleTemplate

sites/timothy-solomon-dot-com/
├── brand/
│   └── tokens.json                    # Design token source: colors, fonts, spacing, borderRadius
├── app/
│   ├── layout.tsx                     # Root layout: Google Fonts (Inter, Newsreader, Fira Code),
│   │                                  # GTM, SubdomainSidebarProvider, HomepageNav, SiteFooter
│   ├── (homepage)/page.tsx            # Root `/` route: surface-branching (www→Homepage, library→index)
│   ├── (site)/[...slug]/page.tsx      # UniversalPage, processHeadings(), estimateReadTime(),
│   │                                  # resolveEntityPageData(), getTokens(), ENTITY_SECTIONS,
│   │                                  # ENTITY_REF_MAP, ENTITY_LABEL_MAP, TIMOTHY_RICH_FIELDS,
│   │                                  # TIMOTHY_ALIASES, buildOgUrl(), getFormattedTitle()
│   ├── robots.ts                      # Dynamic robots.txt: surface-aware indexability
│   └── sitemap.ts                     # Dynamic sitemap.xml: content-driven entries
├── components/
│   ├── layout/
│   │   └── Header.tsx                 # Top navbar: hardcoded nav arrays, mobile drawer
│   └── entity-page/
│       └── EntityPageTemplate.tsx     # 7-section entity page shell
```

