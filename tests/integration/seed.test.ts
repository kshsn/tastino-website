import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { findBanned } from '@/lib/content/rules';
import { runSeed, type SeedReport } from '../../prisma/seed/run';

const counts = async () => ({
  brands: await db.brand.count(),
  products: await db.product.count(),
  variants: await db.productVariant.count(),
  media: await db.mediaAsset.count(),
  blocks: await db.pageBlock.count(),
  settings: await db.setting.count(),
});

let first: SeedReport;
let afterFirst: Awaited<ReturnType<typeof counts>>;

beforeAll(async () => {
  first = await runSeed(db);
  afterFirst = await counts();
});
afterAll(() => db.$disconnect());

describe('runSeed (US-002.3 / US-002.4 / US-002.7)', () => {
  it('reports no skipped catalogue rows', () => {
    expect(first.skipped).toEqual([]);
  });

  it('is idempotent: a second run leaves every row count unchanged', async () => {
    await runSeed(db);
    expect(await counts()).toEqual(afterFirst);
  });

  it('creates exactly four published, live brands', async () => {
    const brands = await db.brand.findMany({ where: { status: 'PUBLISHED', visibility: 'LIVE' } });
    expect(brands.map((b) => b.slug).sort()).toEqual(['andiamo', 'liora', 'lora', 'tama']);
  });

  it('stores Freshness, traditional beverages and THE LEAF as lines, not brands', async () => {
    const lines = await db.product.groupBy({ by: ['productLine'], where: { brandId: null }, _count: true });
    expect(lines.map((l) => l.productLine).sort()).toEqual(['FRESHNESS', 'THE_LEAF', 'TRADITIONAL']);
  });

  it('stores no 360g, 370g or 420g variant', async () => {
    const bad = await db.productVariant.count({ where: { unit: 'G', sizeValue: { in: [360, 370, 420] } } });
    expect(bad).toBe(0);
  });

  it('stores no banned spelling or boilerplate in any product', async () => {
    const products = await db.product.findMany();
    const text = products.map((p) => [p.nameEn, p.nameAr, p.descriptionEn, p.descriptionAr].join(' ')).join(' ');
    expect(findBanned(text)).toEqual([]);
  });

  it('seeds the six official copy blocks plus the tagline, all published', async () => {
    expect(await db.pageBlock.count({ where: { status: 'PUBLISHED' } })).toBe(7);
  });

  it('stores the English tagline exactly', async () => {
    expect((await db.pageBlock.findUniqueOrThrow({ where: { key: 'tagline' } })).bodyEn).toBe('Crafted with Care. Inspired by Nature.');
  });

  it('never overwrites a block an admin has edited', async () => {
    await db.pageBlock.update({ where: { key: 'about' }, data: { bodyEn: 'Admin text', editedByAdmin: true } });
    await runSeed(db);
    expect((await db.pageBlock.findUniqueOrThrow({ where: { key: 'about' } })).bodyEn).toBe('Admin text');
  });

  it('keeps SMTP-style settings private', async () => {
    expect((await db.setting.findUniqueOrThrow({ where: { key: 'leads.recipients' } })).isPrivate).toBe(true);
  });
});
