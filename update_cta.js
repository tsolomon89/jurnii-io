const fs = require('fs');
const path = require('path');

const root = process.cwd();

function buildCta(levelPrefix) {
  return `  <!-- Unified Reusable CTA Section -->
  <section class="reusable-cta-section">
    <div class="container">
      <div class="reusable-cta-card">
        <span class="eyebrow"><span class="dot"></span>Briefing Session</span>
        <h2>Ready to compete on intelligence?</h2>
        <p>Explore how Jurnii's automated UX benchmarking and competitor surveillance radar can elevate your player registration conversions and commercial margins.</p>
        <div class="cta-row">
          <button class="btn accent lg open-booking-modal-btn">Book a Demo Briefing</button>
          <a href="${levelPrefix}products/jurnii-ux.html" class="btn ghost-on-dark lg">Explore Products</a>
        </div>
      </div>
    </div>
  </section>`;
}

function scanHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && 
        !file.includes('.agents') && 
        !file.includes('assets') && 
        !file.includes('.git') && 
        !file.includes('node_modules') &&
        !file.includes('scratch')) { 
      results = results.concat(scanHtmlFiles(file));
    } else if (file.endsWith('.html')) {
      results.push(file);
    }
  });
  return results;
}

const files = scanHtmlFiles(root);

files.forEach(file => {
  const relPath = path.relative(root, file);
  
  // Skip scratch files
  if (relPath.startsWith('scratch') || relPath.includes('scratch')) return;

  let content = fs.readFileSync(file, 'utf8');
  
  // Determine level depth
  const depth = relPath.split(path.sep).length - 1;
  let levelPrefix = '';
  for(let i=0; i<depth; i++) levelPrefix += '../';

  const newCta = buildCta(levelPrefix);

  // If it is the book.html itself, do not inject the footer CTA section (redundant)
  if (relPath === 'book.html') {
    console.log('Skipping CTA Injection (dedicated booking page):', relPath);
  } else {
    // 1. Check if there is an existing reusable-cta-section
    const existingCtaRegex = /<!-- Unified Reusable CTA Section -->[\s\S]*?<\/section>/g;
    const oldCtaRegex = /<section class="(?:home-demo-cta|product-footer-cta|feature-final-cta|solution-final-cta|usecase-final-cta)"[\s\S]*?<\/section>/g;

    if (existingCtaRegex.test(content)) {
      // Replace existing unified CTA
      content = content.replace(existingCtaRegex, newCta);
    } else if (oldCtaRegex.test(content)) {
      // Replace old bespoke CTAs
      content = content.replace(oldCtaRegex, newCta);
    } else {
      // If neither exists, insert CTA immediately before the footer
      content = content.replace(/<footer class="footer">/, `${newCta}\n\n  <footer class="footer">`);
    }
    console.log('Processed CTA for:', relPath);
  }

  // 2. Inject booking-form.js script reference if not present
  const scriptTag = `<script src="${levelPrefix}assets/booking-form.js"></script>`;
  if (!content.includes('assets/booking-form.js')) {
    // Insert script tag right before </body>
    content = content.replace(/<\/body>/, `  ${scriptTag}\n</body>`);
    console.log('Injected booking-form.js script tag into:', relPath);
  } else {
    // If present, make sure it is updated with the correct levelPrefix path
    const genericScriptRegex = /<script src="[^"]*assets\/booking-form\.js"><\/script>/;
    content = content.replace(genericScriptRegex, scriptTag);
  }

  fs.writeFileSync(file, content, 'utf8');
});

console.log('\nSuccessfully updated CTA sections and centralized JavaScript references across all pages.');
