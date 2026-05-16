const fs = require('fs');
const path = require('path');

const root = process.cwd();
let hasErrors = false;

function scanHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('.agents') && !file.includes('assets')) { 
            results = results.concat(scanHtmlFiles(file));
        } else if (file.endsWith('.html')) {
            results.push(file);
        }
    });
    return results;
}

const htmlFiles = scanHtmlFiles(root);

htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const hrefRegex = /href="([^"#]+)"/g;
    let match;
    while ((match = hrefRegex.exec(content)) !== null) {
        let link = match[1];
        if (link.startsWith('http') || link.startsWith('//')) continue;
        
        let targetPath = path.resolve(path.dirname(file), link);
        if (!fs.existsSync(targetPath)) {
            console.error('BROKEN LINK: ' + link + ' in ' + file);
            hasErrors = true;
        }
    }
});

if (!hasErrors) {
    console.log('All links verified. No broken local links found.');
} else {
    process.exit(1);
}
