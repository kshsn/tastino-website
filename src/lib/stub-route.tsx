import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { StubPage } from '@/components/layout/StubPage';
import { pageMetadata } from '@/lib/metadata';

interface Params {
  params: Promise<{ locale: string }>;
}

/** Builds the page + metadata exports for a placeholder route. */
export function stubRoute(pageKey: string, path: string) {
  async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, pageKey, path);
  }
  async function Page({ params }: Params) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <StubPage pageKey={pageKey} />;
  }
  return { generateMetadata, Page };
}
