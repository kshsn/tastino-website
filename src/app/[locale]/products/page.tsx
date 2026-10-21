import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalogue/Breadcrumbs';
import { FilterBar } from '@/components/catalogue/FilterBar';
import { ProductCard } from '@/components/catalogue/ProductCard';
import { Link } from '@/i18n/navigation';
import { PACK_ENUM, PACK_KEYS, filterProducts, hasFilters, parseFilters } from '@/lib/catalogue/filters';
import { getListingData } from '@/lib/content/catalogue';
import { alternates } from '@/lib/metadata';
import '@/styles/catalogue.css';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  // Filtered views all point to the clean URL as canonical, so they are never indexed as duplicates.
  return { title: t('products.title'), description: t('products.description'), alternates: alternates(locale, '/products') };
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalogue');
  const data = await getListingData();

  const filters = parseFilters(await searchParams, {
    brands: data.brandOptions.map((b) => b.slug),
    cats: data.categoryOptions.map((c) => c.slug),
  });
  const list = filterProducts(data.products, filters);
  const packs = PACK_KEYS.filter((k) => data.packOptions.includes(PACK_ENUM[k]));

  return (
    <div className="cat page">
      <div className="wrap">
        <Breadcrumbs items={[{ label: t('crumbs.home'), href: '/' }, { label: t('crumbs.products') }]} />
        <div className="head">
          <div>
            <div className="eyebrow">{t('listing.eyebrow')}</div>
            <h1>{t('listing.title')}</h1>
          </div>
          <p>{t('listing.intro')}</p>
        </div>
      </div>

      <FilterBar locale={locale} filters={filters} brands={data.brandOptions} categories={data.categoryOptions} packs={packs} count={list.length} />

      <div className="wrap">
        <h2 className="sr-only">{t('crumbs.products')}</h2>
        {list.length > 0 ? (
          <div className="grid">
            {list.map((p) => (
              <ProductCard key={p.slug} product={p} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <b>{t('listing.empty')}</b>
            <span className="muted">{t('listing.emptyBody')}</span>
            <br />
            {hasFilters(filters) && (
              <Link className="btn btn-ghost" href="/products">
                {t('listing.clear')}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
