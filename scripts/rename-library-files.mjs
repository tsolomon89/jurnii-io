import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const cwd = process.cwd();
const libDir = path.join(cwd, 'content/library');

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const files = fs.readdirSync(libDir).filter((f) => f.endsWith('.md'));
console.log(`Auditing ${files.length} library files for renaming...`);

let renamedCount = 0;

for (const file of files) {
  const oldPath = path.join(libDir, file);
  const raw = fs.readFileSync(oldPath, 'utf-8');
  const parsed = matter(raw);

  const title = parsed.data && parsed.data.title ? parsed.data.title : null;
  if (!title) {
    console.warn(`⚠️ Warning: ${file} has no title in front-matter. Skipping.`);
    continue;
  }

  const targetSlug = slugify(title);
  const newFilename = `${targetSlug}.md`;
  const newPath = path.join(libDir, newFilename);

  if (file !== newFilename) {
    if (fs.existsSync(newPath) && newPath !== oldPath) {
      console.log(`Overwriting existing file ${newFilename}`);
    }
    fs.writeFileSync(newPath, raw, 'utf-8');
    if (oldPath.toLowerCase() !== newPath.toLowerCase()) {
      fs.unlinkSync(oldPath);
    }
    console.log(`✓ Renamed "${file}" -> "${newFilename}" (Title: "${title}")`);
    renamedCount++;
  } else {
    console.log(`✓ Already properly named: "${file}"`);
  }
}

console.log(`\nSuccessfully renamed ${renamedCount} files in content/library.`);
