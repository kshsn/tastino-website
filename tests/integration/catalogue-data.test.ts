import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import {
  findSlugRedirect,
  getBrandPage,
  getBrandsIndex,
  getListingData,
  getProductPage,
  getStaticSlugs,
  getTastinoLines,
} from '@/lib/content/catalogue';
import { runSeed } from '../../prisma/seed/run';

beforeAll(async () => {
  await runSeed(db, { skipMedia: true });
}, 120_000);
afterAll(() => db.$disconnect());

async function withChange<T>(apply: () => Promise<unknown>, restore: () => Promise<unknown>, fn: () => Promise<T>): Promise<T> {
  await apply();
  try {
    return await fn();
  } finally {
    await restore();
  }
}

describe('getBrandsIndex (US-004.1)', () => {
  it('lists the four brands in sortOrder', async () => {
    const { brands } = await getBrandsIndex();
    expect(brands.map((b) => b.slug)).toEqual(['lora', 'liora', 'andiamo', 'tama']);
  });
  it('counts each brand’s published products', async () => {
    const { brands } = await getBrandsIndex();
    const tama = await db.product.count({ where: { brand: { slug: 'tama' }, status: 'PUBLISHED' } });
    expect(brands.find((b) => b.slug === 'tama')?.productCount).toBe(tama);
  });
  it('counts the Tastino line products separately', async () => {
    const { lineProductCount } = await getBrandsIndex();
    expect(lineProductCount).toBe(await db.product.count({ where: { brandId: null, status: 'PUBLISHED' } }));
  });
  it('lists a coming-soon brand (as a card) but never a hidden one', async () => {
    const run = (vis: 'COMING_SOON' | 'HIDDEN') =>
      withChange(
        () => db.brand.update({ where: { slug: 'tama' }, data: { visibility: vis } }),
        () => db.brand.update({ where: { slug: 'tama' }, data: { visibility: 'LIVE' } }),
        async () => (await getBrandsIndex()).brands.map((b) => b.slug),
      );
    expect([(await run('COMING_SOON')).includes('tama'), (await run('HIDDEN')).includes('tama')]).toEqual([true, false]);
  });
  it('returns nothing for a draft brand', async () => {
    const slugs = await withChange(
      () => db.brand.update({ where: { slug: 'liora' }, data: { status: 'DRAFT' } }),
      () => db.brand.update({ where: { slug: 'liora' }, data: { status: 'PUBLISHED' } }),
      async () => (await getBrandsIndex()).brands.map((b) => b.slug),
    );
    expect(slugs).not.toContain('liora');
  });
});

describe('getBrandPage (US-004.2 / US-004.7)', () => {
  it('shows only jams under Lora', async () => {
    const page = await getBrandPage('lora');
    expect(page?.products.length).toBeGreaterThan(0);
    expect(page?.products.every((p) => p.category.slug === 'jams')).toBe(true);
  });
  it('gives every Lora jam 400g and 650g and no tomato products', async () => {
    const page = await getBrandPage('lora');
    const sizes = new Set(page!.products.flatMap((p) => p.variants.map((v) => Number(v.sizeValue))));
    expect([...sizes].sort()).toEqual([400, 650]);
  });
  it('shows only tomato products under Liora, with the catalogue tin and glass sizes', async () => {
    const page = await getBrandPage('liora');
    expect(page?.products.every((p) => p.category.slug === 'tomato')).toBe(true);
    const sizes = new Set(page!.products.flatMap((p) => p.variants.map((v) => Number(v.sizeValue))));
    for (const s of [285, 300, 320, 400, 800, 1, 3]) expect(sizes.has(s)).toBe(true);
  });
  it('returns null for non-brand slugs (Freshness, THE LEAF, nonsense)', async () => {
    const results = await Promise.all(['freshness', 'the-leaf', 'tastino', 'nope'].map((s) => getBrandPage(s)));
    expect(results).toEqual([null, null, null, null]);
  });
  it('returns null for a hidden brand', async () => {
    const page = await withChange(
      () => db.brand.update({ where: { slug: 'andiamo' }, data: { visibility: 'HIDDEN' } }),
      () => db.brand.update({ where: { slug: 'andiamo' }, data: { visibility: 'LIVE' } }),
      () => getBrandPage('andiamo'),
    );
    expect(page).toBeNull();
  });
  it('shows no products for a coming-soon brand', async () => {
    const page = await withChange(
      () => db.brand.update({ where: { slug: 'tama' }, data: { visibility: 'COMING_SOON' } }),
      () => db.brand.update({ where: { slug: 'tama' }, data: { visibility: 'LIVE' } }),
      () => getBrandPage('tama'),
    );
    expect([page?.brand.visibility, page?.products]).toEqual(['COMING_SOON', []]);
  });
  it('lists the other brands for cross-links', async () => {
    expect((await getBrandPage('lora'))?.others.map((o) => o.slug)).toEqual(['liora', 'andiamo', 'tama']);
  });
});

describe('getListingData (US-004.3)', () => {
  it('returns every published product', async () => {
    const { products } = await getListingData();
    expect(products).toHaveLength(await db.product.count({ where: { status: 'PUBLISHED' } }));
  });
  it('offers the four live brands plus Tastino as brand filters', async () => {
    const { brandOptions } = await getListingData();
    expect(brandOptions.map((b) => b.slug)).toEqual(['lora', 'liora', 'andiamo', 'tama', 'tastino']);
  });
  it('offers only categories and pack types that exist', async () => {
    const { categoryOptions, packOptions } = await getListingData();
    expect([categoryOptions.length > 0, packOptions.sort()]).toEqual([true, ['GLASS', 'PET', 'TIN']]);
  });
  it('leaves out products of a coming-soon brand', async () => {
    const slugs = await withChange(
      () => db.brand.update({ where: { slug: 'tama' }, data: { visibility: 'COMING_SOON' } }),
      () => db.brand.update({ where: { slug: 'tama' }, data: { visibility: 'LIVE' } }),
      async () => (await getListingData()).products.map((p) => p.slug),
    );
    expect(slugs.some((s) => s.startsWith('tama-'))).toBe(false);
  });
});

