const fs = require('fs');
const path = require('path');

const root = process.cwd();

// Helper to scan for all HTML files
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
    const relPath = path.relative(root, file);
    const depth = relPath.split(path.sep).length - 1;
    
    let levelPrefix = '';
    for (let i = 0; i < depth; i++) {
        levelPrefix += '../';
    }
    
    let changed = false;
    
    // Regular expression for href="..." and src="..."
    // Matches links that don't start with http, //, mailto, tel, or #
    const linkRegex = /(href|src)="([^"#:][^"]*)"/g;
    
    content = content.replace(linkRegex, (match, attr, link) => {
        // Skip links that are just anchor/hash links or empty
        if (!link || link.startsWith('#')) return match;
        
        // Find if this link refers to any of our known sections/assets/pages
        // We look for patterns like 'index.html', 'assets/...', 'products/...', 'features/...', 'solutions/...', 'use-cases/...'
        const patterns = [
            'assets/',
            'products/',
            'features/',
            'solutions/',
            'use-cases/',
            'index.html',
            'features',
            'solutions',
            'use-cases'
        ];
        
        let rootRelativeTarget = null;
        for (const pattern of patterns) {
            const index = link.indexOf(pattern);
            if (index !== -1) {
                rootRelativeTarget = link.substring(index);
                break;
            }
        }
        
        if (rootRelativeTarget) {
            const correctedLink = levelPrefix + rootRelativeTarget;
            if (correctedLink !== link) {
                console.log(`Fixing link in ${relPath}: ${link} -> ${correctedLink}`);
                changed = true;
                return `${attr}="${correctedLink}"`;
            }
        }
        
        return match;
    });

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
    }
});

console.log('Finished fixing all relative links.');
