import { describe, expect, it } from 'vitest';
import { formatSize, isLiquid, uniqueSizes, whatsappWithText } from '@/lib/catalogue/format';
import { isSlug, slugRedirectPath } from '@/lib/slug';
import { NO_FILTERS, filterProducts, hasFilters, parseFilters, toQuery, type Filterable } from '@/lib/catalogue/filters';

describe('formatSize', () => {
  it.each([
    [{ sizeValue: 400, unit: 'G' as const }, '400g'],
    [{ sizeValue: '1.00', unit: 'KG' as const }, '1kg'],
    [{ sizeValue: { toString: () => '250.00' }, unit: 'ML' as const }, '250ml'],
    [{ sizeValue: 1, unit: 'L' as const }, '1L'],
    [{ sizeValue: '0.5', unit: 'L' as const }, '0.5L'],
  ])('formats %j as %s', (v, out) => {
    expect(formatSize(v)).toBe(out);
  });
});

describe('isLiquid', () => {
  it('is true for ml and L and false for g and kg', () => {
    expect([isLiquid({ unit: 'ML' }), isLiquid({ unit: 'L' }), isLiquid({ unit: 'G' }), isLiquid({ unit: 'KG' })]).toEqual([true, true, false, false]);
  });
});

describe('uniqueSizes', () => {
  it('lists each size once in stored order', () => {
    expect(uniqueSizes([{ sizeValue: 400, unit: 'G' }, { sizeValue: 650, unit: 'G' }, { sizeValue: 400, unit: 'G' }])).toEqual(['400g', '650g']);
  });
});

describe('whatsappWithText', () => {
  it('URL-encodes the text, including Arabic', () => {
    const url = whatsappWithText('https://wa.me/201100111887', 'مرحباً Lora 400g')!;
    expect(decodeURIComponent(url.split('?text=')[1])).toBe('مرحباً Lora 400g');
  });
  it('contains no raw spaces or Arabic characters', () => {
    expect(whatsappWithText('https://wa.me/201100111887', 'نكتار مانجو')).toMatch(/^[\x21-\x7e]+$/);
  });
  it('returns null without a base link', () => {
    expect(whatsappWithText(null, 'x')).toBeNull();
  });
});

const KNOWN = { brands: ['lora', 'tama', 'tastino'], cats: ['jams', 'juices'] };

describe('parseFilters (US-004.3)', () => {
  it('reads valid values from the query', () => {
    expect(parseFilters({ brand: 'tama', pack: 'pet', cat: 'juices', q: ' mango ' }, KNOWN)).toEqual({ brand: 'tama', cat: 'juices', pack: 'pet', q: 'mango' });
  });
  it('ignores unknown or empty values so the full list shows', () => {
    expect(parseFilters({ brand: 'nope', cat: '', pack: 'plastic' }, KNOWN)).toEqual(NO_FILTERS);
  });
  it('is case-insensitive for keys it knows', () => {
    expect(parseFilters({ brand: 'TAMA', pack: 'PET' }, KNOWN)).toMatchObject({ brand: 'tama', pack: 'pet' });
  });
  it('takes the first value when a parameter is repeated', () => {
    expect(parseFilters({ brand: ['lora', 'tama'] }, KNOWN).brand).toBe('lora');
  });
  it('limits the search text to 80 characters', () => {
    expect(parseFilters({ q: 'x'.repeat(200) }, KNOWN).q).toHaveLength(80);
  });
});

describe('toQuery', () => {
  it('builds a reloadable query string', () => {
    expect(toQuery({ ...NO_FILTERS, brand: 'tama', pack: 'pet' })).toBe('?brand=tama&pack=pet');
  });
  it('is empty with no filters', () => {
    expect(toQuery(NO_FILTERS)).toBe('');
  });
  it('can clear one filter', () => {
    expect(toQuery({ ...NO_FILTERS, brand: 'tama', pack: 'pet' }, { pack: null })).toBe('?brand=tama');
  });
  it('encodes the search text', () => {
    expect(toQuery({ ...NO_FILTERS, q: 'a&b' })).toBe('?q=a%26b');
  });
});

const p = (over: Partial<Filterable>): Filterable => ({
  nameEn: 'Mango Nectar',
  nameAr: 'نكتار مانجو',
  brand: { slug: 'tama', nameEn: 'TAMA', nameAr: 'TAMA' },
  category: { slug: 'juices' },
  variants: [{ packType: 'GLASS' }],
  ...over,
});

describe('filterProducts', () => {
  const items = [
    p({}),
    p({ nameEn: 'Lemon Nectar', nameAr: 'نكتار ليمون', variants: [{ packType: 'PET' }] }),
    p({ nameEn: 'Strawberry Jam', nameAr: 'مربى الفراولة', brand: { slug: 'lora', nameEn: 'Lora', nameAr: 'Lora' }, category: { slug: 'jams' } }),
    p({ nameEn: 'Vanilla Syrup', nameAr: 'شراب الفانيليا', brand: null, category: { slug: 'syrups' } }),
  ];
  it('returns everything with no filters', () => {
    expect(filterProducts(items, NO_FILTERS)).toHaveLength(4);
  });
  it('filters by brand and pack together (TAMA + PET)', () => {
    expect(filterProducts(items, { ...NO_FILTERS, brand: 'tama', pack: 'pet' }).map((x) => x.nameEn)).toEqual(['Lemon Nectar']);
  });
  it('puts brand-less products under the Tastino filter', () => {
    expect(filterProducts(items, { ...NO_FILTERS, brand: 'tastino' }).map((x) => x.nameEn)).toEqual(['Vanilla Syrup']);
  });
  it('filters by category', () => {
    expect(filterProducts(items, { ...NO_FILTERS, cat: 'jams' })).toHaveLength(1);
  });
  it('searches English names, Arabic names and brand names', () => {
    expect([
      filterProducts(items, { ...NO_FILTERS, q: 'lemon' }).length,
      filterProducts(items, { ...NO_FILTERS, q: 'ليمون' }).length,
      filterProducts(items, { ...NO_FILTERS, q: 'lora' }).length,
    ]).toEqual([1, 1, 1]);
  });
  it('returns nothing when no product matches', () => {
    expect(filterProducts(items, { ...NO_FILTERS, brand: 'lora', pack: 'tin' })).toEqual([]);
  });
});

describe('hasFilters', () => {
  it('is false for none and true for any', () => {
    expect([hasFilters(NO_FILTERS), hasFilters({ ...NO_FILTERS, q: 'x' }), hasFilters({ ...NO_FILTERS, pack: 'can' })]).toEqual([false, true, true]);
  });
});

describe('slug redirect safety', () => {
  it.each(['lora', 'tama-mango-nectar', 'a1'])('accepts the slug %s', (s2) => {
    expect(isSlug(s2)).toBe(true);
  });
  it.each(['', 'Lora', '//evil.com', '..%2fa', '\\evil.com', 'a b', 'a--b', '-a', 'a-', 'a/b', 'a\r\nb'])('rejects the slug %j', (s2) => {
    expect(isSlug(s2)).toBe(false);
  });
  it('builds a same-site path for a valid locale and slug', () => {
    expect(slugRedirectPath('ar', 'brands', 'tama')).toBe('/ar/brands/tama');
  });
  it.each(['/evil.com', 'fr', '', '//x'])('refuses the locale %j', (loc) => {
    expect(slugRedirectPath(loc, 'brands', 'tama')).toBeNull();
  });
  it('refuses an invalid slug', () => {
    expect(slugRedirectPath('en', 'products', '//evil.com')).toBeNull();
  });
});
