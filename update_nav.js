const fs = require('fs');
const path = require('path');

const root = process.cwd();

// ONLY LIVE PAGES EXPOSED IN ONTOLOGY
const ontology = {
  products: [
    { name: "Jurnii UX", slug: "products/jurnii-ux.html", icon: "layout-template", sub: "UX Intelligence" },
    { name: "Jurnii 360", slug: "products/jurnii-360.html", icon: "radar", sub: "Commercial Radar" },
    { name: "Cortex", slug: "products/cortex.html", icon: "network", sub: "Marketing Attribution" }
  ]
};

const featuresOntology = {
  competitorCore: {
    title: "Competitor",
    items: [
      { name: "Promotions", slug: "features/competitor-promotions.html", icon: "tag" },
      { name: "Positioning", slug: "features/competitor-positioning.html", icon: "map-pin" },
      { name: "Comparison", slug: "features/competitor-comparison.html", icon: "git-compare" },
      { name: "Analysis", slug: "features/competitor-analysis.html", icon: "bar-chart-2" }
    ]
  },
  competitorFeed: {
    title: "Competitor Feed",
    items: [
      { name: "Offer Feed", slug: "features/competitor-offer-feed.html", icon: "rss" },
      { name: "Live Feed", slug: "features/competitor-live-feed.html", icon: "activity" },
      { name: "Alerts", slug: "features/competitor-alerts.html", icon: "bell" },
      { name: "AI Insights", slug: "features/competitor-ai-insights.html", icon: "brain" }
    ]
  },
  brandCore: {
    title: "Brand",
    items: [
      { name: "Meta Scoring", slug: "features/brand-meta-scoring.html", icon: "sparkles" },
      { name: "Market Trends", slug: "features/brand-market-trends.html", icon: "trending-up" },
      { name: "Design Themes", slug: "features/brand-design-themes.html", icon: "palette" },
      { name: "Promotion Analysis", slug: "features/brand-promotion-analysis.html", icon: "layers" }
    ]
  },
  brandPerformance: {
    title: "Brand Performance",
    items: [
      { name: "Perfomance", slug: "features/brand-perfomance.html", icon: "zap" },
      { name: "Usability", slug: "features/brand-usability.html", icon: "check-circle" },
      { name: "Preception", slug: "features/brand-preception.html", icon: "eye" },
      { name: "Recommendations", slug: "features/brand-recommendations.html", icon: "thumbs-up" }
    ]
  }
};

const solutionsOntology = {
  competition: {
    title: "Competition",
    items: [
      { name: "Discovery", slug: "solutions/competition-discovery.html", icon: "search" },
      { name: "Offers", slug: "solutions/competition-offers.html", icon: "gift" },
      { name: "Pricing", slug: "solutions/competition-pricing.html", icon: "dollar-sign" },
      { name: "Postitioning", slug: "solutions/competition-postitioning.html", icon: "compass" }
    ]
  },
  benchmarking: {
    title: "Benchmarking",
    items: [
      { name: "User Interface", slug: "solutions/user-interface-benchmarking.html", icon: "layout" },
      { name: "User Experience", slug: "solutions/user-experience-benchmarking.html", icon: "smile" },
      { name: "Customer Journey", slug: "solutions/customer-journey-benchmarking.html", icon: "milestone" },
      { name: "Market Positioning", slug: "solutions/market-positioning-benchmarking.html", icon: "globe" }
    ]
  },
  attribution: {
    title: "Attribution",
    items: [
      { name: "Marketing ROI", slug: "solutions/marketing-roi-attribution.html", icon: "pie-chart" },
      { name: "Cross-Channel", slug: "solutions/cross-channel-attribution.html", icon: "split" },
      { name: "Marketing Mix Modeling", slug: "solutions/marketing-mix-modeling-attribution.html", icon: "bar-chart-3" },
      { name: "Market Growth", slug: "solutions/market-growth-attribution.html", icon: "trending-up" }
    ]
  },
  optimization: {
    title: "Optimization",
    items: [
      { name: "Conversion Rate", slug: "solutions/conversion-rate-optimization.html", icon: "percent" },
      { name: "Life Time Value", slug: "solutions/life-time-value-optimization.html", icon: "heart" },
      { name: "Churn Rate", slug: "solutions/churn-rate-optimization.html", icon: "user-minus" },
      { name: "Customer Aquistion Cost", slug: "solutions/customer-aquistion-cost-optimization.html", icon: "shopping-bag" }
    ]
  }
};

