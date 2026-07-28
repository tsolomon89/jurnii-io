import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const cwd = process.cwd();
const libDir = path.join(cwd, 'content/library');

const files = fs.readdirSync(libDir).filter(f => f.endsWith('.md'));

console.log(`Auditing ${files.length} library files...`);

for (const file of files) {
  const filePath = path.join(libDir, file);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);

  if (!parsed.data || !parsed.data.title) {
    console.log(`Fixing front-matter for: ${file}`);
    const lines = raw.split('\n');
    let title = file.replace(/\.md$/, '').replace(/([A-Z])/g, ' $1').trim();
    let author = 'Timothy Solomon';
    let category = 'Product Strategy';
    let date = '2026-05-10';
    let excerpt = '';

    // Extract H1 title
    const h1Line = lines.find(l => l.startsWith('# '));
    if (h1Line) {
      title = h1Line.replace(/^#\s+/, '').trim();
    }

    // Extract author line if present
    const byLine = lines.find(l => l.toLowerCase().startsWith('by '));
    if (byLine) {
      author = byLine.replace(/^by\s+/i, '').split(',')[0].trim();
    }

    // Extract excerpt from first prose paragraph
    const proseLine = lines.find(l => l.trim() && !l.startsWith('#') && !l.toLowerCase().startsWith('by '));
    if (proseLine) {
      excerpt = proseLine.trim().substring(0, 160) + '...';
    }

    // Determine category based on filename
    if (file.toLowerCase().includes('ux') || file.toLowerCase().includes('usability')) {
      category = 'UX & Product';
    } else if (file.toLowerCase().includes('mmm') || file.toLowerCase().includes('analytics')) {
      category = 'Econometrics';
    } else if (file.toLowerCase().includes('competitor') || file.toLowerCase().includes('radar')) {
      category = 'Competitive Intelligence';
    } else {
      category = 'Commercial Strategy';
    }

    const frontMatterObj = {
      title,
      description: excerpt,
      excerpt,
      date,
      medium: file.toLowerCase().includes('paper') ? 'Paper' : 'Article',
      category,
      author,
      tags: [category, 'iGaming', 'Intelligence'],
      isIndexable: true,
      ...parsed.data,
    };

    const newContent = matter.stringify(parsed.content, frontMatterObj);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`✓ Updated ${file} with title: "${title}"`);
  }
}

console.log('Front-matter fix script complete.');
