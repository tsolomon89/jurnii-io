const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// 1. Mock window and evaluate the legacy feature-data.jsx
const dataPath = path.join(__dirname, '../.agents/context/legacy/website-main/assets/feature-data.jsx');
const dataContent = fs.readFileSync(dataPath, 'utf8');

const mockWindow = {};
const executeData = new Function('window', dataContent);
executeData(mockWindow);

const FEATURE_DATA = mockWindow.FEATURE_DATA;

if (!FEATURE_DATA) {
  console.error("Failed to load FEATURE_DATA");
  process.exit(1);
}

// 2. Iterate through Markdown files in content/www/features
const featuresDir = path.join(__dirname, '../content/www/features');
const files = fs.readdirSync(featuresDir).filter(f => f.endsWith('.md'));

let updatedCount = 0;

for (const file of files) {
  const slug = file.replace('.md', '');
  const legacyData = FEATURE_DATA[slug];
  
  if (!legacyData) {
    console.warn(`No legacy data found for ${slug}`);
    continue;
  }
  
  const filePath = path.join(featuresDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Parse with gray-matter
  const parsed = matter(content);
  const fm = parsed.data;
  
  // Inject new data
  fm.featureMetrics = legacyData.metrics;
  fm.manifesto = legacyData.manifesto;
  
  fm.challenge = {
    eyebrow: legacyData.challengeEyebrow,
    title: legacyData.challengeTitle,
    para: legacyData.challengePara
  };
  
  fm.solution = {
    para: legacyData.solutionPara,
    foot: legacyData.solutionFoot
  };
  
  fm.featureCapabilities = legacyData.capabilities;
  
  // Set render flags for the static blocks
  fm.renderFlags = fm.renderFlags || {};
  fm.renderFlags.hasFeatureBenchmark = true;
  fm.renderFlags.hasFeatureCortexDash = true;
  fm.renderFlags.hasFeatureQuote = true;
  fm.renderFlags.hasFeatureEcosystem = true;
  
  // Serialize back
  const newContent = matter.stringify(parsed.content, fm);
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Updated ${file}`);
  updatedCount++;
}

console.log(`Done! Updated ${updatedCount} feature files.`);
