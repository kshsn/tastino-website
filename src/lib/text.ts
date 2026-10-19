/** Splits stored copy into paragraphs (blank-line separated), dropping empty ones. */
export function paragraphs(body: string | null | undefined): string[] {
  return (body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Splits a tagline at its first sentence or clause break (". " in English, "، " in Arabic)
 * so the second half can be tinted. A tagline with no break returns the whole text as `first`.
 */
export function splitTagline(text: string): { first: string; second: string } {
  const t = text.trim();
  const m = /^(.+?[.،,])\s+(.+)$/s.exec(t);
  return m ? { first: m[1], second: m[2] } : { first: t, second: '' };
}

/** Picks the English or Arabic value for a locale; never falls back across languages. */
export function pick<T>(locale: string, en: T, ar: T): T {
  return locale === 'ar' ? ar : en;
}

/** Number formatted with the locale's digits (Arabic-Indic for `ar`). Same output on server and client. */
export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { useGrouping: false }).format(value);
}
