const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const dirsToClean = [
  path.join(__dirname, '../content/www/features'),
  path.join(__dirname, '../content/www/products'),
  path.join(__dirname, '../content/www/solutions'),
  path.join(__dirname, '../content/www/use-cases')
];

const keysToRemove = [
  'featureMetrics',
  'manifesto',
  'challenge',
  'solution',
  'featureCapabilities',
  'renderFlags',
  'outcomes',
  'method',
  'testimonials',
  'personas',
  'cta'
];

let updatedCount = 0;

for (const dir of dirsToClean) {
  if (!fs.existsSync(dir)) continue;
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    const parsed = matter(content);
    let modified = false;
    
    for (const key of keysToRemove) {
      if (key in parsed.data) {
        delete parsed.data[key];
        modified = true;
      }
    }
    
    if (modified) {
      const newContent = matter.stringify(parsed.content, parsed.data);
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Cleaned ${file}`);
      updatedCount++;
    }
  }
}

console.log(`Done! Cleaned ${updatedCount} files.`);
