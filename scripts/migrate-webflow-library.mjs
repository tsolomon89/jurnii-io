/**
 * Migrate the live Webflow site (www.jurnii.io/posts + /case-studies) into `content/library`.
 *
 * The legacy site is a Webflow CMS, so every post and case study is server-rendered
 * HTML with a predictable shape:
 *
 *   .div-block-53
 *     .div-block-248        author card (name + role + avatar)   — optional on older posts
 *     h1                    title
 *     .global_subheading    lede
 *     .global_rich-text*    body, sometimes split across several blocks
 *     .cascading-slider     an image carousel between body blocks
 *     .div-block-279        case studies nest the body one level deeper
 *
 * Run with `--fetch` to (re)download the HTML into the cache dir, otherwise the
 * cached copies are reused. Images are always downloaded on demand and skipped
 * when already present on disk.
 *
 *   node scripts/migrate-webflow-library.mjs [--fetch] [--cache <dir>]
 */
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import matter from 'gray-matter';

const ORIGIN = 'https://www.jurnii.io';
const cwd = process.cwd();
const libraryDir = path.join(cwd, 'content/library');
const imageRoot = path.join(cwd, 'assets/library');

const argv = process.argv.slice(2);
const FORCE_FETCH = argv.includes('--fetch');
const cacheIdx = argv.indexOf('--cache');
const cacheDir = cacheIdx >= 0 ? argv[cacheIdx + 1] : path.join(cwd, '.migration-cache');

/**
 * Live URL -> library file that already carries this article.
 *
 * These 18 were rewritten and expanded when the new architecture was built, so the
 * migration must not overwrite their prose — it only backfills the cover image the
 * rewrite dropped. Everything not listed here is imported as a new file.
 */
const EXISTING = {
  '/post/vip-retention-in-the-friction-age': 'vip-retention-in-the-friction-age-why-high-value-players-churn-silently.md',
  '/post/the-psychology-of-the-multi-homing-player': 'the-psychology-of-the-multi-homing-player-what-triggers-the-switch.md',
  '/post/the-igaming-cfos-guide-to-ux': 'the-cfos-guide-to-ux-connecting-usability-metrics-to-net-gaming-revenue.md',
  '/post/why-most-igaming-a-b-tests-fail-and-how-to-fix-them': 'hypothesis-driven-cro-why-most-igaming-ab-tests-fail-and-how-to-fix-them.md',
  '/post/a-framework-for-implementing-70-ux-recommendations': 'from-audit-to-interface-a-framework-for-implementing-70-ux-recommendations.md',
  '/post/how-to-respond-to-competitor-promo-attacks-in-real-time': 'the-defensive-playbook-how-to-respond-to-competitor-promo-attacks-in-real-time.md',
  '/post/accounting-for-competitor-noise-in-marketing-attribution': 'the-missing-variable-in-mmm-accounting-for-competitor-noise-in-marketing-attribution.md',
  '/post/optimizing-igaming-promotional-spend-without-diluting-margins': 'the-generosity-equation-optimizing-igaming-promotional-spend-without-diluting-margins.md',
  '/post/building-a-modern-competitive-intelligence-unit-in-igaming': 'automating-the-radar-building-a-modern-competitive-intelligence-unit-in-igaming.md',
  '/post/how-digital-experience-shapes-player-sentiment-and-brand-loyalty': 'the-ux-of-trust-how-digital-experience-shapes-player-sentiment-and-brand-loyalty.md',
  '/post/how-front-end-performance-directly-controls-igaming-ngr': 'the-12-second-cost-how-front-end-performance-directly-controls-igaming-ngr.md',
  '/post/designing-for-the-flow-state': 'designing-for-the-flow-state-applying-usability-heuristics-to-igaming-lobbies-and-betslips.md',
  '/post/mapping-the-friction-points-a-masterclass-in-igaming-transactional-ux': 'mapping-the-friction-points-a-masterclass-in-igaming-transactional-ux.md',
  '/post/domain-specific-ai-in-igaming-why-generic-llms-fail-the-compliance-and-ux-test': 'domain-specific-ai-in-igaming-why-generic-llms-fail-the-compliance-and-ux-test.md',
  '/post/the-strategic-blind-spot-of-quarterly-snapshots': 'the-strategic-blind-spot-of-quarterly-snapshots.md',
  '/post/why-reactive-analytics-cost-you-ftds': 'why-reactive-analytics-cost-you-ftds.md',
  '/post/speed-is-commercial-leverage': 'speed-is-commercial-leverage.md',
  '/post/experience-is-the-last-defensible-advantage': 'experience-is-the-last-defensible-advantage.md',
};

