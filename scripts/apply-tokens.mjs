#!/usr/bin/env node
/**
 * Apply Tier 1 / 1.5 / Tier 2a-typography token replacements to in-scope CSS.
 * Spacing Tier 1 also applied (exact --spacing-* matches).
 * Colour Tier 1 uses theme-invariant primitives where possible.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CSS_FILES = [
  "assets/site.css",
  "assets/use-cases.css",
  "assets/pv-panel.css",
  "assets/rec-modal.css",
];

const TEXT_MAP = {
  "9px": "var(--text-3xs)",
  "10px": "var(--text-2xs)",
  "11px": "var(--text-2xs-plus)",
  "12px": "var(--text-xs)",
  "13px": "var(--text-xs-plus)",
  "14px": "var(--text-sm)",
  "15px": "var(--text-sm-plus)",
  "16px": "var(--text-base)",
  "17px": "var(--text-md)",
  "18px": "var(--text-lg)",
  "19px": "var(--text-lg-plus)",
  "20px": "var(--text-xl)",
  "21px": "var(--text-xl-sm)",
  "22px": "var(--text-xl-plus)",
  "23px": "var(--text-xl-lg)",
  "24px": "var(--text-2xl)",
  "26px": "var(--text-2xl-plus)",
  "27px": "var(--text-2xl-lg)",
  "28px": "var(--text-2_5xl)",
  "30px": "var(--text-3xl)",
  "36px": "var(--text-4xl)",
  "42px": "var(--text-4xl-plus)",
  "46px": "var(--text-4_5xl)",
  "48px": "var(--text-5xl)",
  "52px": "var(--text-5xl-plus)",
  "60px": "var(--text-6xl)",
  "72px": "var(--text-7xl)",
  "96px": "var(--text-8xl)",
  "128px": "var(--text-9xl)",
};

// Half-pixel → rounded whole → token
const HALF_MAP = {
  "9.5px": "var(--text-2xs)",
  "10.5px": "var(--text-2xs-plus)",
  "11.5px": "var(--text-xs)",
  "12.5px": "var(--text-xs-plus)",
  "13.5px": "var(--text-sm)",
  "14.5px": "var(--text-sm-plus)",
  "15.5px": "var(--text-base)",
  "16.5px": "var(--text-md)",
};

const FW_MAP = {
  "100": "var(--fw-thin)",
  "200": "var(--fw-extralight)",
  "300": "var(--fw-light)",
  "400": "var(--fw-normal)",
  "500": "var(--fw-medium)",
  "600": "var(--fw-semibold)",
  "800": "var(--fw-extrabold)",
  "900": "var(--fw-black)",
};

const SPACING_MAP = {
  "4px": "var(--spacing-1)",
  "8px": "var(--spacing-2)",
  "12px": "var(--spacing-3)",
  "16px": "var(--spacing-4)",
  "20px": "var(--spacing-5)",
  "24px": "var(--spacing-6)",
  "32px": "var(--spacing-8)",
  "40px": "var(--spacing-10)",
  "48px": "var(--spacing-12)",
  "64px": "var(--spacing-16)",
  "80px": "var(--spacing-20)",
  "96px": "var(--spacing-24)",
};

const RADIUS_MAP = {
  "0px": "var(--radius-none)",
  "2px": "var(--radius-xxs)",
  "4px": "var(--radius-xs)",
  "6px": "var(--radius-sm)",
  "8px": "var(--radius-md)",
  "10px": null, // no exact token — leave (tier2b)
  "12px": "var(--radius-lg)",
  "16px": "var(--radius-xl)",
  "20px": "var(--radius-2xl)",
  "24px": "var(--radius-3xl)",
  "32px": "var(--radius-4xl)",
  "9999px": "var(--radius-full)",
};

// Theme-invariant colour primitives (exact hex → token)
const COLOR_MAP = {
  "#F8F8F7": "var(--concrete-50)",
  "#F2F2F1": "var(--concrete-100)",
  "#E3E3E3": "var(--concrete-200)",
  "#BFBFBA": "var(--concrete-300)",
  "#9C9C94": "var(--concrete-400)",
  "#807F77": "var(--concrete-500)",
  "#686761": "var(--concrete-600)",
  "#55554F": "var(--concrete-700)",
  "#484744": "var(--concrete-800)",
  "#3F3E3B": "var(--concrete-900)",
  "#2A2A27": "var(--concrete-950)",
  "#E6FFE5": "var(--jurnii-50)",
  "#C7FFC6": "var(--jurnii-100)",
  "#94FF96": "var(--jurnii-200)",
  "#57FF60": "var(--jurnii-300)",
  "#34F741": "var(--jurnii-400)",
  "#05DD17": "var(--jurnii-500)",
  "#00B113": "var(--jurnii-600)",
  "#058615": "var(--jurnii-700)",
  "#0B6917": "var(--jurnii-800)",
  "#0E591A": "var(--jurnii-900)",
  "#01320A": "var(--jurnii-950)",
  "#F2F9F9": "var(--blue-dianne-50)",
  "#DFEEED": "var(--blue-dianne-100)",
  "#C2DFDD": "var(--blue-dianne-200)",
  "#98C8C6": "var(--blue-dianne-300)",
  "#66AAA8": "var(--blue-dianne-400)",
  "#4B8F8E": "var(--blue-dianne-500)",
  "#417779": "var(--blue-dianne-600)",
  "#3A6264": "var(--blue-dianne-700)",
  "#355255": "var(--blue-dianne-800)",
  "#31484B": "var(--blue-dianne-900)",
  "#1C2D30": "var(--blue-dianne-950)",
  "#FFFFFF": "var(--white)",
  "#FFF": "var(--white)",
  "#000000": "var(--black)",
  "#000": "var(--black)",
  "#C084FC": "var(--performance)",
  "#4ADE80": "var(--journey)",
  "#FACC15": "var(--average)",
  "#FB923C": "var(--poor)",
  "#FB7185": "var(--perception)",
  "#5299FF": "var(--accent-ux)",
  "#FFA852": "var(--accent-mmm)",
  "#8B5CF6": "var(--excellent)",
  "#22C55E": "var(--good)",
  "#EF4444": "var(--very-poor)",
};

const SPACE_PROPS =
  /^(padding(?:-(?:top|right|bottom|left))?|margin(?:-(?:top|right|bottom|left))?|gap|row-gap|column-gap)$/;

function replaceColors(css) {
  // Replace hex colours (case-insensitive), but skip inside comments carefully
  return css.replace(/#([0-9A-Fa-f]{3,8})\b/g, (match) => {
    const upper = match.length === 4
      ? "#" + match[1].toUpperCase() + match[1].toUpperCase() + match[2].toUpperCase() + match[2].toUpperCase() + match[3].toUpperCase() + match[3].toUpperCase()
      : match.toUpperCase();
    // Also try original upper without expand for 6-digit
    const key6 = match.toUpperCase();
    return COLOR_MAP[upper] || COLOR_MAP[key6] || match;
  });
}

function replaceFontSize(css) {
  // Half-pixels first
  let out = css.replace(/font-size:\s*([0-9.]+)px/g, (full, n) => {
    const key = n + "px";
    if (HALF_MAP[key]) return `font-size: ${HALF_MAP[key]}`;
    if (TEXT_MAP[key]) return `font-size: ${TEXT_MAP[key]}`;
    return full;
  });
  return out;
}

function replaceFontWeight(css) {
  return css.replace(/font-weight:\s*([0-9]+)/g, (full, w) => {
    if (FW_MAP[w]) return `font-weight: ${FW_MAP[w]}`;
    return full;
  });
}

function replaceFontFamily(css) {
  return css.replace(
    /font-family:\s*Georgia,\s*serif/gi,
    "font-family: var(--font-serif)"
  );
}

function replaceSpacing(css) {
  // Only replace px values inside spacing property declarations
  return css.replace(
    /(padding(?:-(?:top|right|bottom|left))?|margin(?:-(?:top|right|bottom|left))?|gap|row-gap|column-gap)\s*:\s*([^;{}]+)/g,
    (full, prop, val) => {
      if (/var\(/.test(val)) return full;
      const newVal = val.replace(/(-?)([0-9.]+)px/g, (m, sign, num) => {
        const key = num + "px";
        // Only exact spacing tokens; leave off-grid and missing tokens
        if (SPACING_MAP[key]) {
          return sign === "-" ? `calc(-1 * ${SPACING_MAP[key]})` : SPACING_MAP[key];
        }
        return m;
      });
      return `${prop}: ${newVal}`;
    }
  );
}

function replaceRadius(css) {
  return css.replace(/border-radius:\s*([^;]+);/g, (full, val) => {
    if (/var\(/.test(val)) return full;
    const trimmed = val.trim();
    // single value
    if (RADIUS_MAP[trimmed]) return `border-radius: ${RADIUS_MAP[trimmed]};`;
    if (/^9999px$|^999px$/.test(trimmed)) return `border-radius: var(--radius-full);`;
    // multi-value: replace known tokens piece by piece
    const parts = trimmed.split(/\s+/).map((p) => RADIUS_MAP[p] || p);
    if (parts.some((p, i) => p !== trimmed.split(/\s+/)[i])) {
      return `border-radius: ${parts.join(" ")};`;
    }
    return full;
  });
}

const stats = {};

for (const rel of CSS_FILES) {
  const file = path.join(ROOT, rel);
  let css = fs.readFileSync(file, "utf8");
  const before = css;
  css = replaceColors(css);
  css = replaceFontSize(css);
  css = replaceFontWeight(css);
  css = replaceFontFamily(css);
  css = replaceSpacing(css);
  css = replaceRadius(css);
  fs.writeFileSync(file, css);
  stats[rel] = {
    changed: before !== css,
    deltaBytes: css.length - before.length,
  };
}

console.log("Applied token replacements:", stats);

// Verify no half-pixel font-sizes remain in scope
for (const rel of CSS_FILES) {
  const css = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const half = [...css.matchAll(/font-size:\s*[0-9]+\.[0-9]+px/g)];
  if (half.length) console.warn("REMAINING half-px in", rel, half.map((m) => m[0]));
  const literalFs = [...css.matchAll(/font-size:\s*[0-9.]+px/g)];
  if (literalFs.length) console.warn("REMAINING literal font-size px in", rel, literalFs.length, literalFs.slice(0, 5).map((m) => m[0]));
}
