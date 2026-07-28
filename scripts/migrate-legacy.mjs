import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// Custom turndown rules for layout elements if needed
turndownService.addRule('remove-hidden', {
  filter: function (node) {
    return node.style && node.style.display === 'none';
  },
  replacement: function () { return ''; }
});

const legacyDir = path.resolve('C:/Development/Projects/jurnii/.agents/context/legacy');
const newDir = path.resolve('C:/Development/Projects/jurnii/content/www');

const missingFiles = [
  { legacy: 'use-cases/company-sizes.html', new: 'use-cases/company-sizes.md' },
  { legacy: 'use-cases/departments.html', new: 'use-cases/departments.md' },
  { legacy: 'use-cases/index.html', new: 'use-cases/index.md' },
  { legacy: 'use-cases/roles.html', new: 'use-cases/roles.md' },
  { legacy: 'use-cases/sectors.html', new: 'use-cases/sectors.md' },
  { legacy: 'use-cases/company-sizes/enterprise.html', new: 'use-cases/company-sizes/enterprise.md' },
  { legacy: 'use-cases/company-sizes/midmarket.html', new: 'use-cases/company-sizes/midmarket.md' },
  { legacy: 'use-cases/company-sizes/smb.html', new: 'use-cases/company-sizes/smb.md' },
  { legacy: 'use-cases/departments/commercial.html', new: 'use-cases/departments/commercial.md' },
  { legacy: 'use-cases/departments/marketing.html', new: 'use-cases/departments/marketing.md' },
  { legacy: 'use-cases/departments/product.html', new: 'use-cases/departments/product.md' },
  { legacy: 'use-cases/roles/cco.html', new: 'use-cases/roles/cco.md' },
  { legacy: 'use-cases/roles/ceo.html', new: 'use-cases/roles/ceo.md' },
  { legacy: 'use-cases/roles/cfo.html', new: 'use-cases/roles/cfo.md' },
  { legacy: 'use-cases/roles/cmo.html', new: 'use-cases/roles/cmo.md' },
  { legacy: 'use-cases/roles/coo.html', new: 'use-cases/roles/coo.md' },
  { legacy: 'use-cases/roles/cpo.html', new: 'use-cases/roles/cpo.md' },
  { legacy: 'use-cases/roles/head-of-crm.html', new: 'use-cases/roles/head-of-crm.md' },
  { legacy: 'use-cases/roles/head-of-marketing.html', new: 'use-cases/roles/head-of-marketing.md' },
  { legacy: 'use-cases/roles/head-of-product.html', new: 'use-cases/roles/head-of-product.md' },
  { legacy: 'use-cases/sectors/ecommerce.html', new: 'use-cases/sectors/ecommerce.md' },
  { legacy: 'use-cases/sectors/fintech.html', new: 'use-cases/sectors/fintech.md' },
  { legacy: 'use-cases/sectors/igaming.html', new: 'use-cases/sectors/igaming.md' },
  { legacy: 'features/index.html', new: 'features/index.md' },
  { legacy: 'solutions/index.html', new: 'solutions/index.md' },
  { legacy: 'website-main/404.html', new: 'pages/404.md' },
  { legacy: 'website-main/canvas-comments.html', new: 'pages/canvas-comments.md' },
  { legacy: 'website-main/component-library.html', new: 'pages/component-library.md' },
  { legacy: 'website-main/resource.html', new: 'pages/resource.md' },
  { legacy: 'website-main/resources.html', new: 'pages/resources.md' }
];

async function migrate() {
  for (const file of missingFiles) {
    const legacyPath = path.join(legacyDir, file.legacy);
    const newPath = path.join(newDir, file.new);

    if (!fs.existsSync(legacyPath)) {
      console.warn(`Legacy file missing: ${legacyPath}`);
      continue;
    }

    const html = fs.readFileSync(legacyPath, 'utf8');
    const $ = cheerio.load(html);

    // Extract frontmatter details
    let title = $('title').text().replace(/ — Jurnii.*/, '').replace(/Jurnii -.*/, '').trim();
    if (!title) {
      title = $('h1').first().text().trim();
    }
    const description = $('meta[name="description"]').attr('content') || '';

    let contentHtml = '';
    // Look for main content area. Usually <main>
    const $main = $('main');
    if ($main.length > 0) {
      // Remove boilerplate from main
      $main.find('.usecase-related-section').remove();
      $main.find('.reusable-cta-section').remove();
      $main.find('.site-footer').remove(); // just in case
      contentHtml = $main.html();
    } else {
      // Fallback: take body, remove nav and footer
      const $body = $('body');
      $body.find('nav, header, footer, .usecase-related-section, .reusable-cta-section').remove();
      contentHtml = $body.html();
    }

    // Process metric strips specially to make them nice in markdown
    const $content = cheerio.load(contentHtml || '', null, false);
    $content('.metric-strip-item').each((_, el) => {
      const num = $content(el).find('.metric-strip-num').text().trim();
      const lbl = $content(el).find('.metric-strip-label').text().trim();
      $content(el).replaceWith(`<li><strong>${num}</strong> &mdash; ${lbl}</li>`);
    });
    
    // Process Before/After
    $content('.before-card, .after-card').each((_, el) => {
      const isBefore = $content(el).hasClass('before-card');
      const prefix = isBefore ? "❌ " : "✅ ";
      const h3 = $content(el).find('h3').text().trim();
      let newHtml = `<h3>${h3}</h3><ul>`;
      $content(el).find('.step-desc').each((_, step) => {
         newHtml += `<li>${prefix}${$content(step).text().trim()}</li>`;
      });
      newHtml += `</ul>`;
      $content(el).replaceWith(newHtml);
    });

    const cleanHtml = $content.html() || '';
    let markdown = turndownService.turndown(cleanHtml);

    // Clean up excessive newlines
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

    // YAML Frontmatter
    const frontmatter = `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
---

`;

    const finalContent = frontmatter + markdown;

    // Ensure directory exists
    fs.mkdirSync(path.dirname(newPath), { recursive: true });

    // Write file
    fs.writeFileSync(newPath, finalContent, 'utf8');
    console.log(`Migrated ${file.legacy} -> ${file.new}`);
  }
}

migrate().catch(console.error);
