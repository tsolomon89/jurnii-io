import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { babelHtmlBridge, fontsMonoAsyncHtml } from './scripts/vite-babel-html-bridge.js';

const root = path.dirname(fileURLToPath(import.meta.url));

/** Prepend React imports so legacy assets/*.jsx (global React) compile under Vite. */
function legacyJsxGlobals() {
  return {
    name: 'legacy-jsx-globals',
    enforce: 'pre',
    transform(code, id) {
      const norm = id.replace(/\\/g, '/').replace(/\?.*$/, '');
      if (!norm.includes('/assets/') || !norm.endsWith('.jsx')) return null;
      if (code.includes("from 'react'") || code.includes('from "react"')) return null;
      return {
        code: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nif (typeof window !== 'undefined') { window.React = React; window.ReactDOM = ReactDOM; }\n${code}`,
        map: null,
      };
    },
  };
}

/** Primary HTML input: index.html governed by content engine router. */
function htmlInputs() {
  return {
    index: path.join(root, 'index.html'),
  };
}

/**
 * Runtime files that must reach `dist` at STABLE, unhashed URLs.
 *
 * The booking widget is a classic `<script src>` that `assets/site.jsx` injects by
 * a hardcoded absolute path, and `manage.html` is a plain page outside the SPA, so
 * neither can tolerate a content hash. Mirroring `booking/` into `dist/booking/`
 * keeps the dev server and the deployed site on identical URLs — in dev Vite
 * serves the same paths straight from the source tree.
 */
const BOOKING_RUNTIME = [
  'booking/assets/booking-form.js',
  'booking/assets/booking-form.css',
  'booking/config/countries.js',
];

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function copyRuntimeAssets() {
  return {
    name: 'copy-runtime-assets',
    closeBundle() {
      const files = [
        'headline-split.js',
        'fonts-mono.css',
        'global.css',
        'site.css',
        'use-cases.css',
        'canvas-comments.css',
        'rec-modal.css',
        'pv-panel.css',
        'jurnii-icon-light.svg',
        'jurnii-icon-dark.svg',
        'jurnii-light-full.svg',
        'jurnii-dark-full.svg',
      ];
      const destDir = path.join(root, 'dist/assets');
      fs.mkdirSync(destDir, { recursive: true });
      for (const f of files) {
        const src = path.join(root, 'assets', f);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(destDir, f));
      }
      // Library cover art and in-article figures. Markdown and front matter reference
      // these by absolute URL (/assets/library/<slug>/…), so they never pass through
      // Rollup and would otherwise be missing from dist entirely.
      copyDir(path.join(root, 'assets/library'), path.join(root, 'dist/assets/library'));

      // KaTeX's stylesheet and fonts, loaded on demand by `Prose` for the maths
      // papers. Its `url(fonts/…)` references are relative, so the directory has to
      // land in dist with its shape intact.
      copyDir(path.join(root, 'assets/vendor'), path.join(root, 'dist/assets/vendor'));

      // Nested <base href> pages keep href="assets/*.css"; also rewrite is unnecessary if copied.
      const fontDir = path.join(root, 'dist/assets/fonts');
      fs.mkdirSync(fontDir, { recursive: true });
      for (const f of fs.readdirSync(path.join(root, 'assets/fonts'))) {
        const src = path.join(root, 'assets/fonts', f);
        const dest = path.join(fontDir, f);
        if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
      }

      // The shared booking widget, its stylesheet and the shared country config.
      // Missing here is not a cosmetic problem — the demo modal would 404 — so a
      // vanished source file fails the build rather than shipping a broken page.
      for (const rel of BOOKING_RUNTIME) {
        const src = path.join(root, rel);
        if (!fs.existsSync(src)) {
          throw new Error(`copy-runtime-assets: required booking file missing: ${rel}`);
        }
        const dest = path.join(root, 'dist', rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }

      // manage.html is a REAL route, not an SPA path. Vercel checks the filesystem
      // before applying rewrites, so a file at dist/manage.html is served directly
      // and the `/(.*)` → /index.html fallback never sees the request. Every emailed
      // manage link (PUBLIC_BASE_URL + /manage.html?token=…&id=…) depends on it.
      const manageSrc = path.join(root, 'manage.html');
      if (!fs.existsSync(manageSrc)) {
        throw new Error('copy-runtime-assets: manage.html is missing — emailed manage links would 404');
      }
      fs.copyFileSync(manageSrc, path.join(root, 'dist/manage.html'));
    },
  };
}

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
  },
  plugins: [legacyJsxGlobals(), babelHtmlBridge(root), fontsMonoAsyncHtml(), react(), copyRuntimeAssets()],
  resolve: {
    alias: {
      '@assets': path.join(root, 'assets'),
    },
  },
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: htmlInputs(),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (info) => {
          if (info.name && /\.(woff2|ttf)$/.test(info.name)) {
            return 'assets/fonts/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    cssCodeSplit: true,
    modulePreload: { polyfill: true },
  },
  server: {
    port: 5173,
    open: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'web-vitals'],
  },
});