describe('getProductPage (US-004.4)', () => {
  it('returns a product with its variants', async () => {
    const page = await getProductPage('tama-mango-nectar');
    expect(page?.product.variants.map((v) => `${Number(v.sizeValue)}${v.unit}`)).toEqual(['200ML', '250ML', '1L']);
  });
  it('returns related products from the same brand, never the product itself', async () => {
    const page = await getProductPage('tama-mango-nectar');
    expect(page!.related.length).toBeGreaterThan(0);
    expect(page!.related.every((p) => p.brand?.slug === 'tama' && p.slug !== 'tama-mango-nectar')).toBe(true);
  });
  it('relates a Tastino-line product to products of the same line', async () => {
    const page = await getProductPage('freshness-vanilla-syrup');
    expect(page!.related.every((p) => p.productLine === 'FRESHNESS')).toBe(true);
  });
  it('returns null for a draft product', async () => {
    const page = await withChange(
      () => db.product.update({ where: { slug: 'tama-peach-nectar' }, data: { status: 'DRAFT' } }),
      () => db.product.update({ where: { slug: 'tama-peach-nectar' }, data: { status: 'PUBLISHED' } }),
      () => getProductPage('tama-peach-nectar'),
    );
    expect(page).toBeNull();
  });
  it('returns null for an unknown slug and for the reserved tastino-lines slug', async () => {
    expect([await getProductPage('nope'), await getProductPage('tastino-lines')]).toEqual([null, null]);
  });
  it('never gives a jam or sauce a 360g, 370g or 420g size', async () => {
    const { products } = await getListingData();
    const bad = products
      .filter((p) => ['jams', 'sauces'].includes(p.category.slug))
      .flatMap((p) => p.variants.filter((v) => [360, 370, 420].includes(Number(v.sizeValue))).map(() => p.slug));
    expect(bad).toEqual([]);
  });
});

describe('getTastinoLines (US-004.5)', () => {
  it('has the three lines in order', async () => {
    expect((await getTastinoLines()).map((s) => s.line)).toEqual(['FRESHNESS', 'TRADITIONAL', 'THE_LEAF']);
  });
  it('keeps Freshness syrups at 800ml and the beverages at 330ml', async () => {
    const lines = await getTastinoLines();
    const size = (line: string) => lines.find((l) => l.line === line)!.products.flatMap((p) => p.variants.map((v) => `${Number(v.sizeValue)}${v.unit}`));
    expect([new Set(size('FRESHNESS')), new Set(size('TRADITIONAL')), new Set(size('THE_LEAF'))]).toEqual([new Set(['800ML']), new Set(['330ML']), new Set(['330ML'])]);
  });
  it('has the four traditional beverages', async () => {
    const trad = (await getTastinoLines()).find((l) => l.line === 'TRADITIONAL')!;
    expect(trad.products.map((p) => p.slug).sort()).toEqual(['carob-kharrub', 'hibiscus-karkadeh', 'licorice-erq-sous', 'qamar-al-din']);
  });
  it('leaves out a line with no published products', async () => {
    const lines = await withChange(
      () => db.product.updateMany({ where: { productLine: 'THE_LEAF' }, data: { status: 'DRAFT' } }),
      () => db.product.updateMany({ where: { productLine: 'THE_LEAF' }, data: { status: 'PUBLISHED' } }),
      async () => (await getTastinoLines()).map((l) => l.line),
    );
    expect(lines).toEqual(['FRESHNESS', 'TRADITIONAL']);
  });
});

describe('slug redirects (US-004.2 / US-004.4)', () => {
  it('finds where a renamed slug now lives', async () => {
    await db.slugRedirect.create({ data: { kind: 'PRODUCT', oldSlug: 'old-mango', targetSlug: 'tama-mango-nectar' } });
    expect([await findSlugRedirect('PRODUCT', 'old-mango'), await findSlugRedirect('BRAND', 'old-mango'), await findSlugRedirect('PRODUCT', 'nope')]).toEqual(['tama-mango-nectar', null, null]);
  });
  it('rejects a second redirect for the same old slug', async () => {
    await db.slugRedirect.create({ data: { kind: 'BRAND', oldSlug: 'old-tama', targetSlug: 'tama' } });
    await expect(db.slugRedirect.create({ data: { kind: 'BRAND', oldSlug: 'old-tama', targetSlug: 'lora' } })).rejects.toThrow();
  });
});

describe('getStaticSlugs', () => {
  it('lists published brand and product slugs only', async () => {
    const { brands, products } = await getStaticSlugs();
    expect([brands.length, products.length > 40]).toEqual([4, true]);
  });
});

describe('content accuracy (US-004.6)', () => {
  it('has every product under exactly one brand or Tastino line', async () => {
    const bad = await db.$queryRaw<{ slug: string }[]>`SELECT slug FROM "Product" WHERE ("brandId" IS NULL) = ("productLine" IS NULL)`;
    expect(bad).toEqual([]);
  });
  it('has no duplicate product name within a brand', async () => {
    const dups = await db.$queryRaw<{ n: string }[]>`
      SELECT "nameEn" AS n FROM "Product" WHERE "brandId" IS NOT NULL GROUP BY "brandId", "nameEn" HAVING count(*) > 1`;
    expect(dups).toEqual([]);
  });
});
