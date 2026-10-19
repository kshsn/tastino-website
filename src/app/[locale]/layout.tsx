import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Cairo, Plus_Jakarta_Sans } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { env } from '@/env';
import { dirOf, routing } from '@/i18n/routing';

// Variable fonts: one file covers every weight. Cairo is not preloaded, so English pages never download it;
// Arabic pages fetch it as soon as the CSS is parsed (swap, with a size-adjusted fallback to avoid layout shift).
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap', preload: false });

// Only these message groups are used by client components, so only they are sent to the browser.
const CLIENT_MESSAGES = ['header', 'nav', 'error'] as const;

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  icons: { icon: '/brand/tastino-logo.svg' },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const all = await getMessages();
  const messages = Object.fromEntries(CLIENT_MESSAGES.map((k) => [k, all[k]]));

  return (
    <html lang={locale} dir={dirOf(locale)} className={`${jakarta.variable} ${cairo.variable}`}>
      <body className="min-h-screen overflow-x-hidden antialiased">
        <NextIntlClientProvider messages={messages}>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
