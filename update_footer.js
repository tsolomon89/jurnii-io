const fs = require('fs');
const path = require('path');

const root = process.cwd();

function buildFooter(levelPrefix) {
  return `  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <img src="${levelPrefix}assets/jurnii-light-full.svg" alt="Jurnii">
          <p>The intelligence layer for modern iGaming operators. Structured market data, automated benchmarking, and real-time competitor tracking.</p>
        </div>
        <div class="footer-cols">
          <div>
            <div class="footer-head">Products</div>
            <a href="${levelPrefix}products/jurnii-ux.html">Jurnii UX</a>
            <a href="${levelPrefix}products/jurnii-360.html">Jurnii 360</a>
            <a href="${levelPrefix}products/cortex.html">Cortex</a>
          </div>
          <div>
            <div class="footer-head">Features</div>
            <a href="${levelPrefix}features/journeys.html">Journeys</a>
            <a href="${levelPrefix}features/promotions.html">Promotions</a>
          </div>
          <div>
            <div class="footer-head">Solutions</div>
            <a href="${levelPrefix}solutions/ux-benchmarking.html">UX Benchmarking</a>
            <a href="${levelPrefix}solutions/conversion-optimisation.html">Conversion Optimisation</a>
            <a href="${levelPrefix}solutions/competitor-intelligence.html">Competitor Intelligence</a>
          </div>
          <div>
            <div class="footer-head">Use Cases</div>
            <a href="${levelPrefix}use-cases/industry/operators.html">For Operators</a>
            <a href="${levelPrefix}use-cases/role/cpo.html">For CPOs</a>
          </div>
        </div>
      </div>
      <div class="footer-foot">
        <div>&copy; 2026 Jurnii.io. All rights reserved.</div>
        <div class="footer-social">
          <a href="#"><i data-lucide="twitter" style="width:16px;height:16px;"></i></a>
          <a href="#"><i data-lucide="linkedin" style="width:16px;height:16px;"></i></a>
        </div>
      </div>
    </div>
  </footer>`;
}

function scanHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('.agents') && !file.includes('assets') && !file.includes('.git')) { 
            results = results.concat(scanHtmlFiles(file));
        } else if (file.endsWith('.html')) {
            results.push(file);
        }
    });
    return results;
}

const files = scanHtmlFiles(root);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Determine level
    const relPath = path.relative(root, file);
    const depth = relPath.split(path.sep).length - 1;
    let levelPrefix = '';
    for(let i=0; i<depth; i++) levelPrefix += '../';

    const newFooter = buildFooter(levelPrefix);
    
    // Replace Footer
    content = content.replace(/<footer class="footer">[\s\S]*?<\/footer>/, newFooter);

    fs.writeFileSync(file, content);
    console.log('Updated Footer:', relPath);
});