/**
 * The CMS bylines a couple of people differently from the rest of the library.
 * Canonicalising here keeps one spelling per person across the archive, which is
 * also what keys their portrait file.
 */
const AUTHOR_CANONICAL = {
  'Mitch V.': 'Mitch Vidler',
};

/** Webflow's own tag vocabulary, mapped onto the library's category taxonomy. */
const CATEGORY_MAP = {
  '': 'Commercial Strategy',
  Insights: 'Market Intelligence',
  Conversation: 'Conversation',
  Announcement: 'Announcement',
};

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019'"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

/** Webflow pads empty paragraphs with zero-width joiners; strip them everywhere. */
const clean = (text = '') => text.replace(/[\u200b-\u200d\ufeff]/g, '').replace(/\s+/g, ' ').trim();

const toIsoDate = (label) => {
  const d = new Date(`${label} UTC`);
  if (Number.isNaN(d.getTime())) throw new Error(`Unparseable date: ${label}`);
  return d.toISOString().slice(0, 10);
};

/** Trim to a sentence boundary under `max`, falling back to a word boundary. */
function summarise(text, max = 220) {
  const t = clean(text);
  if (t.length <= max) return t;
  const window = t.slice(0, max);
  const sentenceEnd = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '));
  if (sentenceEnd > max * 0.5) return window.slice(0, sentenceEnd + 1);
  return `${window.slice(0, window.lastIndexOf(' '))}…`;
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

async function cachedPage(href) {
  const file = path.join(cacheDir, `${href.replace(/^\//, '')}.html`);
  if (!FORCE_FETCH && fs.existsSync(file) && fs.statSync(file).size > 0) {
    return fs.readFileSync(file, 'utf-8');
  }
  const html = await fetchText(ORIGIN + href);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, 'utf-8');
  return html;
}

/**
 * Download `url` into assets/library/<slug>/<name>.<ext>; returns the site-absolute
 * path. `slug` is usually an article, but the shared author portraits pass "authors".
 */
async function downloadImage(url, slug, name) {
  const ext = (path.extname(new URL(url).pathname) || '.png').toLowerCase();
  const dir = path.join(imageRoot, slug);
  const dest = path.join(dir, `${name}${ext}`);
  const webPath = `/assets/library/${slug}/${name}${ext}`;
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return webPath;

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return webPath;
}

// ---------------------------------------------------------------------------
// HTML -> Markdown
// ---------------------------------------------------------------------------

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });

// Figures and tables are emitted verbatim: turndown has no table rule and would
// flatten every cell onto its own line, and GFM pipe tables cannot carry a
// `<caption>`. `.article-prose figure` and `.article-prose table` already style
// both, since the hand-written market reports embed the same raw HTML.
turndown.addRule('verbatimBlocks', {
  filter: ['figure', 'table'],
  replacement: (_content, node) => `\n\n${node.outerHTML}\n\n`,
});

/**
 * Group each run of sibling nodes matching `match` into a single `<ul>`, so a
 * sequence of one-line bullets becomes one list rather than N single-item lists.
 */
