'use strict';

/**
 * Library Content Publishing Gate Tests
 *
 * Enforces the invariant:
 * IFF the publish date in the frontmatter is greater than the current date,
 * it shouldn't be published on the site.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');

const ROOT = path.join(__dirname, '..', '..');
const manifestScriptPath = path.join(ROOT, 'scripts', 'compile-content-manifest.ts');
const markdownUtilPath = path.join(ROOT, 'src', 'content-engine', 'utils', 'markdown.ts');
const generatedContentPath = path.join(ROOT, 'src', 'content-engine', 'generated-content.ts');
const libraryDir = path.join(ROOT, 'content', 'library');

function isFuturePublishDate(rawDate) {
  if (!rawDate) return false;
  let dateStr;
  if (rawDate instanceof Date) {
    dateStr = rawDate.toISOString().split('T')[0];
  } else {
    dateStr = String(rawDate).trim();
  }
  const match = dateStr.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) {
    const pubDay = match[0];
    const today = new Date().toISOString().split('T')[0];
    return pubDay > today;
  }
  const parsedTime = Date.parse(dateStr);
  if (!isNaN(parsedTime)) {
    return parsedTime > Date.now();
  }
  return false;
}

test('isFuturePublishDate classifier correctly identifies future vs past or present dates', () => {
  const todayIso = new Date().toISOString().split('T')[0];

  // Past dates must be false (not future -> published)
  assert.strictEqual(isFuturePublishDate('2024-01-01'), false);
  assert.strictEqual(isFuturePublishDate('2026-01-01'), false);
  assert.strictEqual(isFuturePublishDate('2026-08-18'), false);

  // Today's date must be false (not future -> published)
  assert.strictEqual(isFuturePublishDate(todayIso), false);
  assert.strictEqual(isFuturePublishDate(new Date()), false);

  // Future dates must be true (future -> NOT published)
  assert.strictEqual(isFuturePublishDate('2099-12-31'), true);
  assert.strictEqual(isFuturePublishDate('2027-06-08'), true);

  // Edge cases: missing date is not greater than current date
  assert.strictEqual(isFuturePublishDate(null), false);
  assert.strictEqual(isFuturePublishDate(undefined), false);
  assert.strictEqual(isFuturePublishDate(''), false);
});

test('compile-content-manifest.ts contains future date gate for library content', () => {
  const scriptContent = fs.readFileSync(manifestScriptPath, 'utf8');
  assert.match(
    scriptContent,
    /isFuturePublishDate/,
    'compile-content-manifest.ts must include isFuturePublishDate logic'
  );
  assert.match(
    scriptContent,
    /section === ['"]library['"]/,
    'compile-content-manifest.ts must gate library section'
  );
});

test('markdown.ts contains isItemPublished runtime guard for library content', () => {
  const markdownContent = fs.readFileSync(markdownUtilPath, 'utf8');
  assert.match(
    markdownContent,
    /isFuturePublishDate/,
    'markdown.ts must include isFuturePublishDate check'
  );
  assert.match(
    markdownContent,
    /isItemPublished/,
    'markdown.ts must export isItemPublished'
  );
});

test('generated-content.ts contains only library articles with publish date <= current date', () => {
  assert.ok(
    fs.existsSync(generatedContentPath),
    'generated-content.ts must exist'
  );

  const raw = fs.readFileSync(generatedContentPath, 'utf8');
  const libraryFiles = fs.readdirSync(libraryDir).filter((f) => f.endsWith('.md'));
  const todayIso = new Date().toISOString().split('T')[0];

  let publishedCount = 0;
  let excludedCount = 0;

  for (const file of libraryFiles) {
    const filePath = path.join(libraryDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(content);
    const slug = path.basename(file, '.md');
    const rawDate = data.date || data.publishDate || data.publishedAt;
    const isFuture = isFuturePublishDate(rawDate);

    // Search for slug within generated content
    const inManifest = raw.includes(`"slug": "${slug}"`);

    if (isFuture) {
      assert.strictEqual(
        inManifest,
        false,
        `Future-dated article "${slug}" (${rawDate} > ${todayIso}) must NOT be in generated-content.ts`
      );
      excludedCount++;
    } else {
      assert.strictEqual(
        inManifest,
        true,
        `Published article "${slug}" (${rawDate} <= ${todayIso}) MUST be in generated-content.ts`
      );
      publishedCount++;
    }
  }

  assert.ok(excludedCount > 0, `Expected some future-dated articles to be excluded (found ${excludedCount})`);
  assert.ok(publishedCount > 0, `Expected past/today articles to be published (found ${publishedCount})`);
  assert.strictEqual(publishedCount + excludedCount, libraryFiles.length);
});
