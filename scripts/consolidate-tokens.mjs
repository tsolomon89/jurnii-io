#!/usr/bin/env node
/**
 * Consolidate design tokens per product direction:
 * - Type scale: only 10/12/14/16/18/20/24/28/32/36/40/44/48/52/56/64
 * - Spacing: only existing --spacing-* (remap off-scale to nearest)
 * - font-weight 450 → --fw-medium
 * - Add alpha / nav-bg tokens; replace common rgba hardcodes
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CSS_FILES = [
  "assets/global.css",
  "assets/site.css",
  "assets/use-cases.css",
  "assets/pv-panel.css",
  "assets/rec-modal.css",
];

/** Canonical type scale (px → token) */
const TYPE_PX = {
  10: "--text-2xs",
  12: "--text-xs",
  14: "--text-sm",
  16: "--text-base",
  18: "--text-lg",
  20: "--text-xl",
  24: "--text-2xl",
  28: "--text-3xl",
  32: "--text-4xl",
  36: "--text-5xl",
  40: "--text-6xl",
  44: "--text-7xl",
  48: "--text-8xl",
  52: "--text-9xl",
  56: "--text-10xl",
  64: "--text-11xl",
};
const TYPE_SIZES = Object.keys(TYPE_PX).map(Number).sort((a, b) => a - b);

