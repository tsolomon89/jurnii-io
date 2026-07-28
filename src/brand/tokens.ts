import fs from 'node:fs';
import path from 'node:path';

export interface BrandTokens {
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  spacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
}

/**
 * Loads brand/tokens.json from project root and converts to CSS custom properties map.
 */
export function getTokens(cwd: string = ''): Record<string, string> {
  try {
    const tokenPath = path.join(cwd, 'brand', 'tokens.json');
    if (!fs.existsSync(tokenPath)) {
      return {};
    }
    const raw = fs.readFileSync(tokenPath, 'utf-8');
    const tokens: BrandTokens = JSON.parse(raw);
    const cssVars: Record<string, string> = {};

    if (tokens.colors) {
      for (const [key, val] of Object.entries(tokens.colors)) {
        cssVars[`--c-color-${key}`] = val;
      }
    }
    if (tokens.fonts) {
      for (const [key, val] of Object.entries(tokens.fonts)) {
        cssVars[`--c-font-${key}`] = val;
      }
    }
    if (tokens.spacing) {
      for (const [key, val] of Object.entries(tokens.spacing)) {
        cssVars[`--c-space-${key}`] = val;
      }
    }
    if (tokens.borderRadius) {
      for (const [key, val] of Object.entries(tokens.borderRadius)) {
        cssVars[`--c-radius-${key}`] = val;
      }
    }
    return cssVars;
  } catch (err) {
    console.warn('Failed to load brand tokens:', err);
    return {};
  }
}