const useCasesOntology = {
  roles: {
    title: "Roles",
    slug: "use-cases/roles.html",
    items: [
      { name: "CMO", slug: "use-cases/roles/cmo.html", icon: "megaphone" },
      { name: "COO", slug: "use-cases/roles/coo.html", icon: "briefcase" },
      { name: "CCO", slug: "use-cases/roles/cco.html", icon: "coins" }
    ]
  },
  companySizes: {
    title: "Company Size",
    slug: "use-cases/company-sizes.html",
    items: [
      { name: "SMB", slug: "use-cases/company-sizes/smb.html", icon: "store" },
      { name: "MidMarket", slug: "use-cases/company-sizes/midmarket.html", icon: "building" },
      { name: "Enterprise", slug: "use-cases/company-sizes/enterprise.html", icon: "building-2" }
    ]
  },
  departments: {
    title: "Departments",
    slug: "use-cases/departments.html",
    items: [
      { name: "Marketing", slug: "use-cases/departments/marketing.html", icon: "users" },
      { name: "Commercial", slug: "use-cases/departments/commercial.html", icon: "trending-up" },
      { name: "Product", slug: "use-cases/departments/product.html", icon: "layout" }
    ]
  },
  sectors: {
    title: "Sectors",
    slug: "use-cases/sectors.html",
    items: [
      { name: "iGaming", slug: "use-cases/sectors/igaming.html", icon: "trophy" },
      { name: "eCommerce", slug: "use-cases/sectors/ecommerce.html", icon: "shopping-bag" },
      { name: "FinTech", slug: "use-cases/sectors/fintech.html", icon: "credit-card" }
    ]
  }
};

