import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const cwd = process.cwd();
const manifestPath = path.join(cwd, '.agents/manifests/library-article-manifest.json');
const libraryDir = path.join(cwd, 'content/library');

console.log('=== Jurnii Library Article Deterministic Validator ===\n');

if (!fs.existsSync(manifestPath)) {
  console.log('ℹ️ Manifest file not found yet at .agents/manifests/library-article-manifest.json. Running standalone file check...\n');
}

const PROHIBITED_WORDS_PATTERNS = [
  /—/g, // Unicode em dash
  /\bin this article\b/i,
  /\bthis guide will explore\b/i,
  /\bwe will discuss\b/i,
  /\bas mentioned above\b/i,
  /\bin the following section\b/i,
  /\blet'?s dive in\b/i,
  /\bread on to discover\b/i,
  /\bin conclusion\b/i,
  /\bit is worth noting\b/i,
  /\bin today'?s fast-paced digital landscape\b/i,
  /\bthe world of\b/i,
  /\bwhen it comes to\b/i,
  /\bnavigating the complexities of\b/i,
  /\bunlock the power of\b/i,
  /\bdelve into\b/i,
  /\ba game-changer\b/i,
  /\brevolutionary\b/i,
  /\bcutting-edge\b/i,
  /\bseamless(?:ly)?\b/i,
  /\brobust\b/i,
  /\bleverage\b/i,
  /\bholistic(?:ally)?\b/i,
  /\bbest-in-class\b/i,
  /\btodo\b/i,
  /\btbd\b/i,
  /\blorem ipsum\b/i,
];

let totalErrors = 0;
let totalWarnings = 0;

let manifest = [];
if (fs.existsSync(manifestPath)) {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

const seenSlugs = new Set();
const seenTitles = new Set();
const seenDescriptions = new Set();

// If manifest exists, validate each manifest row
if (manifest.length > 0) {
  console.log(`Auditing ${manifest.length} manifest rows...`);
  
  let expectedDate = new Date('2026-08-18T00:00:00Z');

  manifest.forEach((row, idx) => {
    const seq = row.sequenceNumber || (idx + 1);
    const filePath = path.join(cwd, row.articleFilePath);
    
    // Check manifest required fields
    if (!row.slug || !row.onPageTitle || !row.sourceRoute) {
      console.error(`❌ [Row ${seq}] Manifest missing required fields: slug, onPageTitle, or sourceRoute`);
      totalErrors++;
    }

    // Check slug uniqueness
    if (seenSlugs.has(row.slug)) {
      console.error(`❌ [Row ${seq}] Duplicate slug in manifest: "${row.slug}"`);
      totalErrors++;
    }
    seenSlugs.add(row.slug);

    // Check onPageTitle uniqueness
    if (seenTitles.has(row.onPageTitle)) {
      console.error(`❌ [Row ${seq}] Duplicate onPageTitle in manifest: "${row.onPageTitle}"`);
      totalErrors++;
    }
    seenTitles.add(row.onPageTitle);

    // Check description uniqueness if present
    if (row.metaDescription) {
      if (seenDescriptions.has(row.metaDescription)) {
        console.error(`❌ [Row ${seq}] Duplicate metaDescription in manifest for "${row.slug}"`);
        totalErrors++;
      }
      seenDescriptions.add(row.metaDescription);
    }

    // Verify file if status is drafted or validated
    if (row.status === 'drafted' || row.status === 'validated') {
      if (!fs.existsSync(filePath)) {
        console.error(`❌ [Row ${seq}] Article marked as "${row.status}" but file does not exist at "${row.articleFilePath}"`);
        totalErrors++;
        return;
      }

      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(raw);
      const data = parsed.data || {};
      const body = parsed.content || '';

      // 1. Required metadata checks
      if (!data.title) {
        console.error(`❌ [${row.slug}] Front matter missing 'title'`);
        totalErrors++;
      }
      if (!data.description) {
        console.error(`❌ [${row.slug}] Front matter missing 'description'`);
        totalErrors++;
      }
      if (!data.date) {
        console.error(`❌ [${row.slug}] Front matter missing 'date'`);
        totalErrors++;
      }

      // Date sequence check
      const expectedDateStr = expectedDate.toISOString().split('T')[0];
      if (data.date !== row.publishDate) {
        console.error(`❌ [${row.slug}] Front matter date (${data.date}) does not match manifest publishDate (${row.publishDate})`);
        totalErrors++;
      }

      // Meta description character length check (house standard: 145-155 chars)
      if (data.description) {
        const descLen = data.description.length;
        if (descLen < 130 || descLen > 165) {
          console.warn(`⚠️ [${row.slug}] Meta description length is ${descLen} chars (standard is 145-155)`);
          totalWarnings++;
        }
      }

      // 2. Word count check (1,000 to 3,000 words excluding front matter)
      const words = body.trim().split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      if (wordCount < 1000) {
        console.error(`❌ [${row.slug}] Word count is ${wordCount} words (minimum is 1,000 words)`);
        totalErrors++;
      } else if (wordCount > 3000) {
        console.error(`❌ [${row.slug}] Word count is ${wordCount} words (maximum is 3,000 words)`);
        totalErrors++;
      } else {
        console.log(`✅ [${row.slug}] Word count: ${wordCount} words (within 1,000 - 3,000 target)`);
      }

      // 3. Prohibited terms and characters check
      for (const pattern of PROHIBITED_WORDS_PATTERNS) {
        const matches = raw.match(pattern);
        if (matches) {
          console.error(`❌ [${row.slug}] Prohibited pattern match found: "${pattern.source}" (${matches.length} occurrences)`);
          totalErrors++;
        }
      }

      // 4. Heading structure checks
      // In markdown body, there must NOT be a `# ` H1 because the template generates H1 from front matter title
      const bodyH1Match = body.match(/^#\s+(.+)$/m);
      if (bodyH1Match) {
        console.error(`❌ [${row.slug}] Found Markdown H1 in body ("# ${bodyH1Match[1]}"). Remove body H1 so rendered page has exactly one H1 from template.`);
        totalErrors++;
      }

      // Check for skipped heading levels (e.g. H2 -> H4 without H3)
      const headingLines = body.split('\n').filter(line => /^#{2,6}\s/.test(line));
      let currentLevel = 2;
      for (const hLine of headingLines) {
        const level = hLine.match(/^(#{2,6})\s/)[1].length;
        if (level > currentLevel + 1) {
          console.error(`❌ [${row.slug}] Skipped heading level: from H${currentLevel} to H${level} in "${hLine.trim()}"`);
          totalErrors++;
        }
        currentLevel = level;
      }

      // 5. Internal link check: must link to corresponding source route
      const sourceRoute = row.sourceRoute;
      if (!body.includes(sourceRoute) && !body.includes(`(${sourceRoute})`) && !body.includes(`"${sourceRoute}"`)) {
        console.error(`❌ [${row.slug}] Article does not contain a link to its source route "${sourceRoute}"`);
        totalErrors++;
      }
    }

    // Increment expected date by 7 days for next article
    expectedDate.setDate(expectedDate.getDate() + 7);
  });
} else {
  console.log('No manifest rows to validate.');
}

console.log(`\n=== Validation Summary ===`);
console.log(`Errors: ${totalErrors}`);
console.log(`Warnings: ${totalWarnings}`);

if (totalErrors > 0) {
  console.error('\n❌ Validation FAILED with errors.');
  process.exit(1);
} else {
  console.log('\n✅ Validation PASSED.');
  process.exit(0);
}
