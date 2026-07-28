/**
 * Vite plugin: convert legacy Babel-Standalone HTML pages into ES module entries.
 */
import path from 'node:path';
import fs from 'node:fs';

const CDN_SCRIPT_RE =
  /<script[^>]*src="https:\/\/unpkg\.com\/(?:react|react-dom|@babel)[^"]*"[^>]*><\/script>\s*/g;
const BABEL_SRC_RE =
  /<script\s+type="text\/babel"\s+src="([^"]+)"><\/script>/g;
const BABEL_INLINE_RE =
  /<script\s+type="text\/babel">([\s\S]*?)<\/script>/g;
const HEADLINE_IDLE_RE =
  /<script>\s*\(function\(\)\{\s*function load\(\)\{[\s\S]*?headline-split\.js[\s\S]*?\}\)\(\);\s*<\/script>/g;
const FONTS_MONO_LINK_RE =
  /\n?<link rel="stylesheet" href="[^"]*fonts-mono\.css"[^>]*>\s*(?:\n?<noscript><link rel="stylesheet" href="[^"]*fonts-mono\.css"><\/noscript>)?/g;
const FONTS_MONO_DATA_RE =
  /\n?<link rel="stylesheet" href="data:text\/css;base64,[^"]*"[^>]*>/g;
const FONTS_MONO_HASHED_RE =
  /\n?<link rel="stylesheet"[^>]*href="[^"]*fonts-mono-[^"]+\.css"[^>]*>/g;

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function virtualIdFor(relHtml) {
  // .jsx suffix so @vitejs/plugin-react transforms inline JSX
  return `\0virtual:jurnii-page/${toPosix(relHtml)}.jsx`;
}

function publicVirtualUrl(relHtml) {
  return `/@id/__x00__virtual:jurnii-page/${toPosix(relHtml)}.jsx`;
}

export function babelHtmlBridge(root) {
  /** @type {Map<string, { imports: string[], inline: string }>} */
  const pages = new Map();
  const genDir = path.join(root, 'src/generated');

  function resolveAsset(src, htmlPath, html) {
    const hasBase = /<base\s+href="(?:\.\.\/)+">/.test(html);
    if (hasBase) {
      // assets/foo.jsx → root/assets/foo.jsx
      const cleaned = src.replace(/^\.\.\//, '');
      const candidate = path.join(root, cleaned);
      if (fs.existsSync(candidate)) return candidate;
    }
    const fromHtml = path.resolve(path.dirname(htmlPath), src);
    if (fs.existsSync(fromHtml)) return fromHtml;
    return path.join(root, src.replace(/^\.\.\//, ''));
  }

  function parseHtml(html, htmlPath) {
    const imports = [];
    let m;
    const srcRe = new RegExp(BABEL_SRC_RE.source, 'g');
    while ((m = srcRe.exec(html))) {
      imports.push(resolveAsset(m[1], htmlPath, html));
    }
    let inline = '';
    const inlineRe = new RegExp(BABEL_INLINE_RE.source, 'g');
    while ((m = inlineRe.exec(html))) {
      inline += `\n${m[1]}\n`;
    }
    return { imports, inline };
  }

  function ensureGeneratedEntry(relHtml, meta) {
    fs.mkdirSync(genDir, { recursive: true });
    const fileSafe = toPosix(relHtml).replace(/[\\/]/g, '__') + '.jsx';
    const filePath = path.join(genDir, fileSafe);
    const importLines = meta.imports
      .map((abs) => `import ${JSON.stringify(toPosix(abs))};`)
      .join('\n');
    const code = `import React from 'react';
import ReactDOM from 'react-dom/client';
window.React = React;
window.ReactDOM = ReactDOM;

${importLines}

${meta.inline}
`;
    fs.writeFileSync(filePath, code);
    return `/src/generated/${fileSafe}`;
  }

  return {
    name: 'babel-html-bridge',
    enforce: 'pre',

    buildStart() {
      fs.mkdirSync(genDir, { recursive: true });
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        // Keep fonts-mono.css out of Vite's CSS pipeline (avoids data-URI inline + critical-path merge)
        html = html.replace(FONTS_MONO_LINK_RE, '');

        if (!html.includes('text/babel')) return html;

        const absHtml = ctx.filename
          ? path.isAbsolute(ctx.filename)
            ? ctx.filename
            : path.join(root, ctx.filename.replace(/^\//, ''))
          : path.join(root, String(ctx.path || '').replace(/^\//, ''));

        const relHtml = toPosix(path.relative(root, absHtml));
        const meta = parseHtml(html, absHtml);
        pages.set(virtualIdFor(relHtml), meta);

        const entryUrl = ensureGeneratedEntry(relHtml, meta);

        let next = html
          .replace(CDN_SCRIPT_RE, '')
          .replace(BABEL_SRC_RE, '')
          .replace(BABEL_INLINE_RE, '')
          .replace(HEADLINE_IDLE_RE, '');

        const inject = [
          `<script type="module" src="${entryUrl}"></script>`,
          `<script type="module">
import { reportWebVitals } from '/src/web-vitals-init.js';
reportWebVitals();
</script>`,
          `<script>
(function(){
  function load(){
    var s=document.createElement('script');
    s.src='assets/headline-split.js';
    document.body.appendChild(s);
  }
  if('requestIdleCallback' in window) requestIdleCallback(load,{timeout:2000});
  else setTimeout(load,1);
})();
</script>`,
        ].join('\n');

        return next.replace('</body>', `${inject}\n</body>`);
      },
    },
  };
}

/** Re-inject async Geist Mono after Vite CSS transform (kept off the critical path). */
export function fontsMonoAsyncHtml() {
  return {
    name: 'fonts-mono-async-html',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        html = html
          .replace(FONTS_MONO_DATA_RE, '')
          .replace(FONTS_MONO_HASHED_RE, '')
          .replace(FONTS_MONO_LINK_RE, '')
          .replace(/\n?<noscript><\/noscript>/g, '');

        if (!html.includes('fonts-mono.css')) {
          const mono =
            `<link rel="stylesheet" href="/assets/fonts-mono.css" media="print" onload="this.media='all'">\n` +
            `<noscript><link rel="stylesheet" href="/assets/fonts-mono.css"></noscript>`;
          if (/href="[^"]*global[^"]*\.css"/.test(html)) {
            html = html.replace(
              /(<link[^>]*href="[^"]*global[^"]*\.css"[^>]*>)/,
              `$1\n${mono}`
            );
          } else if (/rel="stylesheet"/.test(html)) {
            html = html.replace(/(<link[^>]*rel="stylesheet"[^>]*>)/, `$1\n${mono}`);
          } else {
            html = html.replace('</head>', `${mono}\n</head>`);
          }
        }
        return html;
      },
    },
  };
}
