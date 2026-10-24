import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalogue/Breadcrumbs';
import { CompanyCta } from '@/components/company/CompanyCta';
import { CompanyTabs } from '@/components/company/CompanyTabs';
import { PageHead } from '@/components/company/PageHead';
import { ProductFan } from '@/components/company/ProductFan';
import { Paragraphs } from '@/components/home/Paragraphs';
import { Link } from '@/i18n/navigation';
import { getInnovationPage } from '@/lib/content/company';
import { pageMetadata } from '@/lib/metadata';
import '@/styles/company.css';

export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'innovation', '/innovation');
}

export default async function InnovationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('company');
  const { blocks, fan } = await getInnovationPage(locale);
  const innovation = blocks.innovation;
  const brands = blocks['brand-excellence'];
  // The value statement ("quality at competitive prices") appears only as written in the official copy.

  return (
    <div className="co page">
      <div className="wrap">
        <Breadcrumbs items={[{ label: t('crumbs.home'), href: '/' }, { label: t('crumbs.innovation') }]} />
        <PageHead eyebrow={t('innovation.eyebrow')} title={innovation?.title ?? t('tabs.innovation')} />
        <CompanyTabs current="innovation" />

        {innovation && (
          <section id="innovation">
            <div className="blk">
              <ProductFan pictures={fan} />
              <div className="copy">
                <Paragraphs items={innovation.paragraphs} bigIndex={2} />
                <p>
                  <Link className="btn btn-ghost" href="/products">
                    {t('innovation.toProducts')} <span className="arr" aria-hidden="true">→</span>
                  </Link>
                </p>
              </div>
            </div>
          </section>
        )}

        {brands && (
          <section id="brand-excellence" className="flush">
            <div className="blk">
              <div>
                <div className="eyebrow">{t('innovation.brandEyebrow')}</div>
                <h2>{brands.title}</h2>
              </div>
              <div className="copy">
                <Paragraphs items={brands.paragraphs} bigIndex={0} />
                <p>
                  <Link className="btn btn-ghost" href="/brands">
                    {t('innovation.toBrands')} <span className="arr" aria-hidden="true">→</span>
                  </Link>
                </p>
              </div>
            </div>
          </section>
        )}

        <CompanyCta />
      </div>
    </div>
  );
}
