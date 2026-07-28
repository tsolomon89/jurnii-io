#!/usr/bin/env node
/**
 * Lighthouse CI for key pages. Fails if CLS > 0.1 or LCP regresses badly vs baseline.
 *
 * Usage:
 *   node scripts/lighthouse-ci.mjs              # against http://localhost:4173 (vite preview)
 *   node scripts/lighthouse-ci.mjs --url http://127.0.0.1:8877
 *   node scripts/lighthouse-ci.mjs --baseline    # write baselines only
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'scripts/perf-baselines');
const pages = [
  'jurnii-360.html',
  'jurnii-ux.html',
  'index.html',
];

const args = process.argv.slice(2);
const urlIdx = args.indexOf('--url');
const baseUrl = urlIdx >= 0 ? args[urlIdx + 1] : 'http://127.0.0.1:4173';
const writeBaseline = args.includes('--baseline');

fs.mkdirSync(outDir, { recursive: true });

const chrome =
  process.env.CHROME_PATH ||
  (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : undefined);

function runLh(page) {
  const name = page.replace(/\.html$/, '').replace(/\//g, '-');
  const out = path.join(outDir, `ci-${name}-mobile.json`);
  const url = `${baseUrl.replace(/\/$/, '')}/${page}`;
  const lhArgs = [
    '--yes',
    'lighthouse@12',
    url,
    '--only-categories=performance',
    '--form-factor=mobile',
    '--screenEmulation.mobile=true',
    '--output=json',
    `--output-path=${out}`,
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
    '--quiet',
  ];
  if (chrome) lhArgs.splice(lhArgs.length - 1, 0, `--chrome-path=${chrome}`);
  const r = spawnSync('npx', lhArgs, { cwd: root, encoding: 'utf8', env: process.env });

  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error(`Lighthouse failed for ${url}`);
  }
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}

function metrics(report) {
  const a = report.audits || {};
  return {
    score: report.categories?.performance?.score != null
      ? Math.round(report.categories.performance.score * 100)
      : null,
    lcp: a['largest-contentful-paint']?.numericValue ?? null,
    tbt: a['total-blocking-time']?.numericValue ?? null,
    cls: a['cumulative-layout-shift']?.numericValue ?? null,
    display: {
      lcp: a['largest-contentful-paint']?.displayValue,
      tbt: a['total-blocking-time']?.displayValue,
      cls: a['cumulative-layout-shift']?.displayValue,
    },
  };
}

let failed = false;
for (const page of pages) {
  console.log('Auditing', page);
  const report = runLh(page);
  const m = metrics(report);
  console.log(
    `  score=${m.score} LCP=${m.display.lcp} TBT=${m.display.tbt} CLS=${m.display.cls}`
  );

  if (writeBaseline) continue;

  // Gate: CLS must stay under 0.1
  if (m.cls != null && m.cls > 0.1) {
    console.error(`FAIL ${page}: CLS ${m.cls} > 0.1`);
    failed = true;
  }

  // Soft gate vs Phase 0 local baselines (if present)
  const baseFile = path.join(
    outDir,
    `${page.replace(/\.html$/, '').replace(/\//g, '-')}-mobile.json`
  );
  if (fs.existsSync(baseFile)) {
    try {
      const base = metrics(JSON.parse(fs.readFileSync(baseFile, 'utf8')));
      if (base.lcp && m.lcp && m.lcp > base.lcp * 1.25) {
        console.error(
          `FAIL ${page}: LCP ${m.display.lcp} regressed >25% vs baseline ${base.display.lcp}`
        );
        failed = true;
      }
    } catch {}
  }
}

if (failed) process.exit(1);
console.log(writeBaseline ? 'Baselines written.' : 'Lighthouse CI passed.');
