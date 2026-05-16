const fs = require('fs');
const path = require('path');

const root = process.cwd();

const ontology = {
  features: [
    { name: "Journeys", slug: "features/journeys.html", icon: "zap" },
    { name: "Usability", slug: "features/usability.html", icon: "mouse-pointer" },
    { name: "Performance", slug: "features/performance.html", icon: "gauge" },
    { name: "Brand", slug: "features/brand.html", icon: "shield" },
    { name: "Promotions", slug: "features/promotions.html", icon: "tag" },
    { name: "Timings", slug: "features/timings.html", icon: "clock" },
    { name: "Offers", slug: "features/offers.html", icon: "percent" },
    { name: "Banners", slug: "features/banners.html", icon: "image" },
    { name: "Segments", slug: "features/segments.html", icon: "users" },
    { name: "Trends", slug: "features/trends.html", icon: "trending-up" },
    { name: "Alerts", slug: "features/alerts.html", icon: "bell" },
    { name: "Database", slug: "features/database.html", icon: "database" },
    { name: "Indices", slug: "features/indices.html", icon: "bar-chart" },
    { name: "Exports", slug: "features/exports.html", icon: "download" },
    { name: "Causal Impact & MMM", slug: "features/causal-impact-mmm.html", icon: "git-merge" },
    { name: "Cross-channel Gantt", slug: "features/cross-channel-gantt.html", icon: "calendar" },
    { name: "AI Analytics Assistant", slug: "features/ai-analytics-assistant.html", icon: "bot" },
    { name: "Finance Reconciliation", slug: "features/finance-reconciliation.html", icon: "calculator" },
    { name: "AI Snapshot Reports", slug: "features/ai-snapshot-reports.html", icon: "file-text" },
    { name: "Scenario Planning", slug: "features/scenario-planning.html", icon: "git-branch" }
  ],
  solutions: [
    { name: "UX Benchmarking", slug: "solutions/ux-benchmarking.html", icon: "search" },
    { name: "Competitor Intelligence", slug: "solutions/competitor-intelligence.html", icon: "radar" },
    { name: "Conversion Optimisation", slug: "solutions/conversion-optimisation.html", icon: "sliders" },
    { name: "Retention Intelligence", slug: "solutions/retention-intelligence.html", icon: "heart" },
    { name: "Marketing Attribution", slug: "solutions/marketing-attribution.html", icon: "pie-chart" },
    { name: "Marketing Mix Modelling", slug: "solutions/marketing-mix-modelling.html", icon: "git-branch" },
    { name: "Commercial Intelligence", slug: "solutions/commercial-intelligence.html", icon: "briefcase" }
  ],
  useCases: [
    { name: "Operators", slug: "use-cases/industry/operators.html", icon: "building" },
    { name: "Suppliers", slug: "use-cases/industry/suppliers.html", icon: "plug" },
    { name: "CPO", slug: "use-cases/role/cpo.html", icon: "layout" },
    { name: "CCO", slug: "use-cases/role/cco.html", icon: "briefcase" },
    { name: "CMO", slug: "use-cases/role/cmo.html", icon: "megaphone" },
    { name: "CEO", slug: "use-cases/role/ceo.html", icon: "target" },
    { name: "Head of CRM", slug: "use-cases/role/head-of-crm.html", icon: "users" },
    { name: "Head of UX", slug: "use-cases/role/head-of-ux.html", icon: "mouse-pointer" }
  ]
};

function buildNav(levelPrefix) {
  const renderDropdown = (title, items, columnsClass) => {
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
  
  html += renderDropdown('Features', ontology.features, 'cols-2') + '\n';
  html += renderDropdown('Solutions', ontology.solutions, 'cols-2') + '\n';
  html += renderDropdown('Use Cases', ontology.useCases, 'cols-2') + '\n';
  
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
