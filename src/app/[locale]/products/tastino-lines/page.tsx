import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalogue/Breadcrumbs';
import { ProductCard } from '@/components/catalogue/ProductCard';
import { Link } from '@/i18n/navigation';
import { getTastinoLines } from '@/lib/content/catalogue';
import { pageMetadata } from '@/lib/metadata';
import '@/styles/catalogue.css';

export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'lines', '/products/tastino-lines');
}

const SECTION_KEY = { FRESHNESS: 'freshness', TRADITIONAL: 'traditional', THE_LEAF: 'theLeaf' } as const;

export default async function TastinoLinesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalogue');
  const sections = await getTastinoLines();

  return (
    <div className="cat page">
      <div className="wrap">
        <Breadcrumbs items={[{ label: t('crumbs.home'), href: '/' }, { label: t('crumbs.products'), href: '/products' }, { label: t('crumbs.lines') }]} />
        <div className="head">
          <div>
            <div className="eyebrow">{t('lines.eyebrow')}</div>
            <h1>{t('lines.title')}</h1>
          </div>
          <p>{t('lines.intro')}</p>
        </div>

        {sections.map(({ line, products }) => {
          const k = SECTION_KEY[line];
          return (
            <section key={line} className="line-sec" aria-labelledby={`line-${k}`}>
              <div className="sec-head">
                <div>
                  <h2 id={`line-${k}`}>{t(`lines.${k}.title`)}</h2>
                  <p className="tagline">{t(`lines.${k}.tagline`)}</p>
                </div>
                <p className="body">{t(`lines.${k}.body`)}</p>
              </div>
              <div className="grid">
                {products.map((p) => (
                  <ProductCard key={p.slug} product={p} locale={locale} />
                ))}
              </div>
            </section>
          );
        })}

        <div className="band">
          <h2>{t('brandPage.band', { name: t('lines.title') })}</h2>
          <div className="actions">
            <Link className="btn btn-primary" href="/distributors">
              {t('lines.cta')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
