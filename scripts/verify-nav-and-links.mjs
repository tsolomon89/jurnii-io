import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const cwd = process.cwd();
const contentManifestPath = path.join(cwd, 'src/content-engine/generated-content.ts');

if (!fs.existsSync(contentManifestPath)) {
  console.error('❌ Run npm run build or node scripts/compile-content-manifest.mjs first!');
  process.exit(1);
}

// Load compiled manifest slugs
const generatedRaw = fs.readFileSync(contentManifestPath, 'utf-8');
const slugMatches = Array.from(generatedRaw.matchAll(/"slug":\s*"([^"]+)"/g)).map(m => m[1]);
const validSlugs = new Set(slugMatches);

console.log(`=== Starting Comprehensive Routing & Link Audit ===`);
console.log(`Loaded ${validSlugs.size} unique content slugs from generated-content.ts\n`);

let errors = 0;

function checkSlugExists(rawPathOrSlug, context) {
  if (!rawPathOrSlug || rawPathOrSlug.startsWith('#') || rawPathOrSlug.startsWith('http://') || rawPathOrSlug.startsWith('https://') || rawPathOrSlug.startsWith('mailto:')) {
    return;
  }

  const clean = rawPathOrSlug.replace(/^\//, '').replace(/\.html$/, '').split('?')[0].split('#')[0];
  const lastSeg = clean.split('/').pop();

  // Known static routes & aliases
  const knownRoutes = new Set([
    '', 'index', 'home', 'library', 'resources', 'resources.html', 'resource', '360', 'jurnii-360', 'ux', 'jurnii-ux', 'mmm', 'jurnii-mmm',
    'contact', 'contact-us', 'book', 'book-meeting', 'about', 'privacy', 'terms',
    'products', 'features', 'solutions', 'use-cases'
  ]);


  if (knownRoutes.has(clean) || knownRoutes.has(lastSeg) || validSlugs.has(clean) || validSlugs.has(lastSeg)) {
    return;
  }

  console.error(`❌ Broken link in [${context}]: "${rawPathOrSlug}" (resolved slug "${lastSeg}" not found in content manifest)`);
  errors++;
}

// 1. Audit site.jsx navigation arrays
const siteJsxPath = path.join(cwd, 'assets/site.jsx');
if (fs.existsSync(siteJsxPath)) {
  console.log('--- Auditing site.jsx Navigation Links ---');
  const siteJsx = fs.readFileSync(siteJsxPath, 'utf-8');
  const hrefMatches = Array.from(siteJsx.matchAll(/href:\s*['"]([^'"]+)['"]/g)).map(m => m[1]);
  for (const href of hrefMatches) {
    checkSlugExists(href, 'assets/site.jsx');
  }
}

// 2. Audit Templates & Components
console.log('\n--- Auditing Template Links ---');
const templateFiles = [
  'src/templates/SharedSubdomainLayout.tsx',
  'src/templates/EntityPageTemplate.tsx',
  'src/templates/EntityDirectoryTemplate.tsx',
  'src/templates/ArticleTemplate.tsx',
  'src/templates/PaperTemplate.tsx',
  'src/content-engine/ContentEngineApp.tsx',
];

for (const relFile of templateFiles) {
  const absPath = path.join(cwd, relFile);
  if (!fs.existsSync(absPath)) continue;
  const content = fs.readFileSync(absPath, 'utf-8');
  const hrefMatches = Array.from(content.matchAll(/href=['"]([^'"]+)['"]/g)).map(m => m[1]);
  for (const href of hrefMatches) {
    checkSlugExists(href, relFile);
  }
}

// 3. Audit Front-Matter *Refs across all markdown files
console.log('\n--- Auditing Content Relationship References (*Refs) ---');
function auditDirectoryRefs(dirPath) {
  const absDir = path.join(cwd, dirPath);
  if (!fs.existsSync(absDir)) return;
  const entries = fs.readdirSync(absDir, { withFileTypes: true });

  for (const ent of entries) {
    const fullPath = path.join(absDir, ent.name);
    if (ent.isDirectory()) {
      auditDirectoryRefs(path.join(dirPath, ent.name));
    } else if (ent.name.endsWith('.md')) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const parsed = matter(raw);
      const data = parsed.data || {};

      const refFields = ['productRefs', 'featureRefs', 'solutionRefs', 'useCaseValueRefs', 'useCaseFieldRefs'];
      for (const field of refFields) {
        if (Array.isArray(data[field])) {
          for (const ref of data[field]) {
            checkSlugExists(ref, `${dirPath}/${ent.name} -> ${field}`);
          }
        }
      }
    }
  }
}

auditDirectoryRefs('content');

console.log(`\n=== Link Audit Finished: ${errors} errors found ===`);
if (errors > 0) {
  process.exit(1);
}