function nearestTypePx(px) {
  let best = TYPE_SIZES[0];
  let bestDist = Math.abs(px - best);
  for (const s of TYPE_SIZES) {
    const d = Math.abs(px - s);
    // Prefer larger on exact tie (legibility)
    if (d < bestDist || (d === bestDist && s > best)) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

/** Old token name → new token name (after consolidation) */
const OLD_TEXT_TOKEN_MAP = {
  "--text-3xs": "--text-2xs", // 9 → 10
  "--text-2xs": "--text-2xs", // 10
  "--text-2xs-plus": "--text-xs", // 11 → 12
  "--text-xs": "--text-xs", // 12
  "--text-xs-plus": "--text-xs", // 13 → 12
  "--text-sm": "--text-sm", // 14
  "--text-sm-plus": "--text-base", // 15 → 16
  "--text-base": "--text-base", // 16
  "--text-md": "--text-base", // 17 → 16
  "--text-lg": "--text-lg", // 18
  "--text-lg-plus": "--text-xl", // 19 → 20
  "--text-xl": "--text-xl", // 20
  "--text-xl-sm": "--text-xl", // 21 → 20
  "--text-xl-plus": "--text-2xl", // 22 → 24
  "--text-xl-lg": "--text-2xl", // 23 → 24
  "--text-2xl": "--text-2xl", // 24
  "--text-2xl-plus": "--text-3xl", // 26 → 28
  "--text-2xl-lg": "--text-3xl", // 27 → 28
  "--text-2_5xl": "--text-3xl", // 28
  "--text-3xl": "--text-3xl", // was 30 → now 28
  "--text-4xl": "--text-5xl", // was 36 → token --text-5xl is now 36
  "--text-4xl-plus": "--text-7xl", // 42 → 44
  "--text-4_5xl": "--text-8xl", // 46 → 48
  "--text-5xl": "--text-8xl", // was 48 → --text-8xl
  "--text-5xl-plus": "--text-9xl", // 52
  "--text-6xl": "--text-11xl", // was 60 → 64
  "--text-7xl": "--text-11xl", // was 72 → 64
  "--text-8xl": "--text-11xl", // was 96 → 64
  "--text-9xl": "--text-11xl", // was 128 → 64
};

/** Existing spacing tokens only */
const SPACING = {
  4: "--spacing-1",
  8: "--spacing-2",
  12: "--spacing-3",
  16: "--spacing-4",
  20: "--spacing-5",
  24: "--spacing-6",
  32: "--spacing-8",
  40: "--spacing-10",
  48: "--spacing-12",
  64: "--spacing-16",
  80: "--spacing-20",
  96: "--spacing-24",
};
const SPACING_SIZES = Object.keys(SPACING).map(Number).sort((a, b) => a - b);

function nearestSpacing(px) {
  const abs = Math.abs(px);
  if (abs === 0) return null;
  // Hairlines / optical 1–2px used as borders stay literal when not spacing props —
  // for spacing props, snap to --spacing-1 (4px)
  let best = SPACING_SIZES[0];
  let bestDist = Math.abs(abs - best);
  for (const s of SPACING_SIZES) {
    const d = Math.abs(abs - s);
    // Prefer smaller on tie (avoid expanding layouts)
    if (d < bestDist || (d === bestDist && s < best)) {
      best = s;
      bestDist = d;
    }
  }
  return { px: best, token: SPACING[best], negative: px < 0 };
}

const NEW_TYPE_BLOCK = `  /* Type scale (rem — 1rem = 16px). Canonical set only. */
  --text-2xs:  0.625rem;  /* 10px — min caption */
  --text-xs:   0.75rem;   /* 12px */
  --text-sm:   0.875rem;  /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg:   1.125rem;  /* 18px */
  --text-xl:   1.25rem;   /* 20px */
  --text-2xl:  1.5rem;    /* 24px */  --lh-2xl: 2rem;      /* 32px */
  --text-3xl:  1.75rem;   /* 28px */  --lh-3xl: 2.25rem;  /* 36px */
  --text-4xl:  2rem;      /* 32px */  --lh-4xl: 2.5rem;   /* 40px */
  --text-5xl:  2.25rem;   /* 36px */  --lh-5xl: 2.5rem;   /* 40px */
  --text-6xl:  2.5rem;    /* 40px */
  --text-7xl:  2.75rem;   /* 44px */
  --text-8xl:  3rem;      /* 48px */
  --text-9xl:  3.25rem;   /* 52px */
  --text-10xl: 3.5rem;    /* 56px */
  --text-11xl: 4rem;      /* 64px */`;

const ALPHA_LIGHT = `
  /* Alpha overlays — theme-aware (design system alpha/5…90) */
  --alpha-5:  #FFFFFFF2;
  --alpha-10: #FFFFFFE5;
  --alpha-20: #FFFFFFCC;
  --alpha-30: #FFFFFFB2;
  --alpha-40: #FFFFFF99;
  --alpha-50: #FFFFFF80;
  --alpha-60: #FFFFFF66;
  --alpha-70: #FFFFFF4D;
  --alpha-80: #FFFFFF33;
  --alpha-90: #FFFFFF1A;

  /* White overlays (fixed — for dark surfaces regardless of theme) */
  --white-a-3:  rgba(255, 255, 255, 0.03);
  --white-a-4:  rgba(255, 255, 255, 0.04);
  --white-a-6:  rgba(255, 255, 255, 0.06);
  --white-a-8:  rgba(255, 255, 255, 0.08);
  --white-a-10: rgba(255, 255, 255, 0.10);
  --white-a-12: rgba(255, 255, 255, 0.12);
  --white-a-15: rgba(255, 255, 255, 0.15);
  --white-a-18: rgba(255, 255, 255, 0.18);
  --white-a-20: rgba(255, 255, 255, 0.20);
  --white-a-22: rgba(255, 255, 255, 0.22);
  --white-a-60: rgba(255, 255, 255, 0.60);
  --white-a-64: rgba(255, 255, 255, 0.64);
  --white-a-66: rgba(255, 255, 255, 0.66);
  --white-a-70: rgba(255, 255, 255, 0.70);
  --white-a-80: rgba(255, 255, 255, 0.80);

  /* Black overlays (shadows / scrims) */
  --black-a-4:  rgba(0, 0, 0, 0.04);
  --black-a-12: rgba(0, 0, 0, 0.12);
  --black-a-16: rgba(0, 0, 0, 0.16);
  --black-a-20: rgba(0, 0, 0, 0.20);
  --black-a-22: rgba(0, 0, 0, 0.22);
  --black-a-25: rgba(0, 0, 0, 0.25);
  --black-a-28: rgba(0, 0, 0, 0.28);
  --black-a-30: rgba(0, 0, 0, 0.30);
  --black-a-45: rgba(0, 0, 0, 0.45);
  --black-a-50: rgba(0, 0, 0, 0.50);

  /* Nav glass — theme surface @ ~84–88% */
  --nav-bg: color-mix(in srgb, var(--concrete-50) 84%, transparent);
`;

const ALPHA_DARK = `
  --alpha-5:  #0A0A0AF2;
  --alpha-10: #0A0A0AE5;
  --alpha-20: #0A0A0ACC;
  --alpha-30: #0A0A0AB2;
  --alpha-40: #0A0A0A99;
  --alpha-50: #0A0A0A80;
  --alpha-60: #0A0A0A66;
  --alpha-70: #0A0A0A4D;
  --alpha-80: #0A0A0A33;
  --alpha-90: #0A0A0A1A;
  --nav-bg: color-mix(in srgb, var(--concrete-950) 84%, transparent);
`;

const ALPHA_V1 = `
  --alpha-5:  #1C2D30F2;
  --alpha-10: #1C2D30E5;
  --alpha-20: #1C2D30CC;
  --alpha-30: #1C2D30B2;
  --alpha-40: #1C2D3099;
  --alpha-50: #1C2D3080;
  --alpha-60: #1C2D3066;
  --alpha-70: #1C2D304D;
  --alpha-80: #1C2D3033;
  --alpha-90: #1C2D301A;
  --nav-bg: color-mix(in srgb, var(--blue-dianne-900) 88%, transparent);
`;

function updateGlobalCss(css) {
  // Replace type scale block
  css = css.replace(
    /  \/\* Type scale[\s\S]*?--text-9xl:[^\n]+\n/,
    NEW_TYPE_BLOCK + "\n"
  );

  // Inject alpha tokens into light theme block (before Typography comment or after charts)
  if (!css.includes("--nav-bg:")) {
    css = css.replace(
      /  \/\* Typography \*\//,
      ALPHA_LIGHT.trimEnd() + "\n\n  /* Typography */"
    );
  }

  // Dark theme — after [data-theme="dark"] { add alpha overrides near end before closing
  if (!css.includes('[data-theme="dark"]') || !css.match(/\[data-theme="dark"\][\s\S]*--nav-bg:/)) {
    css = css.replace(
      /(\[data-theme="dark"\]\s*\{[\s\S]*?)(\n\})/,
      (m, body, close) => {
        if (body.includes("--nav-bg:")) return m;
        return body + "\n" + ALPHA_DARK.trimEnd() + close;
      }
    );
  }

  // jurnii-v1
  if (!css.match(/\[data-theme="jurnii-v1"\][\s\S]*--nav-bg:/)) {
    css = css.replace(
      /(\[data-theme="jurnii-v1"\]\s*\{[\s\S]*?)(\n\})/,
      (m, body, close) => {
        if (body.includes("--nav-bg:")) return m;
        return body + "\n" + ALPHA_V1.trimEnd() + close;
      }
    );
  }

  // Heading classes — map to new scale
  // heading-xl was text-5xl (48) → text-8xl (48)
  // heading-lg was text-4xl (36) → text-5xl (36)
  // heading-md was text-3xl (30→28) → text-3xl (28)
  // heading-sm was text-2xl (24) → text-2xl
  css = css.replace(
    /\.heading-xl, h1\.display \{[\s\S]*?\n\}/,
    `.heading-xl, h1.display {
  font-family: var(--font-sans);
  font-size: var(--text-8xl);
  line-height: 1;
  font-weight: var(--fw-bold);
  letter-spacing: -0.02em;
}`
  );
  css = css.replace(
    /\.heading-lg, h1 \{[\s\S]*?\n\}/,
    `.heading-lg, h1 {
  font-family: var(--font-sans);
  font-size: var(--text-5xl);
  line-height: var(--lh-5xl);
  font-weight: var(--fw-bold);
  letter-spacing: -0.02em;
}`
  );
  css = css.replace(
    /\.heading-md, h2 \{[\s\S]*?\n\}/,
    `.heading-md, h2 {
  font-family: var(--font-sans);
  font-size: var(--text-3xl);
  line-height: var(--lh-3xl);
  font-weight: var(--fw-bold);
  letter-spacing: -0.015em;
}`
  );
  // Mobile headings
  css = css.replace(
    /\.heading-xl, \.heading-lg, \.heading-md \{ font-size: var\(--text-3xl\); line-height: var\(--lh-3xl\); \}/,
    `.heading-xl, .heading-lg, .heading-md { font-size: var(--text-3xl); line-height: var(--lh-3xl); }`
  );

  return css;
}

function remapTextTokens(css) {
  // Two-phase replace to avoid chaining (--text-4xl → --text-5xl → --text-8xl)
  const keys = Object.keys(OLD_TEXT_TOKEN_MAP).sort((a, b) => b.length - a.length);
  const temporaries = {};
  keys.forEach((old, i) => {
    const neu = OLD_TEXT_TOKEN_MAP[old];
    if (old === neu) return;
    const tmp = `__TEXT_TMP_${i}__`;
    temporaries[tmp] = neu;
    const re = new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![a-z0-9_-])", "g");
    css = css.replace(re, tmp);
  });
  for (const [tmp, neu] of Object.entries(temporaries)) {
    css = css.replaceAll(tmp, neu);
  }
  return css;
}

function remapClampRemLiterals(css) {
  // clamp(2rem, …) etc. that aren't var() — map rem→nearest type token
  const remToPx = (r) => Math.round(parseFloat(r) * 16 * 1000) / 1000;
  return css.replace(
    /font-size:\s*clamp\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g,
    (full, a, mid, b) => {
      const fix = (part) => {
        const t = part.trim();
        if (t.startsWith("var(")) return t;
        const remM = t.match(/^([0-9.]+)rem$/);
        if (remM) {
          const px = remToPx(remM[1]);
          const n = nearestTypePx(px);
          return `var(${TYPE_PX[n]})`;
        }
        const pxM = t.match(/^([0-9.]+)px$/);
        if (pxM) {
          const n = nearestTypePx(parseFloat(pxM[1]));
          return `var(${TYPE_PX[n]})`;
        }
        return t;
      };
      return `font-size: clamp(${fix(a)}, ${mid.trim()}, ${fix(b)})`;
    }
  );
}

function remapSpacingInCss(css) {
  return css.replace(
    /(padding(?:-(?:top|right|bottom|left))?|margin(?:-(?:top|right|bottom|left))?|gap|row-gap|column-gap)\s*:\s*([^;{}]+)/g,
    (full, prop, val) => {
      // Skip if entire value is already only vars / 0 / keywords
      const newVal = val.replace(/(-?)([0-9.]+)px/g, (m, sign, num) => {
        const n = parseFloat(num) * (sign === "-" ? -1 : 1);
        if (n === 0) return "0";
        const hit = nearestSpacing(n);
        if (!hit) return m;
        return hit.negative
          ? `calc(-1 * var(${hit.token}))`
          : `var(${hit.token})`;
      });
      return `${prop}: ${newVal}`;
    }
  );
}

function remapRgba(css) {
  const whiteMap = {
    "0.03": "var(--white-a-3)",
    "0.04": "var(--white-a-4)",
    ".04": "var(--white-a-4)",
    "0.06": "var(--white-a-6)",
    ".06": "var(--white-a-6)",
    "0.08": "var(--white-a-8)",
    ".08": "var(--white-a-8)",
    "0.1": "var(--white-a-10)",
    "0.10": "var(--white-a-10)",
    ".1": "var(--white-a-10)",
    "0.12": "var(--white-a-12)",
    ".12": "var(--white-a-12)",
    "0.15": "var(--white-a-15)",
    ".15": "var(--white-a-15)",
    "0.18": "var(--white-a-18)",
    ".18": "var(--white-a-18)",
    "0.2": "var(--white-a-20)",
    "0.20": "var(--white-a-20)",
    ".2": "var(--white-a-20)",
    "0.22": "var(--white-a-22)",
    ".22": "var(--white-a-22)",
    "0.6": "var(--white-a-60)",
    "0.60": "var(--white-a-60)",
    ".6": "var(--white-a-60)",
    "0.64": "var(--white-a-64)",
    ".64": "var(--white-a-64)",
    "0.66": "var(--white-a-66)",
    ".66": "var(--white-a-66)",
    "0.7": "var(--white-a-70)",
    "0.70": "var(--white-a-70)",
    ".7": "var(--white-a-70)",
    "0.8": "var(--white-a-80)",
    "0.80": "var(--white-a-80)",
    ".8": "var(--white-a-80)",
  };
  const blackMap = {
    "0.04": "var(--black-a-4)",
    ".04": "var(--black-a-4)",
    "0.12": "var(--black-a-12)",
    ".12": "var(--black-a-12)",
    "0.16": "var(--black-a-16)",
    ".16": "var(--black-a-16)",
    "0.2": "var(--black-a-20)",
    "0.20": "var(--black-a-20)",
    ".2": "var(--black-a-20)",
    "0.22": "var(--black-a-22)",
    ".22": "var(--black-a-22)",
    "0.25": "var(--black-a-25)",
    ".25": "var(--black-a-25)",
    "0.28": "var(--black-a-28)",
    ".28": "var(--black-a-28)",
    "0.3": "var(--black-a-30)",
    "0.30": "var(--black-a-30)",
    ".3": "var(--black-a-30)",
    "0.45": "var(--black-a-45)",
    ".45": "var(--black-a-45)",
    "0.5": "var(--black-a-50)",
    "0.50": "var(--black-a-50)",
    ".5": "var(--black-a-50)",
  };

  css = css.replace(
    /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([0-9.]+)\s*\)/g,
    (m, a) => whiteMap[a] || m
  );
  css = css.replace(
    /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([0-9.]+)\s*\)/g,
    (m, a) => blackMap[a] || m
  );

  // Theme-scoped nav backgrounds → --nav-bg
  css = css.replace(
    /\[data-theme="light"\]\s*\.nav\s*\{\s*background:\s*rgba\(248,248,247,0\.84\);\s*\}/,
    '[data-theme="light"] .nav { background: var(--nav-bg); }'
  );
  css = css.replace(
    /\[data-theme="dark"\]\s*\.nav\s*\{\s*background:\s*rgba\(42,42,39,0\.84\);\s*\}/,
    '[data-theme="dark"] .nav { background: var(--nav-bg); }'
  );
  css = css.replace(
    /\[data-theme="jurnii-v1"\]\s*\.nav\s*\{\s*background:\s*rgba\(49,72,75,0\.88\);\s*\}/,
    '[data-theme="jurnii-v1"] .nav { background: var(--nav-bg); }'
  );
  // Collapse to single rule if all three are now identical
  css = css.replace(
    /\[data-theme="light"\] \.nav \{ background: var\(--nav-bg\); \}\n\[data-theme="dark"\] \.nav \{ background: var\(--nav-bg\); \}\n\[data-theme="jurnii-v1"\] \.nav \{ background: var\(--nav-bg\); \}/,
    ".nav { background: var(--nav-bg); }"
  );

  // Border semantic already uses rgba in dark — also map #FFFFFF1A style borders
  // alpha-90 is white@10% in light but in dark it's black@10%. For borders on dark
  // surfaces that need white@10%, use --white-a-10 / --alpha-90 carefully.
  // Existing --border in dark is rgba(255,255,255,0.10) — leave as is (semantic).

  return css;
}

