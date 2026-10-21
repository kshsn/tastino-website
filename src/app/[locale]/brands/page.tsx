import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BrandCard } from '@/components/catalogue/BrandCard';
import { Breadcrumbs } from '@/components/catalogue/Breadcrumbs';
import { Link } from '@/i18n/navigation';
import { getBrandsIndex } from '@/lib/content/catalogue';
import { pageMetadata } from '@/lib/metadata';
import { toPictureData } from '@/lib/media/picture';
import { pick } from '@/lib/text';
import '@/styles/catalogue.css';

export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'brands', '/brands');
}

export default async function BrandsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalogue');
  const { brands, lineProductCount } = await getBrandsIndex();

  return (
    <div className="cat page">
      <div className="wrap">
        <Breadcrumbs items={[{ label: t('crumbs.home'), href: '/' }, { label: t('crumbs.brands') }]} />
        <div className="head">
          <div>
            <div className="eyebrow">{t('brandsIndex.eyebrow')}</div>
            <h1>{t('brandsIndex.title')}</h1>
          </div>
          <p>{t('brandsIndex.intro')}</p>
        </div>

        {brands.length === 0 ? (
          <div className="empty">
            <b>{t('brandsIndex.empty')}</b>
            <span className="muted">{t('brandsIndex.emptyBody')}</span>
            <br />
            <Link className="btn btn-ghost" href="/distributors">
              {t('brandsIndex.contact')}
            </Link>
          </div>
        ) : (
          <div className="brands">
            {brands.map((b) => {
              const name = pick(locale, b.nameEn, b.nameAr);
              const category = pick(locale, b.categoryEn ?? '', b.categoryAr ?? '');
              return (
                <BrandCard
                  key={b.slug}
                  slug={b.slug}
                  name={name}
                  category={category}
                  accent={b.accentColor}
                  picture={toPictureData(b.image, locale, `${name} ${category}`.trim())}
                  productCount={b.visibility === 'COMING_SOON' ? null : b.productCount}
                />
              );
            })}
          </div>
        )}

        {lineProductCount > 0 && (
          <section className="lines-box" aria-labelledby="lines-h">
            <div>
              <div className="eyebrow">{t('brandsIndex.linesEyebrow')}</div>
              <h2 id="lines-h">{t('brandsIndex.linesTitle')}</h2>
              <p>{t('brandsIndex.linesBody')}</p>
            </div>
            <Link className="btn" href="/products/tastino-lines">
              {t('brandsIndex.linesCta')} <span className="arr" aria-hidden="true">→</span>
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
