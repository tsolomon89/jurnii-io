import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const cwd = process.cwd();

console.log('=== Starting Architecture Implementation Audit ===\n');

let errors = 0;

function checkFileExists(relPath) {
  const absPath = path.join(cwd, relPath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Missing file: ${relPath}`);
    errors++;
  } else {
    console.log(`✓ Verified file: ${relPath}`);
  }
}

function checkDirectoryFiles(relDir, minCount) {
  const absDir = path.join(cwd, relDir);
  if (!fs.existsSync(absDir)) {
    console.error(`❌ Missing directory: ${relDir}`);
    errors++;
    return;
  }
  const files = fs.readdirSync(absDir).filter(f => f.endsWith('.md'));
  if (files.length < minCount) {
    console.error(`❌ Directory ${relDir} has ${files.length} .md files (expected at least ${minCount})`);
    errors++;
  } else {
    console.log(`✓ Verified directory: ${relDir} (${files.length} .md files)`);
  }
}

// 1. Audit Content Root Structure
checkFileExists('brand/tokens.json');
checkFileExists('src/brand/tokens.ts');
checkFileExists('src/content-engine/types.ts');
checkFileExists('src/content-engine/utils/markdown.ts');
checkFileExists('src/content-engine/utils/rich-page-data.ts');
checkFileExists('src/content-engine/utils/sitemap.ts');
checkFileExists('src/routing/surface-utils.ts');
checkFileExists('src/routing/medium-presentation.ts');
checkFileExists('src/templates/EntityPageTemplate.tsx');
checkFileExists('src/templates/EntityDirectoryTemplate.tsx');
checkFileExists('src/templates/ArticleTemplate.tsx');
checkFileExists('src/templates/PaperTemplate.tsx');
checkFileExists('src/templates/GeneralPageTemplate.tsx');
checkFileExists('src/templates/SharedSubdomainLayout.tsx');

checkDirectoryFiles('content/www/products', 3);
checkDirectoryFiles('content/www/features', 15);
checkDirectoryFiles('content/www/solutions', 15);
checkDirectoryFiles('content/www/use-cases', 10);
checkDirectoryFiles('content/www/pages', 5);
checkDirectoryFiles('content/library', 3);

// 2. Audit Legacy Folder Absences (Must be clean)
const legacyDirs = ['features', 'solutions', 'use-cases'];
for (const dir of legacyDirs) {
  if (fs.existsSync(path.join(cwd, dir))) {
    console.error(`❌ Legacy directory still present in root: ${dir}`);
    errors++;
  } else {
    console.log(`✓ Confirmed absence of legacy directory: ${dir}`);
  }
}

// 3. Audit Content Parsing & Front-Matter
console.log('\n--- Auditing Front-Matter Integrity ---');
const contentDirs = [
  'content/www/products',
  'content/www/features',
  'content/www/solutions',
  'content/www/use-cases',
  'content/www/pages',
  'content/library',
];

for (const relDir of contentDirs) {
  const absDir = path.join(cwd, relDir);
  if (!fs.existsSync(absDir)) continue;
  const files = fs.readdirSync(absDir).filter(f => f.endsWith('.md'));
  for (const f of files) {
    const filePath = path.join(absDir, f);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(raw);
      if (!parsed.data || typeof parsed.data.title !== 'string') {
        console.error(`❌ File ${f} missing title in front-matter`);
        errors++;
      }
    } catch (err) {
      console.error(`❌ Failed parsing file ${f}: ${err.message}`);
      errors++;
    }
  }
}

console.log(`\n=== Audit Finished: ${errors} errors found ===`);
if (errors > 0) {
  process.exit(1);
}