function groupIntoList($, parent, match, toListItem) {
  let run = [];
  const flush = () => {
    if (!run.length) return;
    const items = run.map((el) => toListItem($, el)).join('');
    $(run[0]).before(`<ul>${items}</ul>`);
    run.forEach((el) => $(el).remove());
    run = [];
  };
  for (const el of $(parent).children().toArray()) {
    if (match($, el)) run.push(el);
    else flush();
  }
  flush();
}

/** `<p>·&nbsp;&nbsp;text</p>` — a bullet the editor typed by hand rather than a real list. */
const PSEUDO_BULLET = /^[·•▪▫◦*]\s*/;
const isPseudoBullet = ($, el) => el.tagName === 'p' && PSEUDO_BULLET.test(clean($(el).text()));

/** A paragraph whose entire content is one `<strong>` — the legacy CMS's section heading. */
function isBoldOnlyParagraph($, el) {
  if (el.tagName !== 'p') return false;
  const p = $(el);
  const kids = p.children();
  if (kids.length !== 1 || !['strong', 'b'].includes(kids[0].tagName)) return false;
  const text = clean(p.text());
  return Boolean(text) && text === clean($(kids[0]).text()) && text.length <= 80;
}

/**
 * Rewrite a Webflow rich-text block in place: localise images, normalise figures
 * and hand-typed bullets, re-base the heading levels, and drop filler paragraphs.
 *
 * `hasRealHeadings` comes from the whole document, not this block — a page whose
 * sections are bold paragraphs must be promoted wholesale or not at all.
 */
async function normaliseRichText($, block, slug, imageCounter, { headingShift, hasRealHeadings }) {
  // Editors left behind anchors wrapping nothing but a zero-width joiner. They are
  // invisible on the live page and, left in place, they stop a section heading from
  // being recognised as one because the paragraph then has two children.
  $(block)
    .find('a')
    .each((_i, el) => {
      if (!clean($(el).text()) && !$(el).find('img').length) $(el).remove();
    });

  // Tables ship inside a Webflow embed wrapper; keep the table, drop the chrome.
  $(block)
    .find('.w-embed')
    .each((_i, el) => {
      $(el).find('script, style').remove();
      $(el).replaceWith($(el).html() || '');
    });

  for (const el of $(block).find('figure').toArray()) {
    const fig = $(el);
    const img = fig.find('img').first();
    const src = img.attr('src');
    if (!src) {
      fig.remove();
      continue;
    }
    const caption = clean(fig.find('figcaption').text());
    const alt = clean(img.attr('alt') || '') || caption;
    const local = await downloadImage(src, slug, `figure-${String(++imageCounter.n).padStart(2, '0')}`);
    const altAttr = alt ? ` alt="${alt.replace(/"/g, '&quot;')}"` : ' alt=""';
    fig.replaceWith(
      `<figure><img src="${local}"${altAttr} loading="lazy">` +
        (caption ? `<figcaption>${caption}</figcaption>` : '') +
        `</figure>`
    );
  }

  // Any image not already wrapped in a figure.
  for (const el of $(block).find('img').toArray()) {
    const img = $(el);
    const src = img.attr('src');
    if (!src || src.startsWith('/assets/')) continue;
    const local = await downloadImage(src, slug, `figure-${String(++imageCounter.n).padStart(2, '0')}`);
    img.attr('src', local);
    img.removeAttr('class').removeAttr('height').removeAttr('width').removeAttr('sizes').removeAttr('srcset');
  }

  // Authors across eight years of the CMS started their sections at h1, h2, h4 or
  // h5. The page title owns `#`, so whatever they used is re-based to h2 with the
  // relative hierarchy intact. Ascending order, so a heading is never shifted twice.
  if (headingShift) {
    for (const level of headingShift < 0 ? [1, 2, 3, 4, 5, 6] : [6, 5, 4, 3, 2, 1]) {
      const target = Math.min(Math.max(level + headingShift, 2), 6);
      $(block)
        .find(`h${level}`)
        .each((_i, el) => {
          const h = $(el);
          h.replaceWith(`<h${target}>${h.html()}</h${target}>`);
        });
    }
  }

  // Only when the page has no real headings at all is a bold paragraph a heading.
  if (!hasRealHeadings) {
    $(block)
      .children()
      .each((_i, el) => {
        if (isBoldOnlyParagraph($, el)) $(el).replaceWith(`<h2>${clean($(el).text())}</h2>`);
      });
  }

  groupIntoList($, block, isPseudoBullet, ($$, el) => {
    const inner = $$(el).html() || '';
    return `<li>${inner.replace(/^\s*(?:&nbsp;|\s)*[·•▪▫◦*](?:&nbsp;|\s)*/, '')}</li>`;
  });

  // Webflow leaves `<li>` orphaned outside a list when an editor pastes bullets.
  groupIntoList(
    $,
    block,
    ($$, el) => el.tagName === 'li',
    ($$, el) => $$.html($$(el))
  );

  $(block)
    .find('p')
    .each((_i, el) => {
      if (!clean($(el).text()) && !$(el).find('img').length) $(el).remove();
    });

  return $(block).html() || '';
}

