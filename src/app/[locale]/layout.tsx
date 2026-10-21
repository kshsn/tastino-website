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

// Variable fonts: one file covers every weight.
// - Cairo (Arabic letters only, 30 KB) is preloaded: Arabic text must not reflow when the font arrives, because the
//   system Arabic fallback has very different metrics (it caused layout shift on the product list).
// - Plus Jakarta Sans (Latin) is not preloaded, so the hero image and scripts get the bandwidth first. Its fallback is
//   size-adjusted, so the swap does not move anything. Latin letters in Arabic pages also use it.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap', preload: false });
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo', display: 'swap' });

// Only these message groups are used by client components, so only they are sent to the browser.
const CLIENT_MESSAGES = ['header', 'nav', 'error', 'notFound'] as const;

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
