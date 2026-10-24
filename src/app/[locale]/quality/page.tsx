import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalogue/Breadcrumbs';
import { CompanyCta } from '@/components/company/CompanyCta';
import { CompanyTabs } from '@/components/company/CompanyTabs';
import { PageHead } from '@/components/company/PageHead';
import { SafetyBand } from '@/components/company/SafetyBand';
import { getQualityPage } from '@/lib/content/company';
import { pageMetadata } from '@/lib/metadata';
import '@/styles/company.css';

export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'quality', '/quality');
}

export default async function QualityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('company');
  const { blocks } = await getQualityPage(locale);
  const safety = blocks['food-safety'];
  // No certificates exist yet (they arrive in R2), so there is no Certifications section and no certification
  // name anywhere on this page: nothing may be claimed that has no certificate behind it.

  return (
    <div className="co page">
      <div className="wrap">
        <Breadcrumbs items={[{ label: t('crumbs.home'), href: '/' }, { label: t('crumbs.quality') }]} />
        <PageHead eyebrow={t('quality.eyebrow')} title={safety?.title ?? t('tabs.safety')} />
        <CompanyTabs current="safety" />
        {safety && <SafetyBand title={safety.title} paragraphs={safety.paragraphs} />}
        <CompanyCta />
      </div>
    </div>
  );
}