/**
 * Pull the carousel on the Brazil/Canada posts out as a run of figures.
 *
 * These are always tall phone screenshots — five of them stacked full-width would be
 * five thousand pixels of scrolling around two thousand characters of prose. The
 * `.figure-row` wrapper keeps them a swipeable gallery, which is what they were.
 */
async function sliderToFigures($, slider, slug, imageCounter) {
  const out = [];
  for (const el of $(slider).find('img').toArray()) {
    const src = $(el).attr('src');
    if (!src) continue;
    const alt = clean($(el).attr('alt') || '');
    const local = await downloadImage(src, slug, `figure-${String(++imageCounter.n).padStart(2, '0')}`);
    out.push(`<figure><img src="${local}" alt="${alt.replace(/"/g, '&quot;')}" loading="lazy"></figure>`);
  }
  if (!out.length) return '';
  return `<div class="figure-row">${out.join('')}</div>`;
}

/** Turndown pads top-level bullets to four columns; the library writes `- `. */
const tidyMarkdown = (md) =>
  md
    // Zero-width joiners are the CMS's empty-paragraph filler and survive inline.
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/^- {3}/gm, '- ')
    // A heading whose text is entirely bold is just a heading.
    .replace(/^(#{2,6} )\*\*(.+?)\*\*$/gm, '$1$2')
    .replace(/[ \t\u00a0]+$/gm, '')
    .replace(/^\u00a0$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const isLiveRichText = ($, el) => {
  const cls = $(el).attr('class') || '';
  return (
    cls.includes('global_rich-text') &&
    cls.includes('w-richtext') &&
    !cls.includes('w-condition-invisible') &&
    !cls.includes('w-dyn-bind-empty')
  );
};

// ---------------------------------------------------------------------------
// Page extraction
// ---------------------------------------------------------------------------

async function extract(entry) {
  const html = await cachedPage(entry.href);
  const $ = cheerio.load(html);

  const header = $('.div-block-53').first();
  const title = clean(header.find('h1').first().text());
  if (!title) throw new Error(`No title on ${entry.href}`);

  const slug = EXISTING[entry.href] ? EXISTING[entry.href].replace(/\.md$/, '') : slugify(title);

  const lede = clean(header.find('.global_subheading').first().text());
  const liveAuthor = clean(header.find('.div-block-248 h6').first().text());
  const authorName = AUTHOR_CANONICAL[liveAuthor] || liveAuthor;
  const authorRole = clean(header.find('.div-block-248 .text-block-57').first().text());

  // The author portraits are the last images still living only on Webflow's CDN.
  // Nothing renders them yet, but the CMS is being decommissioned, so they are
  // pulled into the repo keyed by author rather than by article — three files for
  // the whole library instead of one copy per post.
  const avatarUrl = header.find('.div-block-248 img').first().attr('src');
  const authorImage =
    avatarUrl && authorName ? await downloadImage(avatarUrl, 'authors', slugify(authorName)) : null;

  const coverUrl = $('meta[property="og:image"]').attr('content') || entry.thumb || entry.fallbackThumb;
  const coverImage = coverUrl ? await downloadImage(coverUrl, slug, 'cover') : null;

  // Existing files keep their rewritten prose; only the cover is backfilled. The
  // portrait still gets recorded so the library-wide pass can place it by author.
  if (EXISTING[entry.href]) {
    return { entry, slug, title, coverImage, authorName, authorImage, existingFile: EXISTING[entry.href] };
  }

  const bodyHost = entry.kind === 'case-study' ? $('.div-block-279').first() : header;
  const bodyBlocks = bodyHost.children().filter((_i, el) => isLiveRichText($, el));

  // Re-base the whole document at once: the shallowest heading anywhere in the body
  // becomes h2, so a page written against h4 and one written against h2 both land
  // on the same scale and `processHeadings` can build a table of contents from them.
  const levels = bodyBlocks
    .find('h1, h2, h3, h4, h5, h6')
    .toArray()
    .map((el) => Number(el.tagName.slice(1)));
  const hasRealHeadings = levels.length > 0;
  const headingShift = hasRealHeadings ? 2 - Math.min(...levels) : 0;

  const imageCounter = { n: 0 };
  const chunks = [];

  for (const el of bodyHost.children().toArray()) {
    const cls = $(el).attr('class') || '';
    if (isLiveRichText($, el)) {
      const inner = await normaliseRichText($, el, slug, imageCounter, { headingShift, hasRealHeadings });
      const md = tidyMarkdown(turndown.turndown(inner));
      if (md) chunks.push(md);
    } else if (cls.includes('cascading-slider')) {
      const figures = await sliderToFigures($, el, slug, imageCounter);
      if (figures) chunks.push(figures);
    }
  }

  if (!chunks.length) throw new Error(`No body extracted for ${entry.href}`);

  const category =
    entry.kind === 'case-study' ? 'Case Study' : CATEGORY_MAP[entry.category] ?? entry.category;

  const tags = ['iGaming'];
  if (entry.kind === 'case-study') {
    tags.unshift('Case Study');
    if (entry.category) tags.push(entry.category);
  } else {
    tags.unshift(category);
    tags.push('Intelligence');
  }

  const byline = authorName ? `By ${authorName}${authorRole ? `, ${authorRole}` : ''}` : null;
  const body = [`# ${title}`, byline, lede, ...chunks].filter(Boolean).join('\n\n');

  const summary = summarise(lede || clean($('meta[name="description"]').attr('content') || ''));

  return {
    entry,
    slug,
    title,
    coverImage,
    authorName,
    authorImage,
    frontmatter: {
      title,
      description: summary,
      excerpt: summary,
      date: toIsoDate(entry.date),
      medium: 'Article',
      category,
      author: authorName || 'Jurnii Research',
      ...(authorImage ? { authorImage } : {}),
      tags,
      coverImage,
      isIndexable: true,
      sourceUrl: ORIGIN + entry.href,
    },
    body: `${body}\n`,
  };
}

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

/**
 * Set one front-matter key on a file that already exists, without reformatting the
 * rest of it — gray-matter's serialiser would rewrite every quoted string and folded
 * block in the file, which would bury a one-line change in noise.
 */
function setFrontmatterKey(file, key, value) {
  const abs = path.join(libraryDir, file);
  const raw = fs.readFileSync(abs, 'utf-8');
  const lines = raw.split(/\r?\n/);
  if (lines[0].trim() !== '---') throw new Error(`${file}: no front matter`);
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error(`${file}: unterminated front matter`);

  const existing = lines.findIndex((l, i) => i > 0 && i < end && new RegExp(`^${key}:`).test(l));
  const entry = `${key}: ${value}`;
  if (existing >= 0) {
    if (lines[existing] === entry) return false;
    lines[existing] = entry;
  } else {
    const anchor = lines.findIndex((l, i) => i > 0 && i < end && /^isIndexable:/.test(l));
    lines.splice(anchor >= 0 ? anchor : end, 0, entry);
  }
  fs.writeFileSync(abs, lines.join('\n'), 'utf-8');
  return true;
}

/**
 * Attach each downloaded portrait to every article that author wrote, across the
 * whole library rather than only the migrated posts — the same people wrote the
 * pieces authored directly in this repo, and they should carry the same byline art.
 */
function attachAuthorPortraits(portraits) {
  let touched = 0;
  for (const file of fs.readdirSync(libraryDir).filter((f) => f.endsWith('.md'))) {
    const { data } = matter(fs.readFileSync(path.join(libraryDir, file), 'utf-8'));
    const portrait = portraits.get(data.author);
    if (portrait && setFrontmatterKey(file, 'authorImage', portrait)) touched++;
  }
  return touched;
}

function writeArticle(result) {
  const abs = path.join(libraryDir, `${result.slug}.md`);
  fs.writeFileSync(abs, matter.stringify(result.body, result.frontmatter), 'utf-8');
  return abs;
}

// ---------------------------------------------------------------------------

async function collectIndex(indexPath, kind) {
  const html = await (async () => {
    const file = path.join(cacheDir, `${indexPath.replace(/^\//, '')}.html`);
    if (!FORCE_FETCH && fs.existsSync(file)) return fs.readFileSync(file, 'utf-8');
    const fetched = await fetchText(ORIGIN + indexPath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, fetched, 'utf-8');
    return fetched;
  })();

  const $ = cheerio.load(html);
  return $('.w-dyn-item')
    .toArray()
    .map((el) => {
      const card = $(el);
      const href = card.find('a.card_link').attr('href');
      if (!href) return null;
      const tags = card.find('.card_tag').map((_i, t) => clean($(t).children().first().text())).get();
      return {
        href,
        kind,
        category: tags[0] || '',
        date: tags[1] || '',
        author: tags[2] || '',
        thumb: card.find('img.card_thumbnail').not('.absolute').first().attr('src') || '',
        // A handful of the oldest posts have no artwork at all; the live cards show
        // the house fallback image stacked behind the thumbnail, so migrate that too.
        fallbackThumb: card.find('img.card_thumbnail.absolute').first().attr('src') || '',
      };
    })
    .filter(Boolean);
}

async function main() {
  fs.mkdirSync(cacheDir, { recursive: true });

  const entries = [
    ...(await collectIndex('/posts', 'post')),
    ...(await collectIndex('/case-studies', 'case-study')),
  ];
  console.log(`Found ${entries.length} live items.`);

  let created = 0;
  let backfilled = 0;
  const portraits = new Map();

  for (const entry of entries) {
    const result = await extract(entry);
    if (result.authorName && result.authorImage) portraits.set(result.authorName, result.authorImage);
    if (result.existingFile) {
      const changed = result.coverImage && setFrontmatterKey(result.existingFile, 'coverImage', result.coverImage);
      if (changed) backfilled++;
      console.log(`${changed ? '+cover' : '  skip'}  ${result.existingFile}`);
    } else {
      writeArticle(result);
      created++;
      console.log(`  new   ${result.slug}.md`);
    }
  }

  const portraitsAttached = attachAuthorPortraits(portraits);

  console.log(`\nCreated ${created} articles, backfilled ${backfilled} cover images.`);
  console.log(`Portraits: ${portraits.size} author(s), attached to ${portraitsAttached} further article(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
