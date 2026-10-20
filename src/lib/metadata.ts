import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { env } from '@/env';
import { routing } from '@/i18n/routing';

/** Canonical + hreflang alternates (en, ar, x-default) for a locale-less path such as `/about`. */
export function alternates(locale: string, path: string): Metadata['alternates'] {
  const p = path === '/' ? '' : path;
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, `${env.SITE_URL}/${l}${p}`]),
  );
  languages['x-default'] = `${env.SITE_URL}/${routing.defaultLocale}${p}`;
  return { canonical: `${env.SITE_URL}/${locale}${p}`, languages };
}

export async function pageMetadata(locale: string, key: string, path: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t(`${key}.title`),
    description: t(`${key}.description`),
    alternates: alternates(locale, path),
    openGraph: {
      title: t(`${key}.title`),
      description: t(`${key}.description`),
      url: `${env.SITE_URL}/${locale}${path === '/' ? '' : path}`,
      siteName: t('siteName'),
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
      type: 'website',
    },
  };
}

const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

/** Metadata for pages whose title and description come from content (brand and product pages). */
export async function contentMetadata(locale: string, path: string, title: string, description: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' });
  const url = `${env.SITE_URL}/${locale}${path}`;
  return {
    title: clip(title, 60),
    description: clip(description, 160),
    alternates: alternates(locale, path),
    openGraph: { title: clip(title, 60), description: clip(description, 160), url, siteName: t('siteName'), locale: locale === 'ar' ? 'ar_EG' : 'en_US', type: 'website' },
  };
}
