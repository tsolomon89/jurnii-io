const fs = require('fs');
const path = require('path');

const root = process.cwd();

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

const mapping = {
  'use-cases/role/cmo.html': 'use-cases/roles/cmo.html',
  'use-cases/role/cco.html': 'use-cases/roles/cco.html',
  'use-cases/role/coo.html': 'use-cases/roles/coo.html',
  'use-cases/role/cpo.html': 'use-cases/departments/product.html',
  'use-cases/role/ceo.html': 'use-cases/roles.html',
  'use-cases/role/head-of-crm-retention.html': 'use-cases/departments/marketing.html',
  'use-cases/role/head-of-ux-cx.html': 'use-cases/departments/product.html',
  'use-cases/industry/operators.html': 'use-cases/sectors/igaming.html',
  'use-cases/company-type/igaming-operators.html': 'use-cases/sectors/igaming.html'
};

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(root, file);
    const depth = relPath.split(path.sep).length - 1;
    
    let levelPrefix = '';
    for (let i = 0; i < depth; i++) {
        levelPrefix += '../';
    }

    let changed = false;

    // We search for any href="..." referencing the old paths, taking into account relative path prefixes like ../ or ../../
    const hrefRegex = /href="([^"#]+)"/g;
    content = content.replace(hrefRegex, (match, link) => {
        // Resolve link to a root-relative path to match against our mapping keys
        // If the link contains 'use-cases/role/...' etc.
        for (const [oldPath, newPath] of Object.entries(mapping)) {
            // Find where 'use-cases' starts in the link
            const index = link.indexOf('use-cases/');
            if (index !== -1) {
                const subLink = link.substring(index);
                if (subLink === oldPath) {
                    const correctedLink = link.substring(0, index) + newPath;
                    console.log(`Mapping old link in ${relPath}: ${link} -> ${correctedLink}`);
                    changed = true;
                    return `href="${correctedLink}"`;
                }
            }
        }
        return match;
    });

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
    }
});

console.log('Finished correcting deprecated use-case links.');
