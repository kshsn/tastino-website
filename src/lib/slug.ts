import { routing } from '@/i18n/routing';

/** A slug: lowercase letters and digits in groups separated by single hyphens. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isSlug = (value: string) => SLUG.test(value);

/**
 * `/<locale>/<section>/<slug>` for a permanent redirect, or null when the locale or slug is not valid.
 * Visitors control the old slug, so nothing is redirected unless it matches the strict slug format.
 */
export function slugRedirectPath(locale: string, section: 'brands' | 'products', slug: string): string | null {
  if (!(routing.locales as readonly string[]).includes(locale) || !isSlug(slug)) return null;
  return `/${locale}/${section}/${slug}`;
}