function fixFontWeight450(css) {
  return css.replace(/font-weight:\s*450\b/g, "font-weight: var(--fw-medium)");
}

// --- run ---
for (const rel of CSS_FILES) {
  const file = path.join(ROOT, rel);
  let css = fs.readFileSync(file, "utf8");

  if (rel === "assets/global.css") {
    // Replace type scale first, then fix headings — do NOT remapTextTokens
    // (would rewrite the new token definitions).
    css = updateGlobalCss(css);
    css = fixFontWeight450(css);
  } else {
    css = remapTextTokens(css);
    css = remapClampRemLiterals(css);
    css = fixFontWeight450(css);
    css = remapSpacingInCss(css);
    css = remapRgba(css);
  }

  fs.writeFileSync(file, css);
  console.log("updated", rel);
}

// Verify
const site = fs.readFileSync(path.join(ROOT, "assets/site.css"), "utf8");
const global = fs.readFileSync(path.join(ROOT, "assets/global.css"), "utf8");
const leftoverText = [...site.matchAll(/--text-(?:3xs|2xs-plus|xs-plus|sm-plus|md|lg-plus|xl-sm|xl-plus|xl-lg|2xl-plus|2xl-lg|2_5xl|4xl-plus|4_5xl|5xl-plus)/g)];
const halfFs = [...site.matchAll(/font-size:\s*[0-9]+\.[0-9]+px/g)];
const fw450 = [...site.matchAll(/font-weight:\s*450/g)];
const typeDefs = [...global.matchAll(/--text-[a-z0-9_]+:/g)].map((m) => m[0]);
console.log("\nType tokens in global:", typeDefs.join(" "));
console.log("Leftover old text tokens in site.css:", leftoverText.length);
console.log("Half-px font-size:", halfFs.length);
console.log("fw 450:", fw450.length);
console.log("nav-bg defined:", global.includes("--nav-bg:"));
console.log("alpha-90 defined:", global.includes("--alpha-90:"));
