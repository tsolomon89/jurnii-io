import fs from 'node:fs';
import path from 'node:path';

const contentDir = path.resolve('content/library');

const urlReplacements = [
  { from: '/solutions/marketing-mix-modelling-attribution', to: '/solutions/marketing-mix-modeling-attribution' },
  { from: '/solutions/conversion-rate-optimisation', to: '/solutions/conversion-rate-optimization' },
  { from: '/solutions/life-time-value-optimisation', to: '/solutions/life-time-value-optimization' },
  { from: '/solutions/churn-rate-optimisation', to: '/solutions/churn-rate-optimization' },
  { from: '/solutions/customer-acquisition-cost-optimisation', to: '/solutions/customer-acquisition-cost-optimization' },
  { from: '/solutions/product-sprint-prioritisation', to: '/solutions/product-sprint-prioritization' },
];

const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));

for (const file of files) {
  const filePath = path.join(contentDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const { from, to } of urlReplacements) {
    if (content.includes(from)) {
      content = content.replaceAll(from, to);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed URL routes in ${file}`);
  }
}
