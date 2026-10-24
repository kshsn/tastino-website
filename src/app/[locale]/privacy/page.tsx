import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalogue/Breadcrumbs';
import { LegalPage } from '@/components/company/LegalPage';
import { getLegalPage } from '@/lib/content/company';
import { pageMetadata } from '@/lib/metadata';
import '@/styles/company.css';

export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'privacy', '/privacy');
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('company');
  const { block, updated, approved } = await getLegalPage('privacy', locale);
  if (!block) notFound(); // no published text in this language: never show another language instead

  return (
    <div className="co page">
      <div className="wrap">
        <Breadcrumbs items={[{ label: t('crumbs.home'), href: '/' }, { label: t('crumbs.privacy') }]} />
        <LegalPage locale={locale} block={block} updated={updated} approved={approved} />
      </div>
    </div>
  );
}
