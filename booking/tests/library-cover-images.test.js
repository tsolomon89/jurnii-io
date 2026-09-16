'use strict';

/**
 * Library cover artwork must exist on disk. A coverImage path with no file
 * ships as a broken <img> on the resources grid.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');

const ROOT = path.join(__dirname, '..', '..');
const libraryDir = path.join(ROOT, 'content', 'library');

test('every library coverImage points at a file that exists', () => {
  const missing = [];
  for (const name of fs.readdirSync(libraryDir).filter((f) => f.endsWith('.md'))) {
    const parsed = matter(fs.readFileSync(path.join(libraryDir, name), 'utf8'));
    const cover = parsed.data.coverImage;
    if (!cover) continue;
    const abs = path.join(ROOT, String(cover).replace(/^\//, ''));
    if (!fs.existsSync(abs) || fs.statSync(abs).size < 50) {
      missing.push(`${name} → ${cover}`);
    }
  }
  assert.deepStrictEqual(missing, []);
});

test('the library cover fallback image is present at the URL the cards use', () => {
  const fallback = path.join(ROOT, 'assets/library/cover-fallback.jpg');
  assert.ok(fs.existsSync(fallback), 'assets/library/cover-fallback.jpg must exist');
  assert.ok(fs.statSync(fallback).size > 50);
});
