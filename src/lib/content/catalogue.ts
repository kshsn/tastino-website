import type { SlugKind } from '@prisma/client';
import { cache } from 'react';
import { safeAccent } from '@/lib/color';
import { db } from '@/lib/db';
import { TASTINO_FILTER } from '@/lib/catalogue/format';
import { waLink } from '@/lib/phone';
import { getPublicSettings, getPublishedBrands, getPublishedProducts } from './public';

export type CatalogueProduct = Awaited<ReturnType<typeof getPublishedProducts>>[number];
export type CatalogueBrand = Awaited<ReturnType<typeof getPublishedBrands>>[number];

export const PRODUCT_LINES = ['FRESHNESS', 'TRADITIONAL', 'THE_LEAF'] as const;
export type ProductLineKey = (typeof PRODUCT_LINES)[number];

/** Slug used by the Tastino lines page; a product can never take it. */
export const TASTINO_LINES_SLUG = 'tastino-lines';

/** Brands shown on the index: live ones and coming-soon ones (hidden and draft brands never). */
export const getBrandsIndex = cache(async () => {
  const [brands, products] = await Promise.all([getPublishedBrands(), getPublishedProducts()]);
  const counts = new Map<string, number>();
  for (const p of products) if (p.brand) counts.set(p.brand.slug, (counts.get(p.brand.slug) ?? 0) + 1);
  return {
    brands: brands.map((b) => ({ ...b, accentColor: safeAccent(b.accentColor), productCount: counts.get(b.slug) ?? 0 })),
    lineProductCount: products.filter((p) => !p.brand).length,
  };
});

/** One brand with its products. A coming-soon brand has no products on show. Null for unknown, draft or hidden brands. */
export const getBrandPage = cache(async (slug: string) => {
  const brands = await getPublishedBrands();
  const brand = brands.find((b) => b.slug === slug);
  if (!brand) return null;
  const products = brand.visibility === 'LIVE' ? await getPublishedProducts({ brand: slug }) : [];
  return {
    brand: { ...brand, accentColor: safeAccent(brand.accentColor) },
    products,
    others: brands.filter((b) => b.slug !== slug).map((b) => ({ slug: b.slug, nameEn: b.nameEn, nameAr: b.nameAr, accentColor: safeAccent(b.accentColor) })),
  };
});

/** Everything the listing page filters in memory (a few hundred products at most), plus the filter options. */
export const getListingData = cache(async () => {
  const [products, brands] = await Promise.all([getPublishedProducts(), getPublishedBrands()]);
  const live = brands.filter((b) => b.visibility === 'LIVE');
  const hasLines = products.some((p) => !p.brand);
  const cats = new Map<string, { slug: string; nameEn: string; nameAr: string }>();
  const packs = new Set<string>();
  for (const p of products) {
    cats.set(p.category.slug, p.category);
    for (const v of p.variants) if (v.packType) packs.add(v.packType);
  }
  return {
    products,
    brandOptions: [
      ...live.map((b) => ({ slug: b.slug, nameEn: b.nameEn, nameAr: b.nameAr })),
      ...(hasLines ? [{ slug: TASTINO_FILTER, nameEn: 'Tastino', nameAr: 'تستينو' }] : []),
    ],
    categoryOptions: [...cats.values()],
    packOptions: [...packs],
  };
});

/** One product, with up to four related products from the same brand or Tastino line. Null if not public. */
export const getProductPage = cache(async (slug: string) => {
  if (slug === TASTINO_LINES_SLUG) return null;
  const all = await getPublishedProducts();
  const product = all.find((p) => p.slug === slug);
  if (!product) return null;
  const sameGroup = (p: CatalogueProduct) => (product.brand ? p.brand?.slug === product.brand.slug : p.productLine === product.productLine);
  const related = all
    .filter((p) => p.slug !== slug && sameGroup(p))
    .sort((a, b) => Number(!!b.image) - Number(!!a.image))
    .slice(0, 4);
  return { product, related };
});

/** The three Tastino lines with their published products; empty lines are left out. */
export const getTastinoLines = cache(async () => {
  const products = await getPublishedProducts();
  return PRODUCT_LINES.map((line) => ({ line, products: products.filter((p) => p.productLine === line) })).filter((s) => s.products.length > 0);
});

/** Slugs for static generation. */
export async function getStaticSlugs() {
  const [brands, products] = await Promise.all([getPublishedBrands(), getPublishedProducts()]);
  return { brands: brands.map((b) => b.slug), products: products.map((p) => p.slug) };
}

/** Where an old (renamed) slug now lives, or null. Used for 301 redirects. */
export async function findSlugRedirect(kind: SlugKind, oldSlug: string): Promise<string | null> {
  const row = await db.slugRedirect.findUnique({ where: { kind_oldSlug: { kind, oldSlug } } });
  return row?.targetSlug ?? null;
}

/** Public contact links shared by the catalogue pages (null when the setting is empty). */
export async function getContactLinks() {
  const settings = await getPublicSettings();
  return { whatsapp: waLink(settings['contact.whatsapp']) };
}
