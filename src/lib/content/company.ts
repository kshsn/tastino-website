import { cache } from 'react';
import { toPictureData } from '@/lib/media/picture';
import type { PictureData } from '@/lib/media/types';
import { displayPhone, telLink } from '@/lib/phone';
import { pick } from '@/lib/text';
import { loadBlocks } from './blocks';
import { getPublicSettings, getPublishedProducts } from './public';

export type LegalKind = 'privacy' | 'terms';

type Products = Awaited<ReturnType<typeof getPublishedProducts>>;

/** Packshots for the given product slugs, in that order; products without a public image are skipped. */
function picturesFor(products: Products, slugs: readonly string[], locale: string): PictureData[] {
  return slugs.flatMap((slug) => {
    const p = products.find((x) => x.slug === slug);
    const pic = p ? toPictureData(p.image, locale, pick(locale, p.nameEn, p.nameAr)) : null;
    return pic ? [pic] : [];
  });
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');

const SIMPLE_EMAIL = /^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/;

/** Address, phone and email from the public settings; anything not set is simply absent. */
function contactFrom(settings: Awaited<ReturnType<typeof getPublicSettings>>, locale: string) {
  const phone = str(settings['contact.phone']);
  return {
    address: str(pick(locale, settings['contact.addressEn'], settings['contact.addressAr'])),
    phoneDisplay: phone ? displayPhone(phone) : '',
    tel: telLink(phone),
    // Only a plain address becomes a mailto: link; anything with spaces, "?" or "&" (extra mail fields) is dropped.
    email: SIMPLE_EMAIL.test(str(settings['contact.email'])) ? str(settings['contact.email']) : '',
  };
}

/** About: official story copy, three packshots for the collage, and contact facts from settings. */
export const getAboutPage = cache(async (locale: string) => {
  const [blocks, settings, products] = await Promise.all([
    loadBlocks(['about', 'tagline'] as const, locale),
    getPublicSettings(),
    getPublishedProducts(),
  ]);
  return {
    blocks,
    collage: picturesFor(products, ['tama-mango-nectar', 'liora-tomato-paste', 'freshness-vanilla-syrup'], locale),
    contact: contactFrom(settings, locale),
  };
});

/** Quality: the official "Food Safety Comes First" copy. Certificates arrive in R2, so none are shown yet. */
export const getQualityPage = cache(async (locale: string) => ({
  blocks: await loadBlocks(['food-safety'] as const, locale),
}));

/** Innovation: "Innovation in Every Taste" and "Brand Excellence" copy plus three packshots. */
export const getInnovationPage = cache(async (locale: string) => {
  const [blocks, products] = await Promise.all([
    loadBlocks(['innovation', 'brand-excellence'] as const, locale),
    getPublishedProducts(),
  ]);
  return { blocks, fan: picturesFor(products, ['andiamo-mustard-sauce', 'andiamo-tomato-ketchup', 'andiamo-barbecue-sauce'], locale) };
});

/** Privacy or Terms: the text, its version date, and whether the client's legal adviser has approved it. */
export const getLegalPage = cache(async (kind: LegalKind, locale: string) => {
  const [blocks, settings] = await Promise.all([loadBlocks([kind] as const, locale), getPublicSettings()]);
  return {
    block: blocks[kind] ?? null,
    updated: str(settings[`legal.${kind}.updated`]),
    approved: str(settings[`legal.${kind}.approved`]) !== '',
  };
});
