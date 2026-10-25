/** Only paths inside the admin are accepted as a "return to" address (never another site, never a header trick). */
export function safeNext(raw: unknown): string {
  if (typeof raw !== 'string') return '/admin';
  if (!raw.startsWith('/admin') || raw.startsWith('//') || raw.includes('\\') || /[\r\n]/.test(raw)) return '/admin';
  return raw;
}
