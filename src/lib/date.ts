/** "24 October 2026" or its Arabic form for an ISO date (YYYY-MM-DD). Empty string for anything that is not a valid date. */
export function formatLongDate(iso: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(d);
}
