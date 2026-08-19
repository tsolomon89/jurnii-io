import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('.agents/manifests/library-article-manifest.json', 'utf-8'));

console.log('=== Comprehensive SEO & Depth Audit across 44 Articles ===\n');

let lowWordCountCount = 0;
let descLengthIssues = 0;

manifest.forEach((m, idx) => {
  const file = `content/library/${m.slug}.md`;
  if (!fs.existsSync(file)) {
    console.log(`❌ [${idx + 1}] File not found: ${file}`);
    return;
  }

  const text = fs.readFileSync(file, 'utf-8');
  const frontmatterMatch = text.match(/^---([\s\S]*?)---/);
  const body = text.replace(/^---[\s\S]*?---/, '').trim();
  const words = body.split(/\s+/).filter(Boolean).length;
  
  let desc = '';
  if (frontmatterMatch) {
    const descMatch = frontmatterMatch[1].match(/description:\s*"([^"]+)"/) || frontmatterMatch[1].match(/description:\s*'([^']+)'/);
    if (descMatch) desc = descMatch[1];
  }

  const descLen = desc.length;
  const isDescIdeal = descLen >= 140 && descLen <= 160;
  const isWordCountRich = words >= 1400;

  if (words < 1400) lowWordCountCount++;
  if (!isDescIdeal) descLengthIssues++;

  console.log(
    `[${String(idx + 1).padStart(2, ' ')}] ${m.slug.padEnd(65, ' ')} | Words: ${String(words).padStart(4, ' ')} | Desc: ${descLen} chars ${isDescIdeal ? '✅' : '⚠️'}`
  );
});

console.log(`\nSummary:`);
console.log(`Articles with word count < 1,400: ${lowWordCountCount}`);
console.log(`Articles with description outside 140-160 chars: ${descLengthIssues}`);
