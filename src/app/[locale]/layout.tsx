import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Cairo, Plus_Jakarta_Sans } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { env } from '@/env';
import { dirOf, routing } from '@/i18n/routing';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '700', '800'], variable: '--font-jakarta', display: 'swap' });
const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '600', '800'], variable: '--font-cairo', display: 'swap' });

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

  return (
    <html lang={locale} dir={dirOf(locale)} className={`${jakarta.variable} ${cairo.variable}`}>
      <body className="min-h-screen overflow-x-hidden antialiased">
        <NextIntlClientProvider>
          <MotionProvider>
            <SiteHeader />
            <main id="main">{children}</main>
            <SiteFooter />
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
