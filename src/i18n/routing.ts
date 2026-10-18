import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
  // Remember an explicit choice for a year; detection uses Accept-Language only (no geo-IP).
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
  // hreflang is rendered in <head> per page instead of as Link headers.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];

export const dirOf = (locale: string) => (locale === 'ar' ? 'rtl' : 'ltr');
