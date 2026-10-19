import type { ImageDerivatives, PictureData } from './types';

interface ImageRow {
  width: number;
  height: number;
  altEn: string | null;
  altAr: string | null;
  derivatives: unknown;
}

/** A media URL: a site path ("/media/…") or an https URL, made only of safe characters (no spaces, commas, quotes or parentheses). */
const SAFE_URL = /^(?:\/(?!\/)|https:\/\/)[\w\-./:]+$/;
const WIDTH_KEY = /^\d{2,5}$/;

const isRecord = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === 'object' && Object.entries(v).every(([k, x]) => WIDTH_KEY.test(k) && typeof x === 'string' && SAFE_URL.test(x));

/** Validates the stored JSON; returns null for anything that is not a usable derivatives object. */
export function parseDerivatives(raw: unknown): ImageDerivatives | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.original !== 'string' || !SAFE_URL.test(d.original) || !isRecord(d.avif) || !isRecord(d.webp)) return null;
  return { original: d.original, avif: d.avif, webp: d.webp };
}

/**
 * Converts a MediaAsset row into render data for one locale. The alt text comes from that language only;
 * `fallbackAlt` (e.g. the product name in the same language) is used when the asset has none.
 */
export function toPictureData(
  row: ImageRow | null | undefined,
  locale: string,
  fallbackAlt = '',
): PictureData | null {
  if (!row) return null;
  const derivatives = parseDerivatives(row.derivatives);
  if (!derivatives) return null;
  const alt = (locale === 'ar' ? row.altAr : row.altEn)?.trim() || fallbackAlt;
  return { width: row.width, height: row.height, derivatives, alt };
}

/** `srcset` string for one format, sorted by width. */
export function srcSet(renditions: Record<string, string>): string {
  return Object.entries(renditions)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([w, url]) => `${url} ${w}w`)
    .join(', ');
}

/** Largest WebP rendition, used as the `<img>` fallback source. */
export function fallbackSrc(d: ImageDerivatives): string {
  const widths = Object.keys(d.webp).map(Number).sort((a, b) => b - a);
  return widths.length ? d.webp[String(widths[0])] : d.original;
}
