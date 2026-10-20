import type { CSSProperties, ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs, type Crumb } from '@/components/catalogue/Breadcrumbs';
import { LINE_ACCENT, ProductCard } from '@/components/catalogue/ProductCard';
import { VariantTable } from '@/components/catalogue/VariantTable';
import { Picture } from '@/components/ui/Picture';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { isLiquid, uniqueSizes, whatsappWithText } from '@/lib/catalogue/format';
import { accentVars, safeAccent } from '@/lib/color';
import { findSlugRedirect, getContactLinks, getProductPage, getStaticSlugs } from '@/lib/content/catalogue';
import { contentMetadata } from '@/lib/metadata';
import { toPictureData } from '@/lib/media/picture';
import { slugRedirectPath } from '@/lib/slug';
import { pick } from '@/lib/text';
import '@/styles/catalogue.css';

export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const { products } = await getStaticSlugs();
  return routing.locales.flatMap((locale) => products.map((slug) => ({ locale, slug })));
}

/** Old or differently-cased slugs go to the real page with a permanent redirect; drafts and unknown slugs are a 404. */
async function resolve(locale: string, slug: string) {
  const page = await getProductPage(slug);
  if (page) return page;
  const lower = slug.toLowerCase();
  // Differently-cased slug: redirect only if the lowercase product really exists. Otherwise look for a renamed product.
  const target = lower !== slug ? ((await getProductPage(lower)) ? lower : null) : await findSlugRedirect('PRODUCT', slug);
  const path = target && target !== slug ? slugRedirectPath(locale, 'products', target) : null;
  if (path) permanentRedirect(path);
  notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getProductPage(slug.toLowerCase());
  if (!page) return {};
  const p = page.product;
  const name = pick(locale, p.nameEn, p.nameAr);
  const t = await getTranslations({ locale, namespace: 'catalogue' });
  const brand = p.brand ? pick(locale, p.brand.nameEn, p.brand.nameAr) : t('tastino');
  const description = pick(locale, p.descriptionEn, p.descriptionAr)?.trim() || `${name} — ${brand}`;
  return contentMetadata(locale, `/products/${p.slug}`, `${name} — ${brand}`, description);
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { product: p, related } = await resolve(locale, slug);
  const t = await getTranslations('catalogue');
  const contact = await getContactLinks();

  const name = pick(locale, p.nameEn, p.nameAr);
  const brandName = p.brand ? pick(locale, p.brand.nameEn, p.brand.nameAr) : t('tastino');
  const accent = p.brand ? safeAccent(p.brand.accentColor) : LINE_ACCENT;
  const style = { ...accentVars(accent), '--c': accent } as CSSProperties;
  const picture = toPictureData(p.image, locale, name);
  const sizes = uniqueSizes(p.variants);
  const liquid = p.variants.some(isLiquid);
  const packs = [...new Set(p.variants.map((v) => v.packType).filter((v): v is NonNullable<typeof v> => !!v))];

  const description = pick(locale, p.descriptionEn, p.descriptionAr)?.trim();
  const ingredients = pick(locale, p.ingredientsEn, p.ingredientsAr)?.trim();
  const shelfLife = pick(locale, p.shelfLifeEn, p.shelfLifeAr)?.trim();
  const storage = pick(locale, p.storageEn, p.storageAr)?.trim();
  const category = pick(locale, p.category.nameEn, p.category.nameAr);

  const brandHref = p.brand ? `/brands/${p.brand.slug}` : '/products/tastino-lines';
  const wa = whatsappWithText(contact.whatsapp, t('product.waText', { name: `${brandName} ${name}`, sizes: sizes.join(', ') || t('sizesOnRequest') }));

  // Rows with no data are left out rather than shown blank.
  type Row = { label: string; value: ReactNode };
  const candidates: (Row | null)[] = [
    { label: p.brand ? t('product.brand') : t('product.line'), value: <Link href={brandHref}>{brandName}</Link> },
    { label: t('product.category'), value: category },
    packs.length ? { label: t('product.packaging'), value: packs.map((pk) => t(`packs.${pk.toLowerCase()}`)).join(' · ') } : null,
    sizes.length ? { label: liquid ? t('product.netVolume') : t('product.netWeight'), value: <bdi dir="ltr">{sizes.join(' · ')}</bdi> } : null,
    shelfLife ? { label: t('product.shelfLife'), value: shelfLife } : null,
    storage ? { label: t('product.storage'), value: storage } : null,
  ];
  const rows = candidates.filter((r): r is Row => r !== null);

  const crumbs: Crumb[] = [
    { label: t('crumbs.home'), href: '/' },
    { label: t('crumbs.products'), href: '/products' },
    { label: brandName, href: brandHref },
    { label: name },
  ];

  return (
    <div className="cat page" style={style}>
      <div className="wrap">
        <Breadcrumbs items={crumbs} />
        <div className="pd">
          <div className="pstage">
            <div className="ring" aria-hidden="true" />
            <div className="blob" aria-hidden="true" />
            {picture ? (
              <Picture image={picture} sizes="(max-width: 960px) 80vw, 460px" placeholder={t('imageSoon')} priority />
            ) : (
              <div className="none">
                <b aria-hidden="true">{brandName.charAt(0)}</b>
                <span>{t('imageSoon')}</span>
              </div>
            )}
            {(packs.length > 0 || sizes.length > 0) && (
              <div className="badge">{[packs.map((pk) => t(`packs.${pk.toLowerCase()}`)).join(' · '), sizes.join(' · ')].filter(Boolean).join(' · ')}</div>
            )}
          </div>

          <div className="info">
            <Link className="tag" href={brandHref}>{brandName}</Link>
            <h1>{name}</h1>
            {description && <p className="lead">{description}</p>}

            <div className="sizes">
              <h2 className="small">{t('product.sizes')}</h2>
              {sizes.length > 0 ? (
                <ul className="chips" dir="ltr">
                  {sizes.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{t('sizesOnRequest')}</p>
              )}
            </div>

            <div className="acts">
              <Link className="btn btn-primary" href={`/distributors?product=${p.slug}`}>
                <span>{t('product.enquire')}</span> <span className="arr" aria-hidden="true">→</span>
              </Link>
              {wa && (
                <a className="btn btn-wa" href={wa} target="_blank" rel="noopener noreferrer">
                  {t('product.whatsapp')}
                </a>
              )}
            </div>

            <section className="spec" aria-labelledby="spec-h">
              <h2 id="spec-h">{t('product.specs')}</h2>
              <table>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row">{r.label}</th>
                      <td>{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {p.variants.length > 0 && (
                <div className="variants">
                  <h2>{t('product.variantsTitle')}</h2>
                  <VariantTable variants={p.variants} />
                </div>
              )}
              {ingredients && (
                <div className="ingr">
                  <b>{t('product.ingredients')}:</b> {ingredients}
                </div>
              )}
            </section>
          </div>
        </div>

        {related.length > 0 && (
          <section className="rel" aria-labelledby="rel-h">
            <div className="eyebrow">{t('product.moreFrom', { name: brandName })}</div>
            <h2 id="rel-h">{t('product.related')}</h2>
            <div className="grid">
              {related.map((r) => (
                <ProductCard key={r.slug} product={r} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
