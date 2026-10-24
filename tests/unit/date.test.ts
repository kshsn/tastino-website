import { describe, expect, it } from 'vitest';
import { formatLongDate } from '@/lib/date';

describe('formatLongDate', () => {
  it('formats an ISO date in English', () => {
    expect(formatLongDate('2026-10-24', 'en')).toBe('24 October 2026');
  });
  it('formats an ISO date in Arabic with Arabic digits', () => {
    expect(formatLongDate('2026-10-24', 'ar')).toMatch(/٢٠٢٦/);
  });
  it('does not shift the day with the time zone', () => {
    expect(formatLongDate('2026-01-01', 'en')).toBe('1 January 2026');
  });
  it.each(['', 'soon', '2026-13-45', '24/10/2026'])('returns an empty string for "%s"', (v) => {
    expect(formatLongDate(v, 'en')).toBe('');
  });
});