function buildNav(levelPrefix) {
  const renderProductsDropdown = (title, items, columnsClass, footerLink) => {
    if (!items || items.length === 0) return '';
    let html = '        <div class="dropdown">\n';
    html += '          <button>' + title + ' <i data-lucide="chevron-down" style="width:14px;height:14px;"></i></button>\n';
    html += '          <div class="dropdown-panel ' + (columnsClass || '') + '">\n';
    
    items.forEach(i => {
      html += '            <a href="' + levelPrefix + i.slug + '" class="dropdown-item">\n';
      html += '              <div class="ico"><i data-lucide="' + (i.icon || 'circle') + '"></i></div>\n';
      html += '              <div><b>' + i.name + '</b>';
      if (i.sub) {
        html += '<span>' + i.sub + '</span>';
      }
      html += '</div>\n';
      html += '            </a>\n';
    });
    
    if (footerLink) {
      html += '            <a href="' + levelPrefix + footerLink.slug + '" class="dropdown-footer">\n';
      html += '              ' + footerLink.name + ' <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>\n';
      html += '            </a>\n';
    }
    
    html += '          </div>\n';
    html += '        </div>';
    return html;
  };

  const renderFeaturesDropdown = (levelPrefix) => {
    let html = '        <div class="dropdown">\n';
    html += '          <button>Features <i data-lucide="chevron-down" style="width:14px;height:14px;"></i></button>\n';
    html += '          <div class="dropdown-panel features-dropdown">\n';
    
    // Competitor Column Group
    html += '            <div class="dropdown-parent-column">\n';
    html += '              <span class="dropdown-parent-header">Competitor</span>\n';
    html += '              <div class="dropdown-sub-columns">\n';
    
    // Sub-column 1: Core
    html += '                <div class="dropdown-column-links">\n';
    featuresOntology.competitorCore.items.forEach(i => {
      html += '                  <a href="' + levelPrefix + i.slug + '" class="dropdown-column-item">\n';
      html += '                    <i data-lucide="' + (i.icon || 'circle') + '"></i> ' + i.name + '\n';
      html += '                  </a>\n';
    });
    html += '                </div>\n';
    
    // Sub-column 2: Feed
    html += '                <div class="dropdown-column-links">\n';
    featuresOntology.competitorFeed.items.forEach(i => {
      html += '                  <a href="' + levelPrefix + i.slug + '" class="dropdown-column-item">\n';
      html += '                    <i data-lucide="' + (i.icon || 'circle') + '"></i> ' + i.name + '\n';
      html += '                  </a>\n';
    });
    html += '                </div>\n';
    
    html += '              </div>\n';
    html += '            </div>\n';
    
    // Brand Column Group
    html += '            <div class="dropdown-parent-column">\n';
    html += '              <span class="dropdown-parent-header">Brand</span>\n';
    html += '              <div class="dropdown-sub-columns">\n';
    
    // Sub-column 3: Core
    html += '                <div class="dropdown-column-links">\n';
    featuresOntology.brandCore.items.forEach(i => {
      html += '                  <a href="' + levelPrefix + i.slug + '" class="dropdown-column-item">\n';
      html += '                    <i data-lucide="' + (i.icon || 'circle') + '"></i> ' + i.name + '\n';
      html += '                  </a>\n';
    });
    html += '                </div>\n';
    
    // Sub-column 4: Performance
    html += '                <div class="dropdown-column-links">\n';
    featuresOntology.brandPerformance.items.forEach(i => {
      html += '                  <a href="' + levelPrefix + i.slug + '" class="dropdown-column-item">\n';
      html += '                    <i data-lucide="' + (i.icon || 'circle') + '"></i> ' + i.name + '\n';
      html += '                  </a>\n';
    });
    html += '                </div>\n';
    
    html += '              </div>\n';
    html += '            </div>\n';
    
    html += '            <a href="' + levelPrefix + 'features/index.html" class="dropdown-footer">\n';
    html += '              View all features <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>\n';
    html += '            </a>\n';
    
    html += '          </div>\n';
    html += '        </div>';
    return html;
  };

  const renderSolutionsDropdown = (levelPrefix) => {
    let html = '        <div class="dropdown">\n';
    html += '          <button>Solutions <i data-lucide="chevron-down" style="width:14px;height:14px;"></i></button>\n';
    html += '          <div class="dropdown-panel cols-4">\n';
    
    const groups = ['competition', 'benchmarking', 'attribution', 'optimization'];
    groups.forEach(gKey => {
      const group = solutionsOntology[gKey];
      html += '            <div class="dropdown-column">\n';
      html += '              <span class="dropdown-column-header">' + group.title + '</span>\n';
      html += '              <div class="dropdown-column-links">\n';
      
      group.items.forEach(i => {
        html += '                <a href="' + levelPrefix + i.slug + '" class="dropdown-column-item">\n';
        html += '                  <i data-lucide="' + (i.icon || 'circle') + '"></i> ' + i.name + '\n';
        html += '                </a>\n';
      });
      
      html += '              </div>\n';
      html += '            </div>\n';
    });
    
    html += '            <a href="' + levelPrefix + 'solutions/index.html" class="dropdown-footer">\n';
    html += '              View all solutions <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>\n';
    html += '            </a>\n';
    
    html += '          </div>\n';
    html += '        </div>';
    return html;
  };

  const renderUseCasesDropdown = (levelPrefix) => {
    let html = '        <div class="dropdown">\n';
    html += '          <button>Use Cases <i data-lucide="chevron-down" style="width:14px;height:14px;"></i></button>\n';
    html += '          <div class="dropdown-panel cols-4">\n';
    
    const groups = ['roles', 'companySizes', 'departments', 'sectors'];
    groups.forEach(gKey => {
      const group = useCasesOntology[gKey];
      html += '            <div class="dropdown-column">\n';
      html += '              <a href="' + levelPrefix + group.slug + '" class="dropdown-column-header">' + group.title + '</a>\n';
      html += '              <div class="dropdown-column-links">\n';
      
      group.items.forEach(i => {
        html += '                <a href="' + levelPrefix + i.slug + '" class="dropdown-column-item">\n';
        html += '                  <i data-lucide="' + (i.icon || 'circle') + '"></i> ' + i.name + '\n';
        html += '                </a>\n';
      });
      
      html += '              </div>\n';
      html += '            </div>\n';
    });
    
    html += '            <a href="' + levelPrefix + 'use-cases/index.html" class="dropdown-footer">\n';
    html += '              View all use cases <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>\n';
    html += '            </a>\n';
    
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
  
  html += renderProductsDropdown('Products', ontology.products, '') + '\n';
  html += renderFeaturesDropdown(levelPrefix) + '\n';
  html += renderSolutionsDropdown(levelPrefix) + '\n';
  html += renderUseCasesDropdown(levelPrefix) + '\n';
  
  html += '      </div>\n';
  html += '      <div class="nav-cta"><a href="#" class="btn primary">Book Demo</a></div>\n';
  html += '    </div>\n';
  
  // Interactive navigation dropdown scripts to make it work DRYly on every page
  html += '    <script>\n';
  html += '      (function() {\n';
  html += '        function initNav() {\n';
  html += '          if (typeof lucide !== "undefined") {\n';
  html += '            lucide.createIcons();\n';
  html += '          }\n';
  html += '          const dropdowns = document.querySelectorAll(".dropdown");\n';
  html += '          dropdowns.forEach(drop => {\n';
  html += '            const btn = drop.querySelector("button");\n';
  html += '            if (!btn) return;\n';
  html += '            btn.addEventListener("click", (e) => {\n';
  html += '              e.stopPropagation();\n';
  html += '              dropdowns.forEach(d => {\n';
  html += '                if (d !== drop) d.classList.remove("open");\n';
  html += '              });\n';
  html += '              drop.classList.toggle("open");\n';
  html += '            });\n';
  html += '          });\n';
  html += '          document.addEventListener("click", () => {\n';
  html += '            dropdowns.forEach(d => d.classList.remove("open"));\n';
  html += '          });\n';
  html += '        }\n';
  html += '        if (document.readyState === "loading") {\n';
  html += '          document.addEventListener("DOMContentLoaded", initNav);\n';
  html += '        } else {\n';
  html += '          initNav();\n';
  html += '        }\n';
  html += '      })();\n';
  html += '    </script>\n';
  
  html += '  </nav>';
  
  return html;
}

function scanHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('.agents') && !file.includes('assets') && !file.includes('.git') && !file.includes('node_modules')) { 
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

    // Strip duplicate dropdown click listeners
    const duplicateRegex = /\/\/\s*Simple dropdown toggle logic[\s\S]*?document\.addEventListener\(['"]click['"],\s*\(\)\s*=>\s*\{[\s\S]*?\}\);/g;
    content = content.replace(duplicateRegex, '');

    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated Dynamic DRY Nav & Cleaned Dropdowns:', relPath);
});
