import { routing } from '@/i18n/routing';

const PREFIX = /^\/([a-z]{2}(?:-[a-z]{2})?)(\/.*)?$/i;

/**
 * For a path that starts with an unsupported locale-like prefix (e.g. `/fr/about`, `/en-US`),
 * returns the path without that prefix so it can be re-routed to the detected locale.
 * Returns null when the path has no such prefix or already uses a supported locale.
 */
export function stripUnsupportedLocale(pathname: string): string | null {
  const m = PREFIX.exec(pathname);
  if (!m) return null;
  if ((routing.locales as readonly string[]).includes(m[1])) return null;
  // Collapse leading slashes so the result can never become a protocol-relative URL (`//evil.com`).
  return (m[2] ?? '/').replace(/^[/\\]+/, '/');
}

/** Path in the other locale, keeping the rest of the URL (used by the language switch). */
export function swapLocale(pathname: string, to: string): string {
  const rest = pathname.replace(/^\/(en|ar)(?=\/|$)/, '');
  return `/${to}${rest === '' ? '' : rest}`;
}
