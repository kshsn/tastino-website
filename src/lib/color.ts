// Accessible color helpers for per-brand accents (WCAG 2.1 contrast). Pure functions, safe on server and client.

const INK = '#14213d';
const WHITE = '#ffffff';
export const PAGE_BG = '#fffbf5';

function parse(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = ([r, g, b]: number[]) =>
  `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

function luminance(hex: string): number {
  const rgb = parse(hex) ?? [0, 0, 0];
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1 to 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(from: string, to: string, t: number): string {
  const a = parse(from);
  const b = parse(to);
  if (!a || !b) return from;
  return toHex(a.map((v, i) => v + (b[i] - v) * t));
}

/** Text color (white or dark ink) that reads best on a solid `accent` background. */
export function onAccent(accent: string): string {
  return contrast(accent, WHITE) >= contrast(accent, INK) ? WHITE : INK;
}

/**
 * Background color for solid buttons and chips: the accent itself when white or dark text already reaches
 * 4.5:1 on it, otherwise the accent darkened toward the ink color until white text does.
 */
export function accentSolid(accent: string): string {
  if (!parse(accent)) return INK;
  if (contrast(accent, onAccent(accent)) >= 4.5) return accent;
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const c = mix(accent, INK, t);
    if (contrast(c, WHITE) >= 4.5) return c;
  }
  return INK;
}

/**
 * The accent itself if it is readable as large text on the page background; otherwise the accent
 * darkened toward the ink color just enough to reach `min` contrast (3:1 is the large-text minimum).
 */
export function accentText(accent: string, min = 3.2, bg = PAGE_BG): string {
  if (!parse(accent)) return INK;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const c = mix(accent, INK, t);
    if (contrast(c, bg) >= min) return c;
  }
  return INK;
}

export const DEFAULT_ACCENT = '#1E6FD9';

/** Returns the value only if it is a plain #rrggbb color; anything else (including CSS injection attempts) becomes `fallback`. */
export function safeAccent(value: unknown, fallback = DEFAULT_ACCENT): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : fallback;
}

/** CSS custom properties for one brand accent: decorative color, solid fill, text on the fill, and readable large text. */
export function accentVars(rawAccent: string): Record<string, string> {
  const accent = safeAccent(rawAccent);
  const solid = accentSolid(accent);
  return {
    '--accent': accent,
    '--accent-solid': solid,
    '--on-accent': onAccent(solid),
    '--accent-text': accentText(accent),
  };
}
