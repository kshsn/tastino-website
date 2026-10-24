// Cleaning of visitor input. Pure functions, used by the server (and by the browser for instant feedback).

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/** Arabic-Indic and Persian digits become Latin digits (٠١٢ → 012). */
export function toLatinDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (c) => {
    const a = ARABIC_INDIC.indexOf(c);
    return String(a >= 0 ? a : EASTERN_INDIC.indexOf(c));
  });
}

// C0/C1 controls and Unicode line/paragraph separators.
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;
const BIDI_OVERRIDES = /[\u202a-\u202e\u2066-\u2069]/g;

/** One line of text: every control character (including line breaks, which would allow email header injection) is removed. */
export function singleLine(s: unknown): string {
  return typeof s === 'string' ? s.replace(CONTROL, ' ').replace(BIDI_OVERRIDES, '').replace(/\s+/g, ' ').trim() : '';
}

/** Multi-line text: line breaks are kept (as \n), other control characters are removed. */
export function multiLine(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/g, '')
    .replace(BIDI_OVERRIDES, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Phone number from a dialling code and what the visitor typed: digits only (Arabic digits accepted), a leading
 * 0 dropped, 7 to 12 digits. Returns "+<code><digits>", or null when empty or invalid.
 */
export function normalizePhone(dial: string, typed: unknown, min = 7, max = 12): string | null {
  if (typeof typed !== 'string') return null;
  const raw = toLatinDigits(typed).trim();
  // Typed with its own international prefix (+966… or 00966…): use it as given and ignore the selected code.
  if (/^(\+|00)/.test(raw)) {
    const full = raw.replace(/^(\+|00)/, '').replace(/[\s\-().]/g, '');
    return /^\d{8,15}$/.test(full) ? `+${full}` : null;
  }
  let digits = raw.replace(/[\s\-().]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  digits = digits.replace(/^0+/, '');
  return digits.length >= min && digits.length <= max ? `+${dial}${digits}` : null;
}

/** Lower-cased, trimmed address if it looks like name@domain.tld; otherwise null. */
export function normalizeEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  if (e.length > 254 || /\s/.test(e) || /[\u0000-\u001f<>(),;:"\\]/.test(e)) return null;
  return /^[^@\s]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(e) ? e : null;
}
