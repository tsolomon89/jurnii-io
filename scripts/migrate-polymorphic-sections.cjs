const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// 1. Mock window and evaluate the legacy feature-data.jsx
const featureDataPath = path.join(__dirname, '../.agents/context/legacy/website-main/assets/feature-data.jsx');
const productDataPath = path.join(__dirname, '../.agents/context/legacy/website-main/assets/product-data.jsx');

const mockWindow = {};
const executeFeature = new Function('window', fs.readFileSync(featureDataPath, 'utf8'));
executeFeature(mockWindow);

const executeProduct = new Function('window', fs.readFileSync(productDataPath, 'utf8'));
executeProduct(mockWindow);

const FEATURE_DATA = mockWindow.FEATURE_DATA;
const PRODUCT_DATA = mockWindow.PRODUCT_DATA;

if (!FEATURE_DATA || !PRODUCT_DATA) {
  console.error("Failed to load legacy data");
  process.exit(1);
}

const mapFeatures = () => {
  const featuresDir = path.join(__dirname, '../content/www/features');
  const files = fs.readdirSync(featuresDir).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const slug = file.replace('.md', '');
    const legacyData = FEATURE_DATA[slug];
    
    if (!legacyData) continue;
    
    const filePath = path.join(featuresDir, file);
    const parsed = matter(fs.readFileSync(filePath, 'utf8'));
    const fm = parsed.data;
    
    fm.sections = fm.sections || [];
    
    // Add blocks if data exists
    if (legacyData.metrics) fm.sections.push({ type: 'metrics', data: legacyData.metrics });
    if (legacyData.manifesto) fm.sections.push({ type: 'manifesto', data: legacyData.manifesto });
    
    if (legacyData.challengeTitle) {
      fm.sections.push({
        type: 'challenge',
        data: {
          eyebrow: legacyData.challengeEyebrow,
          title: legacyData.challengeTitle,
          para: legacyData.challengePara
        }
      });
    }
    
    if (legacyData.solutionPara) {
      fm.sections.push({
        type: 'solution',
        data: {
          para: legacyData.solutionPara,
          foot: legacyData.solutionFoot
        }
      });
    }
    
    if (legacyData.capabilities) fm.sections.push({ type: 'capabilities', data: legacyData.capabilities });
    
    // Static render flags as sections
    fm.sections.push({ type: 'benchmark' });
    fm.sections.push({ type: 'renderFlag', data: 'hasFeatureQuote' });
    
    fs.writeFileSync(filePath, matter.stringify(parsed.content, fm), 'utf8');
    console.log(`Migrated features/${file}`);
  }
};

const mapProducts = () => {
  const prodMap = {
    'jurnii-360': '360',
    'jurnii-ux': 'ux',
    'jurnii-mmm': 'mmm'
  };
  
  const prodDir = path.join(__dirname, '../content/www/products');
  const files = fs.readdirSync(prodDir).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const slug = file.replace('.md', '');
    const legacyKey = prodMap[slug];
    
    if (!legacyKey || !PRODUCT_DATA[legacyKey]) continue;
    const legacyData = PRODUCT_DATA[legacyKey];
    
    const filePath = path.join(prodDir, file);
    const parsed = matter(fs.readFileSync(filePath, 'utf8'));
    const fm = parsed.data;
    
    // Reset properties to clean up the root schema
    delete fm.outcomes;
    delete fm.method;
    delete fm.testimonials;
    delete fm.personas;
    delete fm.cta;
    delete fm.renderFlags;
    
    fm.sections = [];
    
    if (legacyData.outcomes) fm.sections.push({ type: 'outcomes', data: legacyData.outcomes });
    if (legacyData.method) fm.sections.push({ type: 'method', data: legacyData.method });
    if (legacyData.testimonials) fm.sections.push({ type: 'testimonials', data: legacyData.testimonials });
    if (legacyData.personas) fm.sections.push({ type: 'personas', data: legacyData.personas });
    
    if (legacyData.primary) {
      fm.sections.push({
        type: 'cta',
        data: {
          heading: "Ready to proceed?",
          primary: legacyData.primary,
          secondary: legacyData.secondary
        }
      });
    }
    
    // Custom render flags per product
    if (slug === 'jurnii-360') {
      fm.sections.push({ type: 'renderFlag', data: 'hasPromotionsByVertical' });
      fm.sections.push({ type: 'renderFlag', data: 'hasPriceBoostTeaser' });
    } else if (slug === 'jurnii-ux') {
      fm.sections.push({ type: 'renderFlag', data: 'hasUXScorecard' });
      fm.sections.push({ type: 'renderFlag', data: 'hasUXTelemetry' });
    } else if (slug === 'jurnii-mmm') {
      fm.sections.push({ type: 'renderFlag', data: 'hasCanvasComments' });
    }
    
    fs.writeFileSync(filePath, matter.stringify(parsed.content, fm), 'utf8');
    console.log(`Migrated products/${file}`);
  }
};

mapFeatures();
mapProducts();
console.log("Migration complete!");
