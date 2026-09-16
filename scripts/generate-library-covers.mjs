/**
 * Write branded 1200×1200 library cover cards for any article whose
 * front-matter `coverImage` file is missing.
 *
 * The Webflow covers share one layout (wordmark, title, mint globe). New
 * articles pointed at that file and never got it, so the resources grid
 * rendered a broken-image icon. These SVGs sit in the same family without
 * depending on a headless browser.
 *
 *   node scripts/generate-library-covers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const libraryDir = path.join(root, 'content/library');
const logoSvg = fs.readFileSync(path.join(root, 'assets/jurnii-light-full.svg'), 'utf8');

function titleFontSize(title) {
  const n = title.length;
  if (n < 48) return 56;
  if (n < 72) return 50;
  if (n < 100) return 44;
  if (n < 130) return 38;
  return 34;
}

function measure(text, fontSize) {
  let w = 0;
  for (const ch of text) {
    if (ch === ' ') w += fontSize * 0.28;
    else if (ch === '-' || ch === '–' || ch === '—' || ch === ':' || ch === ',') w += fontSize * 0.32;
    else if (/[iljI.'’]/.test(ch)) w += fontSize * 0.3;
    else if (/[mwMW]/.test(ch)) w += fontSize * 0.86;
    else if (/[A-Z]/.test(ch)) w += fontSize * 0.66;
    else w += fontSize * 0.55;
  }
  return w;
}

function wrapTitle(title, fontSize, maxWidth = 700) {
  const words = title.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next, fontSize) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function globeSvg() {
  const cx = 1180;
  const cy = 600;
  const r = 520;
  const meridians = [];
  for (let k = -4; k <= 4; k++) {
    const tilt = k * 0.22;
    meridians.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${(r * Math.cos(tilt)).toFixed(1)}" ry="${r}" fill="none" stroke="#b6e6b3" stroke-width="1.6" opacity="${0.55 + 0.08 * (1 - Math.abs(k) / 4)}"/>`,
    );
  }
  const parallels = [];
  for (let i = -3; i <= 3; i++) {
    const y = cy + r * Math.sin(i * 0.28);
    const rr = r * Math.cos(i * 0.28);
    parallels.push(
      `<ellipse cx="${cx}" cy="${y.toFixed(1)}" rx="${rr.toFixed(1)}" ry="${(28 + Math.abs(i) * 4).toFixed(1)}" fill="none" stroke="#b6e6b3" stroke-width="1.4" opacity="0.7"/>`,
    );
  }
  const nodes = [
    [720, 430],
    [790, 510],
    [640, 560],
    [860, 620],
    [700, 690],
    [820, 740],
    [600, 640],
  ];
  const dots = nodes
    .map(([x, y], i) => {
      const fill = i % 3 === 0 ? '#57FF60' : '#9aa39a';
      return `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 5 : 4}" fill="${fill}"/>`;
    })
    .join('');
  const links = [
    [720, 430, 790, 510],
    [790, 510, 860, 620],
    [640, 560, 720, 430],
    [640, 560, 700, 690],
    [700, 690, 820, 740],
    [600, 640, 640, 560],
    [860, 620, 820, 740],
  ]
    .map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c5e8c3" stroke-width="1.5"/>`)
    .join('');
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#e7f6e6" opacity="0.55"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#c4ebc1" stroke-width="2"/>
    ${meridians.join('\n')}
    ${parallels.join('\n')}
    ${links}
    ${dots}
  `;
}

function coverSvg(title) {
  const fontSize = titleFontSize(title);
  const lines = wrapTitle(title, fontSize);
  const lineHeight = fontSize * 1.16;
  const blockH = 48 + 40 + lines.length * lineHeight;
  const blockY = 600 - blockH / 2 - 20;
  const logoInner = logoSvg
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<svg[^>]*>/, '')
    .replace('</svg>', '')
    .trim();
  const text = lines
    .map((line, i) => {
      const y = blockY + 48 + 40 + fontSize + i * lineHeight;
      return `<text x="92" y="${y.toFixed(1)}" fill="#6d6d6a">${escapeXml(line)}</text>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <style>
      text {
        font-family: Geist, ui-sans-serif, system-ui, -apple-system, sans-serif;
        font-weight: 500;
        font-size: ${fontSize}px;
        letter-spacing: -0.025em;
      }
    </style>
  </defs>
  <rect width="1200" height="1200" fill="#f4f4f1"/>
  ${globeSvg()}
  <g transform="translate(92 ${blockY.toFixed(1)}) scale(${(48 / 88).toFixed(4)})">${logoInner}</g>
  ${text}
</svg>
`;
}

function rewriteCoverPath(src, from, to) {
  if (!src.includes(from)) return { text: src, changed: false };
  return { text: src.replaceAll(from, to), changed: true };
}

const jobs = [];
for (const name of fs.readdirSync(libraryDir).filter((f) => f.endsWith('.md'))) {
  const file = path.join(libraryDir, name);
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const cover = parsed.data.coverImage;
  if (!cover || typeof cover !== 'string') continue;
  const abs = path.join(root, cover.replace(/^\//, ''));
  if (fs.existsSync(abs) && fs.statSync(abs).size > 100) continue;
  const title = String(parsed.data.title || '').replace(/\s+/g, ' ').trim();
  const svgDest = abs.replace(/\.png$/i, '.svg');
  fs.mkdirSync(path.dirname(svgDest), { recursive: true });
  fs.writeFileSync(svgDest, coverSvg(title));
  const nextPath = cover.replace(/\.png$/i, '.svg');
  const rewritten = rewriteCoverPath(raw, cover, nextPath);
  if (rewritten.changed) fs.writeFileSync(file, rewritten.text);
  jobs.push({ slug: name.replace(/\.md$/, ''), dest: svgDest, title });
  console.log(`wrote ${path.relative(root, svgDest)}`);
}

if (!jobs.length) {
  console.log('All library covers are present.');
} else {
  console.log(`Generated ${jobs.length} cover cards.`);
}
