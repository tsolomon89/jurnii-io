const fs = require('fs');
const path = require('path');

const root = process.cwd();

// ONLY LIVE PAGES EXPOSED
const ontology = {
  features: [
    { name: "Journeys", slug: "features/journeys.html", icon: "zap" },
    { name: "Promotions", slug: "features/promotions.html", icon: "tag" }
  ],
  solutions: [
    { name: 'UX Benchmarking', slug: 'solutions/ux-benchmarking.html', icon: 'bar-chart' },
    { name: 'Conversion Optimisation', slug: 'solutions/conversion-optimisation.html', icon: 'trending-up' },
    { name: 'Competitor Intelligence', slug: 'solutions/competitor-intelligence.html', icon: 'shield-alert' }
  ],
  useCases: [
    { name: "Operators", slug: "use-cases/industry/operators.html", icon: "building" },
    { name: "CPO", slug: "use-cases/role/cpo.html", icon: "layout" }
  ]
};

function buildNav(levelPrefix) {
  const renderDropdown = (title, items, columnsClass) => {
    if (items.length === 0) return '';
    let html = '        <div class="dropdown">\n';
    html += '          <button>' + title + ' <i data-lucide="chevron-down" style="width:14px;height:14px;"></i></button>\n';
    html += '          <div class="dropdown-panel ' + columnsClass + '">\n';
    
    items.forEach(i => {
      html += '            <a href="' + levelPrefix + i.slug + '" class="dropdown-item">\n';
      html += '              <div class="ico"><i data-lucide="' + (i.icon || 'circle') + '"></i></div>\n';
      html += '              <div><b>' + i.name + '</b></div>\n';
      html += '            </a>\n';
    });
    
    html += '          </div>\n';
    html += '        </div>';
    return html;
  };

  let html = '  <nav class="nav">\n';
  html += '    <div class="container nav-inner">\n';
  html += '      <div class="nav-brand">\n';
  html += '        <a href="' + levelPrefix + 'index.html"><img src="' + levelPrefix + 'assets/jurnii-dark-full.svg" alt="Jurnii Logo" class="logo-light"></a>\n';
  html += '      </div>\n';
  html += '      <div class="nav-links">\n';
  html += '        <div class="dropdown">\n';
  html += '          <button>Products <i data-lucide="chevron-down" style="width:14px;height:14px;"></i></button>\n';
  html += '          <div class="dropdown-panel">\n';
  html += '            <a href="' + levelPrefix + 'products/jurnii-ux.html" class="dropdown-item">\n';
  html += '              <div class="ico"><i data-lucide="layout-template"></i></div>\n';
  html += '              <div><b>Jurnii UX</b><span>UX Intelligence</span></div>\n';
  html += '            </a>\n';
  html += '            <a href="' + levelPrefix + 'products/jurnii-360.html" class="dropdown-item">\n';
  html += '              <div class="ico"><i data-lucide="radar"></i></div>\n';
  html += '              <div><b>Jurnii 360</b><span>Commercial Radar</span></div>\n';
  html += '            </a>\n';
  html += '            <a href="' + levelPrefix + 'products/cortex.html" class="dropdown-item">\n';
  html += '              <div class="ico"><i data-lucide="network"></i></div>\n';
  html += '              <div><b>Cortex</b><span>Marketing Attribution</span></div>\n';
  html += '            </a>\n';
  html += '          </div>\n';
  html += '        </div>\n';
  
  const featuresHtml = renderDropdown('Features', ontology.features, 'cols-2');
  if (featuresHtml) html += featuresHtml + '\n';
  
  const solutionsHtml = renderDropdown('Solutions', ontology.solutions, 'cols-2');
  if (solutionsHtml) html += solutionsHtml + '\n';
  
  const useCasesHtml = renderDropdown('Use Cases', ontology.useCases, 'cols-2');
  if (useCasesHtml) html += useCasesHtml + '\n';
  
  html += '      </div>\n';
  html += '      <div class="nav-cta"><a href="#" class="btn primary">Book Demo</a></div>\n';
  html += '    </div>\n';
  html += '  </nav>';
  
  return html;
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

    const newNav = buildNav(levelPrefix);
    
    // Replace Nav
    content = content.replace(/<nav class="nav">[\s\S]*?<\/nav>/, newNav);

    fs.writeFileSync(file, content);
    console.log('Updated Nav:', relPath);
});
