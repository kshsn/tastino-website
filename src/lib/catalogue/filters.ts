import { TASTINO_FILTER } from './format';

export const PACK_KEYS = ['glass', 'pet', 'can', 'tin'] as const;
export type PackKey = (typeof PACK_KEYS)[number];

/** Database enum value for a filter key. */
export const PACK_ENUM = { glass: 'GLASS', pet: 'PET', can: 'CAN', tin: 'TIN' } as const;

export interface Filters {
  brand: string | null;
  cat: string | null;
  pack: PackKey | null;
  q: string;
}

export const NO_FILTERS: Filters = { brand: null, cat: null, pack: null, q: '' };

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? '';

/**
 * Reads filters from URL query parameters. Anything unknown or empty is ignored, so a bad link
 * simply shows the full list (US-004.3).
 */
export function parseFilters(params: RawParams, known: { brands: string[]; cats: string[] }): Filters {
  const brand = first(params.brand).toLowerCase();
  const cat = first(params.cat).toLowerCase();
  const pack = first(params.pack).toLowerCase();
  return {
    brand: known.brands.includes(brand) ? brand : null,
    cat: known.cats.includes(cat) ? cat : null,
    pack: (PACK_KEYS as readonly string[]).includes(pack) ? (pack as PackKey) : null,
    q: first(params.q).slice(0, 80),
  };
}

export const hasFilters = (f: Filters) => !!(f.brand || f.cat || f.pack || f.q);

/** "?brand=tama&pack=pet" for the active filters (empty string when none). `override` changes or clears one filter. */
export function toQuery(f: Filters, override: Partial<Record<keyof Filters, string | null>> = {}): string {
  const merged = { ...f, ...override } as Record<keyof Filters, string | null>;
  const qs = new URLSearchParams();
  for (const key of ['brand', 'cat', 'pack', 'q'] as const) {
    const v = merged[key];
    if (v) qs.set(key, v);
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export interface Filterable {
  nameEn: string;
  nameAr: string;
  brand: { slug: string; nameEn: string; nameAr: string } | null;
  category: { slug: string };
  variants: { packType: string | null }[];
}

/** Applies the filters. Products without a brand match the "tastino" brand filter. */
export function filterProducts<T extends Filterable>(products: T[], f: Filters): T[] {
  const q = f.q.toLowerCase();
  return products.filter((p) => {
    if (f.brand && (p.brand?.slug ?? TASTINO_FILTER) !== f.brand) return false;
    if (f.cat && p.category.slug !== f.cat) return false;
    if (f.pack && !p.variants.some((v) => v.packType === PACK_ENUM[f.pack!])) return false;
    if (q) {
      const hay = [p.nameEn, p.nameAr, p.brand?.nameEn, p.brand?.nameAr].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
