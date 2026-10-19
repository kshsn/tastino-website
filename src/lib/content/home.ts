import { safeAccent } from '@/lib/color';
import { db } from '@/lib/db';
import { toPictureData } from '@/lib/media/picture';
import type { PictureData } from '@/lib/media/types';
import { displayPhone, telLink, waLink } from '@/lib/phone';
import { paragraphs, pick } from '@/lib/text';
import { MIN_MARQUEE_ITEMS, pickMarquee } from './marquee';
import { getPageBlock, getPublicSettings, getPublishedBrands, getPublishedProducts } from './public';

/** Packaging formats Tastino fills (glass, PET, metal). A fact from the official copy, not a database count. */
export const PACKAGING_FORMATS = 3;

export const HOME_BLOCK_KEYS = ['tagline', 'about', 'brand-excellence', 'food-safety', 'innovation', 'portfolio', 'partnership'] as const;
export type HomeBlockKey = (typeof HOME_BLOCK_KEYS)[number];

export interface HomeSlide {
  id: string;
  accent: string;
  brand: string;
  label: string;
  picture: PictureData | null;
}

export interface HomeBlock {
  title: string;
  paragraphs: string[];
}

export interface HomeBrandCard {
  slug: string;
  name: string;
  category: string;
  accent: string;
  productCount: number;
  picture: PictureData | null;
}

export interface HomeProduct {
  slug: string;
  name: string;
  picture: PictureData | null;
}

export interface HomeData {
  slides: HomeSlide[];
  fallbackPicture: PictureData | null;
  stats: { brands: number; products: number; formats: number };
  blocks: Partial<Record<HomeBlockKey, HomeBlock>>;
  brandCards: HomeBrandCard[];
  tastinoLines: { productCount: number; picture: PictureData | null };
  marquee: HomeProduct[];
  bandPicture: PictureData | null;
  fan: PictureData[];
  shelf: HomeProduct[];
  contact: { whatsapp: string | null; tel: string | null; phoneDisplay: string };
}

/** A paragraph that is just the sales phone line; the CTA shows contact details in their own box instead. */
const isContactLine = (p: string) => /(?:^|\s)(?:00|\+)\d{9,}/.test(p);

const nonBlank =(v: string | null | undefined): v is string => typeof v === 'string' && v.trim().length > 0;

/**
 * Everything the homepage shows, resolved for one language. Only published content is read, and a text that
 * is missing in this language is left out (no cross-language fallback).
 */
export async function getHomeData(locale: string): Promise<HomeData> {
  const [brands, products, heroRows, blockRows, settings] = await Promise.all([
    getPublishedBrands(),
    getPublishedProducts(),
    db.heroSlide.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { sortOrder: 'asc' },
      take: 3,
      include: { image: { select: { width: true, height: true, altEn: true, altAr: true, derivatives: true } } },
    }),
    Promise.all(HOME_BLOCK_KEYS.map((key) => getPageBlock(key))),
    getPublicSettings(),
  ]);

  const liveBrands = brands.filter((b) => b.visibility === 'LIVE');

  const slides: HomeSlide[] = heroRows.flatMap((h) => {
    const label = pick(locale, h.headlineEn, h.headlineAr);
    const brand = pick(locale, h.sublineEn, h.sublineAr);
    if (!nonBlank(label) || !nonBlank(brand)) return [];
    return [{ id: h.id, accent: safeAccent(h.accentColor), brand, label, picture: toPictureData(h.image, locale, `${brand} ${label}`) }];
  });

  const blocks: HomeData['blocks'] = {};
  for (const row of blockRows) {
    if (!row) continue;
    const title = pick(locale, row.titleEn, row.titleAr);
    const all = paragraphs(pick(locale, row.bodyEn, row.bodyAr));
    const body = row.key === 'partnership' ? all.filter((p) => !isContactLine(p)) : all;
    if (nonBlank(title) && body.length > 0) blocks[row.key as HomeBlockKey] = { title, paragraphs: body };
  }

  const nameOf = (p: { nameEn: string; nameAr: string }) => pick(locale, p.nameEn, p.nameAr);
  const asProduct = (p: (typeof products)[number]): HomeProduct => ({
    slug: p.slug,
    name: nameOf(p),
    picture: toPictureData(p.image, locale, nameOf(p)),
  });

  const countByBrand = new Map<string, number>();
  for (const p of products) if (p.brand) countByBrand.set(p.brand.slug, (countByBrand.get(p.brand.slug) ?? 0) + 1);

  const brandCards: HomeBrandCard[] = liveBrands.flatMap((b) => {
    const name = pick(locale, b.nameEn, b.nameAr);
    const category = pick(locale, b.categoryEn, b.categoryAr);
    if (!nonBlank(name) || !nonBlank(category)) return [];
    return [{
      slug: b.slug,
      name,
      category,
      accent: safeAccent(b.accentColor),
      productCount: countByBrand.get(b.slug) ?? 0,
      picture: toPictureData(b.image, locale, `${name} ${category}`),
    }];
  });

  const lineProducts = products.filter((p) => !p.brand);
  const freshness = products.filter((p) => p.productLine === 'FRESHNESS' && p.image);
  const lineCover = freshness.find((p) => p.slug === 'freshness-caramel-syrup') ?? freshness[0];

  const marqueeAll = pickMarquee(
    products.map((p) => ({ ...asProduct(p), group: p.brand?.slug ?? `line:${p.productLine}`, hasImage: !!p.image })),
    12,
  );
  const marquee = marqueeAll.length >= MIN_MARQUEE_ITEMS ? marqueeAll.map(({ slug, name, picture }) => ({ slug, name, picture })) : [];

  const lora = liveBrands.find((b) => b.slug === 'lora') ?? liveBrands[0];
  const loraName = lora ? pick(locale, lora.nameEn, lora.nameAr) : '';

  const whatsappNumber = settings['contact.whatsapp'];
  const phone = settings['contact.phone'];

  return {
    slides,
    fallbackPicture: toPictureData(lora?.image, locale, loraName),
    stats: { brands: liveBrands.length, products: products.length, formats: PACKAGING_FORMATS },
    blocks,
    brandCards,
    tastinoLines: {
      productCount: lineProducts.length,
      picture: lineCover ? toPictureData(lineCover.image, locale, nameOf(lineCover)) : null,
    },
    marquee,
    bandPicture: toPictureData(lora?.image, locale, loraName),
    fan: freshness.slice(0, 3).flatMap((p) => {
      const pic = toPictureData(p.image, locale, nameOf(p));
      return pic ? [pic] : [];
    }),
    shelf: products
      .filter((p) => p.brand?.slug === 'andiamo' && p.category.slug === 'sauces' && p.image)
      .slice(0, 6)
      .map(asProduct),
    contact: { whatsapp: waLink(whatsappNumber), tel: telLink(phone), phoneDisplay: displayPhone(phone ?? whatsappNumber) },
  };
}
