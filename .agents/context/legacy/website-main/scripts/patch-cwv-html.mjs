#!/usr/bin/env node
/**
 * Phase 1 CWV HTML patcher — updates all live React pages (excludes uploads/).
 * - Production React/ReactDOM builds
 * - Pin Lucide to 1.25.0
 * - Preconnect + Geist Sans font preload
 * - Link global.css separately (no @import)
 * - Async-load fonts-mono.css (Geist Mono off critical CSS chain)
 * - Move CDN scripts from <head> to end of <body>
 * - Defer headline-split.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REACT_PROD =
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js';
const REACT_PROD_SRI =
  'sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z';
const REACTDOM_PROD =
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js';
const REACTDOM_PROD_SRI =
  'sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1';
const BABEL =
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js';
const BABEL_SRI =
  'sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y';
const LUCIDE =
  'https://unpkg.com/lucide@1.25.0/dist/umd/lucide.min.js';
const GSAP =
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'uploads' || ent.name === 'node_modules' || ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function assetPrefix(filePath, html) {
  // Nested pages use <base href="../"> or <base href="../../"> so asset hrefs stay as assets/
  if (html && /<base\s+href="(?:\.\.\/)+">/.test(html)) return 'assets/';
  const rel = path.relative(ROOT, filePath);
  const depth = rel.split(path.sep).length - 1;
  return depth === 0 ? 'assets/' : '../'.repeat(depth) + 'assets/';
}

function hasReact(html) {
  return /react\.(development|production)\.min?\.js/.test(html) ||
    /@babel\/standalone/.test(html);
}

function stripHeadScripts(html) {
  // Remove CDN / known head scripts we will re-inject at body end
  return html.replace(
    /\n?<script[^>]*src="https:\/\/(?:unpkg\.com|cdnjs\.cloudflare\.com)[^"]*"[^>]*><\/script>/g,
    ''
  );
}

function ensureHeadLinks(html, assets) {
  // Ensure global.css link exists before site.css or alongside
  if (!html.includes(`${assets}global.css`) && !html.includes('href="assets/global.css"')) {
    const injected = html.replace(
      new RegExp(`(<link rel="stylesheet" href="${assets.replace(/\./g, '\\.')}site\\.css">)`),
      `<link rel="stylesheet" href="${assets}global.css">\n$1`
    );
    // Nested pages with <base> already use assets/site.css; also try bare assets/ path
    if (injected === html) {
      html = html.replace(
        /(<link rel="stylesheet" href="assets\/site\.css">)/,
        `<link rel="stylesheet" href="assets/global.css">\n$1`
      );
    } else {
      html = injected;
    }
  }

  // Async Geist Mono — off the render-blocking CSS critical chain (font-display: optional)
  // Normalize any prior wrong ../../assets/fonts-mono.css paths first
  html = html.replace(
    /href="(?:\.\.\/)+assets\/fonts-mono\.css"/g,
    'href="assets/fonts-mono.css"'
  );
  const monoHref = `${assets}fonts-mono.css`;
  if (!html.includes('fonts-mono.css')) {
    const monoLinks =
      `<link rel="stylesheet" href="${monoHref}" media="print" onload="this.media='all'">\n` +
      `<noscript><link rel="stylesheet" href="${monoHref}"></noscript>`;
    if (html.includes(`${assets}global.css`) || html.includes('href="assets/global.css"')) {
      html = html.replace(
        /(<link rel="stylesheet" href="[^"]*global\.css">)/,
        `$1\n${monoLinks}`
      );
    } else {
      html = html.replace(
        /(<link rel="stylesheet" href="[^"]*site\.css">)/,
        `${monoLinks}\n$1`
      );
    }
  }

  // Preconnect + font preload (once). Prefer assets/-relative paths when <base> is set.
  if (!html.includes('rel="preconnect" href="https://unpkg.com"')) {
    const hints = [
      `<link rel="preconnect" href="https://unpkg.com" crossorigin>`,
      `<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>`,
      `<link rel="preload" href="${assets}fonts/Geist-VariableFont_wght.woff2" as="font" type="font/woff2" crossorigin>`,
    ].join('\n');
    html = html.replace(/<link rel="icon"[^>]*>/, (m) => `${m}\n${hints}`);
  }

  // Fix broken Geist Sans preloads that ignore <base href> (../../assets/... → assets/...)
  if (/<base\s+href="(?:\.\.\/)+">/.test(html)) {
    html = html.replace(
      /href="(?:\.\.\/)+assets\/fonts\/Geist-VariableFont_wght\.woff2"/g,
      'href="assets/fonts/Geist-VariableFont_wght.woff2"'
    );
  }

  return html;
}

function buildCdnScripts(html) {
  const scripts = [];
  scripts.push(`<script src="${LUCIDE}" defer></script>`);
  if (html.includes('gsap') || html.includes('HomeHero') || /index\.html$/.test('')) {
    // GSAP only if originally present
  }
  return scripts;
}

function patchFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (!hasReact(html)) return { filePath, skipped: true, reason: 'no-react' };

  const assets = assetPrefix(filePath, html);
  const hadGsap = /gsap\/[\d.]+\/gsap\.min\.js/.test(html);
  const hadHeadline = /headline-split\.js/.test(html);

  // Strip old CDN scripts from head
  html = stripHeadScripts(html);

  // Remove existing headline-split (we'll re-add deferred at end)
  html = html.replace(/\n?<script src="[^"]*headline-split\.js"><\/script>/g, '');

  html = ensureHeadLinks(html, assets);

  // CDN scripts at end of body (sync order required for Babel Standalone + text/babel).
  // Moved out of <head> so CSS can paint first.
  const cdnBlock = [
    `<script src="${LUCIDE}"></script>`,
    hadGsap ? `<script src="${GSAP}"></script>` : null,
    `<script src="${REACT_PROD}" integrity="${REACT_PROD_SRI}" crossorigin="anonymous"></script>`,
    `<script src="${REACTDOM_PROD}" integrity="${REACTDOM_PROD_SRI}" crossorigin="anonymous"></script>`,
    `<script src="${BABEL}" integrity="${BABEL_SRI}" crossorigin="anonymous"></script>`,
  ].filter(Boolean).join('\n');

  // Insert CDN scripts after <div id="root"></div> (before babel modules)
  if (html.includes('<div id="root"></div>')) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"></div>\n${cdnBlock}`
    );
  } else {
    // Fallback: before first text/babel script
    html = html.replace(
      /(<script type="text\/babel")/,
      `${cdnBlock}\n$1`
    );
  }

  // Defer headline-split via requestIdleCallback wrapper
  if (hadHeadline) {
    const headlineLoader = `<script>
(function(){
  function load(){
    var s=document.createElement('script');
    s.src='${assets}headline-split.js';
    document.body.appendChild(s);
  }
  if('requestIdleCallback' in window) requestIdleCallback(load,{timeout:2000});
  else setTimeout(load,1);
})();
</script>`;
    html = html.replace('</body>', `${headlineLoader}\n</body>`);
  }

  // Clean up extra blank lines in head
  html = html.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(filePath, html);
  return { filePath, skipped: false };
}

const files = walk(ROOT);
const results = files.map(patchFile);
const patched = results.filter((r) => !r.skipped);
const skipped = results.filter((r) => r.skipped);

console.log(`Patched ${patched.length} React pages`);
console.log(`Skipped ${skipped.length} non-React pages`);
for (const r of patched.slice(0, 5)) {
  console.log('  ✓', path.relative(ROOT, r.filePath));
}
if (patched.length > 5) console.log(`  … and ${patched.length - 5} more`);
