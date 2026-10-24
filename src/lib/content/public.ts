import type { MediaAsset, Prisma } from '@prisma/client';
import { db } from '@/lib/db';

// Public read functions: only published content, never private settings, never the "missing image" flag.

const PUBLISHED = { status: 'PUBLISHED' } as const;

export type PublicImage = Pick<MediaAsset, 'id' | 'width' | 'height' | 'altEn' | 'altAr' | 'derivatives'>;

/** The image to show publicly, or null for the "image coming soon" placeholder. */
export function publicImage(p: { image: PublicImage | null; imageNeedsReplacement?: boolean }): PublicImage | null {
  if (!p.image || p.imageNeedsReplacement) return null;
  return p.image;
}

const imageSelect = { select: { id: true, width: true, height: true, altEn: true, altAr: true, derivatives: true } } as const;

export function getPublishedBrands() {
  return db.brand.findMany({
    where: { ...PUBLISHED, visibility: { not: 'HIDDEN' } },
    orderBy: { sortOrder: 'asc' },
    include: { image: imageSelect },
  });
}

export interface ProductFilter {
  brand?: string;
  line?: 'FRESHNESS' | 'TRADITIONAL' | 'THE_LEAF';
  category?: string;
}

export async function getPublishedProducts(filter: ProductFilter = {}) {
  const where: Prisma.ProductWhereInput = {
    ...PUBLISHED,
    // A product is public only under a live, published brand (hidden and coming-soon brands show no products).
    OR: [{ brandId: null }, { brand: { ...PUBLISHED, visibility: 'LIVE' } }],
    ...(filter.brand ? { brand: { slug: filter.brand } } : {}),
    ...(filter.line ? { productLine: filter.line } : {}),
    ...(filter.category ? { category: { slug: filter.category } } : {}),
  };
  const rows = await db.product.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    include: {
      brand: { select: { slug: true, nameEn: true, nameAr: true, accentColor: true } },
      category: { select: { slug: true, nameEn: true, nameAr: true } },
      image: imageSelect,
      variants: { where: { shown: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
  return rows.map(({ imageNeedsReplacement, ...p }) => ({ ...p, image: publicImage({ image: p.image, imageNeedsReplacement }) }));
}

export async function getPublishedProduct(slug: string) {
  const p = await db.product.findFirst({
    where: { slug, ...PUBLISHED, OR: [{ brandId: null }, { brand: { ...PUBLISHED, visibility: 'LIVE' } }] },
    include: { brand: true, category: true, image: imageSelect, variants: { where: { shown: true }, orderBy: { sortOrder: 'asc' } } },
  });
  if (!p) return null;
  const { imageNeedsReplacement, ...rest } = p;
  return { ...rest, image: publicImage({ image: p.image, imageNeedsReplacement }) };
}

export function getPageBlock(key: string) {
  return db.pageBlock.findFirst({
    where: { key, ...PUBLISHED },
    select: { key: true, titleEn: true, titleAr: true, bodyEn: true, bodyAr: true },
  });
}

/** Keys that may ever be shown publicly; anything else (SMTP, recipients, API keys) stays server-side. */
export const PUBLIC_SETTING_KEYS = ['contact.email', 'contact.phone', 'contact.whatsapp', 'contact.addressEn', 'contact.addressAr', 'social', 'leads.responseTimeEn', 'leads.responseTimeAr', 'legal.privacy.updated', 'legal.privacy.approved', 'legal.terms.updated', 'legal.terms.approved'] as const;

/** Public settings: allowlisted keys only, and never a row marked private. */
export async function getPublicSettings(): Promise<Record<string, Prisma.JsonValue>> {
  const rows = await db.setting.findMany({ where: { isPrivate: false, key: { in: [...PUBLIC_SETTING_KEYS] } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Admin only (callers must check the role): products that show the placeholder publicly. */
export function listProductsMissingImage() {
  return db.product.findMany({
    where: { OR: [{ imageId: null }, { imageNeedsReplacement: true }] },
    select: { id: true, slug: true, nameEn: true, imageNeedsReplacement: true },
    orderBy: { slug: 'asc' },
  });
}
