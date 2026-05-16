const fs = require('fs');
const path = require('path');

const root = process.cwd();

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
    const fileDir = path.dirname(file);
    
    let changed = false;
    content = content.replace(/href="(.*?\.html)"/g, (match, link) => {
        if (link.startsWith('http') || link.startsWith('#')) return match;
        
        const targetPath = path.resolve(fileDir, link);
        if (!fs.existsSync(targetPath)) {
            changed = true;
            console.log(`Fixing broken link: ${link} in ${file}`);
            return 'href="#"';
        }
        return match;
    });

    if (changed) {
        fs.writeFileSync(file, content);
    }
});
