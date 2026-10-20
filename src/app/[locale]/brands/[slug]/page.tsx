import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BrandHero } from '@/components/catalogue/BrandHero';
import { Breadcrumbs } from '@/components/catalogue/Breadcrumbs';
import { EnquiryBand } from '@/components/catalogue/EnquiryBand';
import { ProductCard } from '@/components/catalogue/ProductCard';
import { Link } from '@/i18n/navigation';
import { uniqueSizes, whatsappWithText } from '@/lib/catalogue/format';
import { accentVars } from '@/lib/color';
import { findSlugRedirect, getBrandPage, getContactLinks, getStaticSlugs } from '@/lib/content/catalogue';
import { contentMetadata } from '@/lib/metadata';
import { toPictureData } from '@/lib/media/picture';
import { slugRedirectPath } from '@/lib/slug';
import { pick } from '@/lib/text';
import { routing } from '@/i18n/routing';
import type { CSSProperties } from 'react';
import '@/styles/catalogue.css';

export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const { brands } = await getStaticSlugs();
  return routing.locales.flatMap((locale) => brands.map((slug) => ({ locale, slug })));
}

/** Old or differently-cased slugs go to the real page with a permanent redirect; unknown slugs are a 404. */
async function resolve(locale: string, slug: string) {
  const page = await getBrandPage(slug);
  if (page) return page;
  const lower = slug.toLowerCase();
  // Differently-cased slug: redirect only if the lowercase brand really exists. Otherwise look for a renamed brand.
  const target = lower !== slug ? ((await getBrandPage(lower)) ? lower : null) : await findSlugRedirect('BRAND', slug);
  const path = target && target !== slug ? slugRedirectPath(locale, 'brands', target) : null;
  if (path) permanentRedirect(path);
  notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getBrandPage(slug.toLowerCase());
  if (!page) return {};
  const t = await getTranslations({ locale, namespace: 'catalogue' });
  const name = pick(locale, page.brand.nameEn, page.brand.nameAr);
  const category = pick(locale, page.brand.categoryEn ?? '', page.brand.categoryAr ?? '');
  return contentMetadata(locale, `/brands/${page.brand.slug}`, `${name} — ${category}`, t('brandPage.intro', { name, category }));
}

export default async function BrandPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { brand, products, others } = await resolve(locale, slug);
  const t = await getTranslations('catalogue');
  const contact = await getContactLinks();

  const name = pick(locale, brand.nameEn, brand.nameAr);
  const category = pick(locale, brand.categoryEn ?? '', brand.categoryAr ?? '');
  const intro = pick(locale, brand.descriptionEn, brand.descriptionAr)?.trim() || t('brandPage.intro', { name, category });
  const comingSoon = brand.visibility === 'COMING_SOON';

  const shots = products.filter((p) => p.image).slice(0, 3);
  const heroPictures = shots.flatMap((p) => {
    const pic = toPictureData(p.image, locale, name);
    return pic ? [pic] : [];
  });
  const fallback = toPictureData(brand.image, locale, name);
  const pictures = heroPictures.length > 0 ? heroPictures : fallback ? [fallback] : [];

  const packs = new Set(products.flatMap((p) => p.variants.map((v) => v.packType).filter(Boolean)));
  const sizes = [...new Set(products.flatMap((p) => uniqueSizes(p.variants)))];
  const style = { ...accentVars(brand.accentColor), '--c': brand.accentColor } as CSSProperties;
  const wa = whatsappWithText(contact.whatsapp, t('brandPage.waText', { name }));

  return (
    <div className="cat page" style={style}>
      <div className="wrap">
        <Breadcrumbs items={[{ label: t('crumbs.home'), href: '/' }, { label: t('crumbs.brands'), href: '/brands' }, { label: name }]} />
        <BrandHero
          name={name}
          category={category}
          intro={intro}
          slug={brand.slug}
          productCount={comingSoon ? null : products.length}
          packCount={packs.size}
          pictures={pictures}
        />

        <section id="range" aria-labelledby="range-h">
          {comingSoon ? (
            <div className="soon-box">
              <b>{t('brandPage.soonTitle')}</b>
              <span className="muted">{t('brandPage.soonBody', { name })}</span>
            </div>
          ) : products.length === 0 ? (
            <div className="soon-box">
              <b>{t('brandPage.rangeSoon')}</b>
            </div>
          ) : (
            <>
              <div className="range-head">
                <div>
                  <div className="eyebrow">{t('brandPage.rangeEyebrow')}</div>
                  <h2 id="range-h">{t('brandPage.rangeTitle')}</h2>
                </div>
                {sizes.length > 0 && (
                  <ul className="chips" dir="ltr">
                    {sizes.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid">
                {products.map((p) => (
                  <ProductCard key={p.slug} product={p} locale={locale} />
                ))}
              </div>
            </>
          )}
        </section>

        <div className="facts">
          <div className="fact"><small>{t('brandPage.madeBy')}</small><b>{t('brandPage.madeByValue')}</b></div>
          <div className="fact">
            <small>{t('brandPage.packaging')}</small>
            <b>{[...packs].map((pk) => t(`packs.${String(pk).toLowerCase()}`)).join(' · ') || '—'}</b>
          </div>
          <div className="fact"><small>{t('brandPage.channels')}</small><b>{t('brandPage.channelsValue')}</b></div>
        </div>

        {others.length > 0 && (
          <div style={{ marginTop: 60 }}>
            <div className="eyebrow">{t('brandPage.others')}</div>
            <ul className="others">
              {others.map((o) => (
                <li key={o.slug} style={{ '--c': o.accentColor } as CSSProperties}>
                  <Link href={`/brands/${o.slug}`}>{pick(locale, o.nameEn, o.nameAr)}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <EnquiryBand title={t('brandPage.band', { name })} whatsappHref={wa} formHref={`/distributors?brand=${brand.slug}`} />
      </div>
    </div>
  );
}
