/** sRGB channels, 0-255. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/** WCAG contrast ratio (1-21), order-independent. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Resolve a CSS custom property (e.g. '--primary') to sRGB by painting its
 * resolved value onto a 1x1 canvas and reading the pixel back. Browser-only
 * (jsdom has no canvas), so this is exercised live in Storybook, not in unit tests.
 */
export function resolveTokenRgb(tokenVarName: string): Rgb {
  const value = getComputedStyle(document.documentElement).getPropertyValue(tokenVarName).trim();
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { r: 0, g: 0, b: 0 };
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return { r: data[0] ?? 0, g: data[1] ?? 0, b: data[2] ?? 0 };
}
