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

function copyRuntimeAssets() {
  return {
    name: 'copy-runtime-assets',
    closeBundle() {
      const files = [
        'headline-split.js',
        'booking-form.js',
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
      // Nested <base href> pages keep href="assets/*.css"; also rewrite is unnecessary if copied.
      const fontDir = path.join(root, 'dist/assets/fonts');
      fs.mkdirSync(fontDir, { recursive: true });
      for (const f of fs.readdirSync(path.join(root, 'assets/fonts'))) {
        const src = path.join(root, 'assets/fonts', f);
        const dest = path.join(fontDir, f);
        if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
      }
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
