import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const jsonPath = path.join(cwd, '.agents/manifests/library-article-manifest.json');
const mdPath = path.join(cwd, '.agents/manifests/library-article-manifest.md');

if (!fs.existsSync(jsonPath)) {
  console.error('Manifest JSON not found!');
  process.exit(1);
}

const items = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

let md = `# Jurnii Library Article Generation Manifest

Total Articles: ${items.length}
Schedule: 7-day intervals starting 2026-08-18 to ${items[items.length - 1].publishDate}

| Seq | Status | Class | Product | Source Route | Slug | On-Page Title | Publish Date | Validation |
|---|---|---|---|---|---|---|---|---|
`;

for (const it of items) {
  md += `| ${it.sequenceNumber} | \`${it.status}\` | ${it.classification} | ${it.parentProduct} | \`${it.sourceRoute}\` | \`${it.slug}\` | ${it.onPageTitle} | ${it.publishDate} | ${it.validationResult} |\n`;
}

fs.writeFileSync(mdPath, md, 'utf-8');
console.log(`Updated ${mdPath}`);
