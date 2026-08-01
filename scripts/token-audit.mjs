#!/usr/bin/env node
/**
 * Jurnii design-token compliance audit
 * Scans in-scope CSS/JSX/JS for hard-coded colour, typography, and spacing.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SCOPE = {
  css: [
    "assets/site.css",
    "assets/use-cases.css",
    "assets/pv-panel.css",
    "assets/rec-modal.css",
  ],
  jsx: [
    "assets/blocks.jsx",
    "assets/site.jsx",
    "assets/home-sections.jsx",
    "assets/page-sections.jsx",
    "assets/feature-page.jsx",
    "assets/solution-page.jsx",
    "assets/use-case-page.jsx",
    "assets/who-its-for.jsx",
    "assets/industries.jsx",
    "assets/ux-scorecard.jsx",
    "assets/ux-telemetry.jsx",
    "assets/price-boost-card.jsx",
    "assets/price-boost-table.jsx",
    "assets/cl-linechart.jsx",
    "assets/cl-promotions.jsx",
    "assets/rec-modal.jsx",
    "assets/feature-archive.jsx",
    "assets/solution-archive.jsx",
    "assets/use-case-archive.jsx",
    "assets/resource-bodies.jsx",
    "assets/feature-data.jsx",
    "assets/solution-data.jsx",
    "assets/use-case-data.jsx",
    "assets/product-data.jsx",
    "assets/compare-data.jsx",
    // The booking widget lives in the portable `booking/` module, whose styling is
    // confined to booking/assets/booking-form.css — audited there, not here.
    "assets/headline-split.js",
  ],
};

// Existing token maps (pre-rem conversion, px values)
const COLOR_TOKENS = {
  "#F8F8F7": "--concrete-50",
  "#F2F2F1": "--concrete-100",
  "#E3E3E3": "--concrete-200",
  "#BFBFBA": "--concrete-300",
  "#9C9C94": "--concrete-400",
  "#807F77": "--concrete-500",
  "#686761": "--concrete-600",
  "#55554F": "--concrete-700",
  "#484744": "--concrete-800",
  "#3F3E3B": "--concrete-900",
  "#2A2A27": "--concrete-950",
  "#E6FFE5": "--jurnii-50",
  "#C7FFC6": "--jurnii-100",
  "#94FF96": "--jurnii-200",
  "#57FF60": "--jurnii-300",
  "#34F741": "--jurnii-400",
  "#05DD17": "--jurnii-500",
  "#00B113": "--jurnii-600",
  "#058615": "--jurnii-700",
  "#0B6917": "--jurnii-800",
  "#0E591A": "--jurnii-900",
  "#01320A": "--jurnii-950",
  "#F2F9F9": "--blue-dianne-50",
  "#DFEEED": "--blue-dianne-100",
  "#C2DFDD": "--blue-dianne-200",
  "#98C8C6": "--blue-dianne-300",
  "#66AAA8": "--blue-dianne-400",
  "#4B8F8E": "--blue-dianne-500",
  "#417779": "--blue-dianne-600",
  "#3A6264": "--blue-dianne-700",
  "#355255": "--blue-dianne-800",
  "#31484B": "--blue-dianne-900",
  "#1C2D30": "--blue-dianne-950",
  "#FFFFFF": "--card", // light semantic; also white
  "#FFF": "--card",
  "#000": null, // rare
  "#DC2626": "--destructive",
  "#FEF2F2": "--destructive-foreground",
  "#16A34A": "--positive",
  "#F0FDF4": "--positive-foreground",
  "#EA580C": "--warning",
  "#FFF7ED": "--warning-foreground",
  "#60A5FA": "--information",
  "#172554": "--information-foreground",
  "#8B5CF6": "--excellent",
  "#22C55E": "--good",
  "#FACC15": "--average",
  "#FB923C": "--poor",
  "#EF4444": "--very-poor",
  "#C084FC": "--performance",
  "#4ADE80": "--journey",
  "#FB7185": "--perception",
  "#5299FF": "--accent-ux",
  "#FFA852": "--accent-mmm",
  "#B97309": "--partial",
  "#F5B66C": "--partial", // dark/v1
  "#F87171": "--destructive", // dark
  "#FCA5A5": "--destructive", // v1 / chart
  "#7DB1FF": null, // not in scale — report
};

// Semantic preference when multiple tokens match
const SEMANTIC_COLOR = {
  "#F8F8F7": "--background", // light bg / concrete-50
  "#2A2A27": "--foreground", // light fg / concrete-950
  "#FFFFFF": "--card",
  "#FFF": "--card",
  "#E3E3E3": "--border",
  "#807F77": "--muted-foreground",
  "#F2F2F1": "--accent",
  "#9C9C94": "--ring",
  "#DC2626": "--destructive",
  "#94FF96": "--jurnii-200",
  "#57FF60": "--jurnii-300",
  "#05DD17": "--accent-green", // light mode accent-green
  "#00B113": "--jurnii-600",
};

const SPACING_TOKENS = {
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

const FW_TOKENS = {
  100: "--fw-thin",
  200: "--fw-extralight",
  300: "--fw-light",
  400: "--fw-normal",
  500: "--fw-medium",
  600: "--fw-semibold",
  800: "--fw-extrabold",
  900: "--fw-black",
};

// Existing type scale (px) — will become rem
const TEXT_TOKENS_PX = {
  12: "--text-xs",
  14: "--text-sm",
  16: "--text-base",
  18: "--text-lg",
  20: "--text-xl",
  24: "--text-2xl",
  30: "--text-3xl",
  36: "--text-4xl",
  48: "--text-5xl",
  60: "--text-6xl",
  72: "--text-7xl",
  96: "--text-8xl",
  128: "--text-9xl",
};

// Proposed new text tokens for whole-pixel gaps (and rounded half-pixels)
const NEW_TEXT_TOKENS = {
  9: { name: "--text-3xs", rem: "0.5625rem" },
  10: { name: "--text-2xs", rem: "0.625rem" },
  11: { name: "--text-2xs-plus", rem: "0.6875rem" },
  13: { name: "--text-xs-plus", rem: "0.8125rem" },
  15: { name: "--text-sm-plus", rem: "0.9375rem" },
  17: { name: "--text-md", rem: "1.0625rem" },
  19: { name: "--text-lg-plus", rem: "1.1875rem" },
  21: { name: "--text-xl-sm", rem: "1.3125rem" },
  22: { name: "--text-xl-plus", rem: "1.375rem" },
  23: { name: "--text-xl-lg", rem: "1.4375rem" },
  26: { name: "--text-2xl-plus", rem: "1.625rem" },
  27: { name: "--text-2xl-lg", rem: "1.6875rem" },
  28: { name: "--text-2_5xl", rem: "1.75rem" },
  42: { name: "--text-4xl-plus", rem: "2.625rem" },
  46: { name: "--text-4_5xl", rem: "2.875rem" },
  52: { name: "--text-5xl-plus", rem: "3.25rem" },
};

// Half-pixel rounding map
const HALF_PX_ROUND = {
  9.5: 10,
  10.5: 11,
  11.5: 12,
  12.5: 13,
  13.5: 14,
  14.5: 15,
  15.5: 16,
  16.5: 17,
};

const RADIUS_TOKENS = {
  0: "--radius-none",
  2: "--radius-xxs",
  4: "--radius-xs",
  6: "--radius-sm",
  8: "--radius-md",
  12: "--radius-lg",
  16: "--radius-xl",
  20: "--radius-2xl",
  24: "--radius-3xl",
  32: "--radius-4xl",
  9999: "--radius-full",
};

function normHex(h) {
  let x = h.toUpperCase();
  if (x.length === 4) {
    x = "#" + x[1] + x[1] + x[2] + x[2] + x[3] + x[3];
  }
  return x;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function lineAt(content, index) {
  return content.slice(0, index).split("\n").length;
}

function isThemeScoped(line, prevLines) {
  const ctx = prevLines.join("\n");
  return /\[data-theme\s*=/.test(ctx) || /\[data-theme\s*=/.test(line);
}

const findings = {
  color: { tier1: [], tier2b: [], exceptions: [] },
  typography: { tier1: [], tier15: [], tier2a: [], tier2b: [] },
  spacing: { tier1: [], tier2a: [], tier2b: [] },
  radius: { tier1: [], tier2b: [] },
  summary: {},
};

function scanCss(rel) {
  const content = read(rel);
  const lines = content.split("\n");

  // Hex colours
  const hexRe = /#([0-9A-Fa-f]{3,8})\b/g;
  let m;
  while ((m = hexRe.exec(content))) {
    const line = lineAt(content, m.index);
    const hex = normHex(m[0]);
    const lineText = lines[line - 1] || "";
    // Skip if already var(
    if (/var\(--/.test(lineText) && lineText.indexOf(m[0]) > lineText.indexOf("var(")) {
      // still count literal hex even near vars
    }
    // Theme-scoped hardcodes → tier2b
    const window = lines.slice(Math.max(0, line - 8), line).join("\n");
    if (/\[data-theme\s*=/.test(window)) {
      findings.color.tier2b.push({
        file: rel,
        line,
        value: m[0],
        hex,
        reason: "theme-scoped hardcode — promote to semantic token",
        snippet: lineText.trim().slice(0, 120),
      });
      continue;
    }
    const token = SEMANTIC_COLOR[hex] || COLOR_TOKENS[hex];
    if (token) {
      findings.color.tier1.push({
        file: rel,
        line,
        value: m[0],
        hex,
        token,
        snippet: lineText.trim().slice(0, 120),
      });
    } else if (COLOR_TOKENS[hex] === null) {
      findings.color.tier2b.push({
        file: rel,
        line,
        value: m[0],
        hex,
        reason: "no matching token",
        snippet: lineText.trim().slice(0, 120),
      });
    } else {
      findings.color.tier2b.push({
        file: rel,
        line,
        value: m[0],
        hex,
        reason: "no matching token",
        snippet: lineText.trim().slice(0, 120),
      });
    }
  }

  // rgba/rgb with numeric channels (not var)
  const rgbaRe = /rgba?\(\s*\d+/g;
  while ((m = rgbaRe.exec(content))) {
    const line = lineAt(content, m.index);
    const lineText = lines[line - 1] || "";
    if (/rgba?\(\s*var\(/.test(lineText)) continue;
    findings.color.tier2b.push({
      file: rel,
      line,
      value: lineText.match(/rgba?\([^)]+\)/)?.[0] || m[0],
      reason: "literal rgb/rgba — prefer token or rgba(var(--*-rgb), a)",
      snippet: lineText.trim().slice(0, 120),
    });
  }

  // font-size
  const fsRe = /font-size:\s*([0-9.]+)px/g;
  while ((m = fsRe.exec(content))) {
    const line = lineAt(content, m.index);
    const px = parseFloat(m[1]);
    const lineText = lines[line - 1] || "";
    if (HALF_PX_ROUND[px] != null) {
      const rounded = HALF_PX_ROUND[px];
      const tok =
        TEXT_TOKENS_PX[rounded] ||
        NEW_TEXT_TOKENS[rounded]?.name ||
        null;
      findings.typography.tier15.push({
        file: rel,
        line,
        value: `${px}px`,
        rounded: `${rounded}px`,
        token: tok,
        snippet: lineText.trim().slice(0, 120),
      });
    } else if (TEXT_TOKENS_PX[px]) {
      findings.typography.tier1.push({
        file: rel,
        line,
        value: `${px}px`,
        token: TEXT_TOKENS_PX[px],
        snippet: lineText.trim().slice(0, 120),
      });
    } else if (NEW_TEXT_TOKENS[px]) {
      findings.typography.tier2a.push({
        file: rel,
        line,
        value: `${px}px`,
        token: NEW_TEXT_TOKENS[px].name,
        rem: NEW_TEXT_TOKENS[px].rem,
        snippet: lineText.trim().slice(0, 120),
      });
    } else if (Number.isInteger(px)) {
      // whole pixel not in planned scale (21, 23, 27…)
      findings.typography.tier2a.push({
        file: rel,
        line,
        value: `${px}px`,
        token: `--text-${px}`,
        rem: `${px / 16}rem`,
        snippet: lineText.trim().slice(0, 120),
      });
    } else {
      findings.typography.tier2b.push({
        file: rel,
        line,
        value: `${px}px`,
        reason: "non-integer font-size",
        snippet: lineText.trim().slice(0, 120),
      });
    }
  }

  // font-weight
  const fwRe = /font-weight:\s*([0-9]+)/g;
  while ((m = fwRe.exec(content))) {
    const line = lineAt(content, m.index);
    const w = parseInt(m[1], 10);
    const lineText = lines[line - 1] || "";
    if (FW_TOKENS[w]) {
      findings.typography.tier1.push({
        file: rel,
        line,
        prop: "font-weight",
        value: String(w),
        token: FW_TOKENS[w],
        snippet: lineText.trim().slice(0, 120),
      });
    } else {
      findings.typography.tier2b.push({
        file: rel,
        line,
        prop: "font-weight",
        value: String(w),
        reason: "no fw token (e.g. 450)",
        snippet: lineText.trim().slice(0, 120),
      });
    }
  }

  // font-family literal (not var, not inherit)
  const ffRe = /font-family:\s*([^;]+);/g;
  while ((m = ffRe.exec(content))) {
    const val = m[1].trim();
    if (val.startsWith("var(") || val === "inherit") continue;
    const line = lineAt(content, m.index);
    const lineText = lines[line - 1] || "";
    if (/Georgia|serif/i.test(val)) {
      findings.typography.tier1.push({
        file: rel,
        line,
        prop: "font-family",
        value: val,
        token: "--font-serif",
        snippet: lineText.trim().slice(0, 120),
      });
    } else {
      findings.typography.tier2b.push({
        file: rel,
        line,
        prop: "font-family",
        value: val,
        reason: "hard-coded font stack",
        snippet: lineText.trim().slice(0, 120),
      });
    }
  }

  // spacing: padding, margin, gap (and longhands)
  const spaceProps =
    /(padding(?:-(?:top|right|bottom|left))?|margin(?:-(?:top|right|bottom|left))?|gap|row-gap|column-gap)\s*:\s*([^;{}]+)/g;
  while ((m = spaceProps.exec(content))) {
    const prop = m[1];
    const val = m[2].trim();
    const line = lineAt(content, m.index);
    const lineText = lines[line - 1] || "";
    if (/var\(/.test(val)) continue;
    // extract all Npx in the value
    const pxParts = [...val.matchAll(/(-?[0-9.]+)px/g)];
    if (!pxParts.length) continue;
    for (const p of pxParts) {
      const n = parseFloat(p[1]);
      const abs = Math.abs(n);
      if (abs === 0) continue;
      // 1px borders/offsets often intentional
      if (abs === 1) {
        findings.spacing.tier2b.push({
          file: rel,
          line,
          prop,
          value: `${n}px`,
          reason: "1px hairline/offset — usually intentional, leave",
          snippet: lineText.trim().slice(0, 120),
        });
        continue;
      }
      if (SPACING_TOKENS[abs]) {
        findings.spacing.tier1.push({
          file: rel,
          line,
          prop,
          value: `${n}px`,
          token: SPACING_TOKENS[abs],
          negative: n < 0,
          snippet: lineText.trim().slice(0, 120),
        });
      } else if (abs % 4 === 0) {
        findings.spacing.tier2a.push({
          file: rel,
          line,
          prop,
          value: `${n}px`,
          reason: "on 4px grid but no --spacing-* token",
          suggested: `--spacing-${abs / 4}`,
          snippet: lineText.trim().slice(0, 120),
        });
      } else {
        const nearest = Math.round(abs / 4) * 4;
        findings.spacing.tier2b.push({
          file: rel,
          line,
          prop,
          value: `${n}px`,
          reason: "off 4px grid",
          nearest: `${nearest}px (${SPACING_TOKENS[nearest] || "new token"})`,
          snippet: lineText.trim().slice(0, 120),
        });
      }
    }
  }

  // border-radius
  const brRe = /border-radius:\s*([^;]+);/g;
  while ((m = brRe.exec(content))) {
    const val = m[1].trim();
    if (/var\(/.test(val)) continue;
    const line = lineAt(content, m.index);
    const lineText = lines[line - 1] || "";
    const px = val.match(/([0-9.]+)px/);
    if (!px) continue;
    const n = parseFloat(px[1]);
    if (RADIUS_TOKENS[n]) {
      findings.radius.tier1.push({
        file: rel,
        line,
        value: `${n}px`,
        token: RADIUS_TOKENS[n],
        snippet: lineText.trim().slice(0, 120),
      });
    } else if (n === 9999 || n >= 999) {
      findings.radius.tier1.push({
        file: rel,
        line,
        value: val,
        token: "--radius-full",
        snippet: lineText.trim().slice(0, 120),
      });
    } else {
      findings.radius.tier2b.push({
        file: rel,
        line,
        value: `${n}px`,
        reason: "no radius token",
        snippet: lineText.trim().slice(0, 120),
      });
    }
  }
}

function scanJsx(rel) {
  const content = read(rel);
  const lines = content.split("\n");

  // Hex in style / props (skip SVG path data contexts loosely)
  const hexRe = /#([0-9A-Fa-f]{3,8})\b/g;
  let m;
  while ((m = hexRe.exec(content))) {
    const line = lineAt(content, m.index);
    const lineText = lines[line - 1] || "";
    // Skip fill="#..." in SVG mark components that are brand marks — still report as exception if jurnii green
    const hex = normHex(m[0]);
    const isSvg =
      /fill=|stroke=|<path|<svg|viewBox/.test(lineText) ||
      /fill=|stroke=/.test(lines[line - 2] || "");
    const isCompetitor =
      /operator|competitor|brand|logo|Bet|Stake|Draft|FanDuel|Paddy|William/i.test(
        lineText + (lines[line - 2] || "") + (lines[line] || "")
      );

    if (isCompetitor) {
      findings.color.exceptions.push({
        file: rel,
        line,
        value: m[0],
        reason: "third-party / competitor brand colour",
        snippet: lineText.trim().slice(0, 120),
      });
      continue;
    }
    if (isSvg) {
      const token = SEMANTIC_COLOR[hex] || COLOR_TOKENS[hex];
      if (token) {
        findings.color.exceptions.push({
          file: rel,
          line,
          value: m[0],
          reason: "inline SVG fill — prefer currentColor or CSS var if feasible",
          token,
          snippet: lineText.trim().slice(0, 120),
        });
      } else {
        findings.color.exceptions.push({
          file: rel,
          line,
          value: m[0],
          reason: "inline SVG fill (no token)",
          snippet: lineText.trim().slice(0, 120),
        });
      }
      continue;
    }

    const token = SEMANTIC_COLOR[hex] || COLOR_TOKENS[hex];
    if (token) {
      findings.color.tier1.push({
        file: rel,
        line,
        value: m[0],
        hex,
        token,
        snippet: lineText.trim().slice(0, 120),
      });
    } else {
      findings.color.tier2b.push({
        file: rel,
        line,
        value: m[0],
        hex,
        reason: "no matching token (jsx)",
        snippet: lineText.trim().slice(0, 120),
      });
    }
  }

  // Inline style numeric padding/margin/gap/fontSize
  const styleNum =
    /(padding|margin|gap|fontSize|fontWeight|borderRadius)\s*:\s*['"]?([0-9.]+)(px)?['"]?/g;
  while ((m = styleNum.exec(content))) {
    const prop = m[1];
    const n = parseFloat(m[2]);
    const line = lineAt(content, m.index);
    const lineText = lines[line - 1] || "";
    if (prop === "fontSize") {
      if (HALF_PX_ROUND[n] != null) {
        const rounded = HALF_PX_ROUND[n];
        findings.typography.tier15.push({
          file: rel,
          line,
          value: `${n}px`,
          rounded: `${rounded}px`,
          token: TEXT_TOKENS_PX[rounded] || NEW_TEXT_TOKENS[rounded]?.name,
          snippet: lineText.trim().slice(0, 120),
        });
      } else if (TEXT_TOKENS_PX[n]) {
        findings.typography.tier1.push({
          file: rel,
          line,
          value: `${n}px`,
          token: TEXT_TOKENS_PX[n],
          snippet: lineText.trim().slice(0, 120),
        });
      } else if (NEW_TEXT_TOKENS[n] || Number.isInteger(n)) {
        findings.typography.tier2a.push({
          file: rel,
          line,
          value: `${n}px`,
          token: NEW_TEXT_TOKENS[n]?.name || `--text-${n}`,
          rem: NEW_TEXT_TOKENS[n]?.rem || `${n / 16}rem`,
          snippet: lineText.trim().slice(0, 120),
        });
      }
    } else if (prop === "fontWeight") {
      if (FW_TOKENS[n]) {
        findings.typography.tier1.push({
          file: rel,
          line,
          prop: "font-weight",
          value: String(n),
          token: FW_TOKENS[n],
          snippet: lineText.trim().slice(0, 120),
        });
      }
    } else if (prop === "borderRadius") {
      if (RADIUS_TOKENS[n]) {
        findings.radius.tier1.push({
          file: rel,
          line,
          value: `${n}px`,
          token: RADIUS_TOKENS[n],
          snippet: lineText.trim().slice(0, 120),
        });
      }
    } else {
      // spacing
      if (SPACING_TOKENS[n]) {
        findings.spacing.tier1.push({
          file: rel,
          line,
          prop,
          value: `${n}px`,
          token: SPACING_TOKENS[n],
          snippet: lineText.trim().slice(0, 120),
        });
      } else if (n % 4 === 0 && n > 0) {
        findings.spacing.tier2a.push({
          file: rel,
          line,
          prop,
          value: `${n}px`,
          reason: "on 4px grid but no token",
          snippet: lineText.trim().slice(0, 120),
        });
      } else if (n > 0) {
        findings.spacing.tier2b.push({
          file: rel,
          line,
          prop,
          value: `${n}px`,
          reason: "off 4px grid (jsx)",
          snippet: lineText.trim().slice(0, 120),
        });
      }
    }
  }
}

for (const f of SCOPE.css) scanCss(f);
for (const f of SCOPE.jsx) {
  if (fs.existsSync(path.join(ROOT, f))) scanJsx(f);
}

findings.summary = {
  color_tier1: findings.color.tier1.length,
  color_tier2b: findings.color.tier2b.length,
  color_exceptions: findings.color.exceptions.length,
  type_tier1: findings.typography.tier1.length,
  type_tier15: findings.typography.tier15.length,
  type_tier2a: findings.typography.tier2a.length,
  type_tier2b: findings.typography.tier2b.length,
  space_tier1: findings.spacing.tier1.length,
  space_tier2a: findings.spacing.tier2a.length,
  space_tier2b: findings.spacing.tier2b.length,
  radius_tier1: findings.radius.tier1.length,
  radius_tier2b: findings.radius.tier2b.length,
};

const outJson = path.join(ROOT, "scripts/token-audit-results.json");
fs.writeFileSync(outJson, JSON.stringify(findings, null, 2));

// Deduped value maps for apply step
const unique = {
  textSizesNeeded: {},
  colorReplacements: {},
  fwReplacements: {},
  spacingReplacements: {},
  radiusReplacements: {},
  halfPx: {},
};

for (const t of findings.typography.tier1) {
  if (t.token?.startsWith("--text")) unique.textSizesNeeded[t.value] = t.token;
  if (t.prop === "font-weight") unique.fwReplacements[t.value] = t.token;
  if (t.prop === "font-family") unique.fwReplacements["ff:" + t.value] = t.token;
}
for (const t of findings.typography.tier15) {
  unique.halfPx[t.value] = { rounded: t.rounded, token: t.token };
  if (t.token) unique.textSizesNeeded[t.rounded] = t.token;
}
for (const t of findings.typography.tier2a) {
  unique.textSizesNeeded[t.value] = t.token;
}
for (const t of findings.color.tier1) {
  unique.colorReplacements[t.hex || normHex(t.value)] = t.token;
}
for (const t of findings.spacing.tier1) {
  unique.spacingReplacements[Math.abs(parseFloat(t.value))] = t.token;
}
for (const t of findings.radius.tier1) {
  unique.radiusReplacements[t.value] = t.token;
}

fs.writeFileSync(
  path.join(ROOT, "scripts/token-audit-unique.json"),
  JSON.stringify({ unique, NEW_TEXT_TOKENS, TEXT_TOKENS_PX, HALF_PX_ROUND }, null, 2)
);

console.log("Summary:", findings.summary);
console.log("Wrote", outJson);
