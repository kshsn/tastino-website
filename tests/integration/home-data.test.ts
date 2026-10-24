import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { getHomeData, HOME_BLOCK_KEYS } from '@/lib/content/home';
import { runSeed } from '../../prisma/seed/run';

beforeAll(async () => {
  await runSeed(db);
}, 120_000);
afterAll(() => db.$disconnect());

/** Runs `fn` with a temporary change and always restores it, so tests stay independent. */
async function withChange<T>(apply: () => Promise<unknown>, restore: () => Promise<unknown>, fn: () => Promise<T>): Promise<T> {
  await apply();
  try {
    return await fn();
  } finally {
    await restore();
  }
}

describe('getHomeData: hero (US-003.1)', () => {
  it('links a slide to its brand page, and to the product list when the slide is not a brand', async () => {
    const { slides } = await getHomeData('en');
    expect(slides.map((s) => s.href)).toEqual(['/brands/tama', '/brands/liora', '/products']);
  });
  it('cycles exactly the published slides in sortOrder', async () => {
    const { slides } = await getHomeData('en');
    expect(slides.map((s) => s.brand)).toEqual(['TAMA', 'Liora', 'Freshness']);
  });
  it('gives each slide its own accent color', async () => {
    const { slides } = await getHomeData('en');
    expect(new Set(slides.map((s) => s.accent)).size).toBe(3);
  });
  it('gives each slide a packshot with alt text', async () => {
    const { slides } = await getHomeData('en');
    expect(slides.every((s) => s.picture && s.picture.alt.length > 0)).toBe(true);
  });
  it('shows the slide label in Arabic for /ar', async () => {
    const { slides } = await getHomeData('ar');
    expect(slides[0].label).toBe('نكتار مانجو · ٢٥٠ مل');
  });
  it('leaves out an unpublished slide', async () => {
    const slides = await withChange(
      () => db.heroSlide.update({ where: { id: 'seed-hero-3' }, data: { status: 'DRAFT' } }),
      () => db.heroSlide.update({ where: { id: 'seed-hero-3' }, data: { status: 'PUBLISHED' } }),
      async () => (await getHomeData('en')).slides,
    );
    expect(slides).toHaveLength(2);
  });
  it('leaves a slide out of /ar when its Arabic text is blank (no English fallback)', async () => {
    const slides = await withChange(
      () => db.heroSlide.update({ where: { id: 'seed-hero-1' }, data: { headlineAr: '  ' } }),
      () => db.heroSlide.update({ where: { id: 'seed-hero-1' }, data: { headlineAr: 'نكتار مانجو · ٢٥٠ مل' } }),
      async () => (await getHomeData('ar')).slides,
    );
    expect(slides.map((s) => s.brand)).not.toContain('TAMA');
  });
  it('returns no slides when none are published, so the page can show the static hero', async () => {
    const slides = await withChange(
      () => db.heroSlide.updateMany({ data: { status: 'DRAFT' } }),
      () => db.heroSlide.updateMany({ data: { status: 'PUBLISHED' } }),
      async () => (await getHomeData('en')).slides,
    );
    expect(slides).toEqual([]);
  });
  it('provides a fallback lineup image for the static hero', async () => {
    expect((await getHomeData('en')).fallbackPicture).not.toBeNull();
  });
});

describe('getHomeData: stats (US-003.2)', () => {
  it('counts live brands and published products from the database', async () => {
    const { stats } = await getHomeData('en');
    const products = await db.product.count({ where: { status: 'PUBLISHED' } });
    expect([stats.brands, stats.products, stats.formats]).toEqual([4, products, 3]);
  });
  it('does not count a draft product', async () => {
    const before = (await getHomeData('en')).stats.products;
    const cat = await db.category.findFirstOrThrow();
    const brand = await db.brand.findUniqueOrThrow({ where: { slug: 'tama' } });
    await db.product.create({ data: { slug: 'home-draft-x', nameEn: 'x', nameAr: 'س', categoryId: cat.id, brandId: brand.id } });
    expect((await getHomeData('en')).stats.products).toBe(before);
  });
});

describe('getHomeData: copy blocks (US-003.3 / US-003.6)', () => {
  it('has every homepage block in English', async () => {
    const { blocks } = await getHomeData('en');
    expect(Object.keys(blocks).sort()).toEqual([...HOME_BLOCK_KEYS].sort());
  });
  it('has every homepage block in Arabic', async () => {
    const { blocks } = await getHomeData('ar');
    expect(Object.keys(blocks).sort()).toEqual([...HOME_BLOCK_KEYS].sort());
  });
  it('keeps the sales phone line out of the partnership text (it has its own contact box)', async () => {
    const [en, ar] = [await getHomeData('en'), await getHomeData('ar')];
    const text = [...(en.blocks.partnership?.paragraphs ?? []), ...(ar.blocks.partnership?.paragraphs ?? [])].join(' ');
    expect(text).not.toMatch(/00201100111887/);
  });
  it('uses the official Food Safety title', async () => {
    expect((await getHomeData('en')).blocks['food-safety']?.title).toBe('Food Safety Comes First');
  });
  it('omits a block whose Arabic body is empty, in /ar only', async () => {
    const [en, ar] = await withChange(
      () => db.pageBlock.update({ where: { key: 'innovation' }, data: { bodyAr: '' } }),
      () => db.pageBlock.update({ where: { key: 'innovation' }, data: { bodyAr: 'نص' } }),
      async () => [await getHomeData('en'), await getHomeData('ar')] as const,
    );
    expect([en.blocks.innovation !== undefined, ar.blocks.innovation !== undefined]).toEqual([true, false]);
  });
  it('omits an unpublished block', async () => {
    const blocks = await withChange(
      () => db.pageBlock.update({ where: { key: 'portfolio' }, data: { status: 'DRAFT' } }),
      () => db.pageBlock.update({ where: { key: 'portfolio' }, data: { status: 'PUBLISHED' } }),
      async () => (await getHomeData('en')).blocks,
    );
    expect(blocks.portfolio).toBeUndefined();
  });
});

describe('getHomeData: brand cards (US-003.4)', () => {
  it('lists the four live brands in order', async () => {
    const { brandCards } = await getHomeData('en');
    expect(brandCards.map((b) => b.slug)).toEqual(['lora', 'liora', 'andiamo', 'tama']);
  });
  it('shows the category label in the current language', async () => {
    const { brandCards } = await getHomeData('ar');
    expect(brandCards[0].category).toBe('مربى فاخر');
  });
  it('counts each brand’s published products', async () => {
    const { brandCards } = await getHomeData('en');
    const tama = await db.product.count({ where: { brand: { slug: 'tama' }, status: 'PUBLISHED' } });
    expect(brandCards.find((b) => b.slug === 'tama')?.productCount).toBe(tama);
  });
  it('never lists a hidden brand', async () => {
    const slugs = await withChange(
      () => db.brand.update({ where: { slug: 'andiamo' }, data: { visibility: 'HIDDEN' } }),
      () => db.brand.update({ where: { slug: 'andiamo' }, data: { visibility: 'LIVE' } }),
      async () => (await getHomeData('en')).brandCards.map((b) => b.slug),
    );
    expect(slugs).not.toContain('andiamo');
  });
  it('lists only live brands, not coming-soon ones', async () => {
    const slugs = await withChange(
      () => db.brand.update({ where: { slug: 'tama' }, data: { visibility: 'COMING_SOON' } }),
      () => db.brand.update({ where: { slug: 'tama' }, data: { visibility: 'LIVE' } }),
      async () => (await getHomeData('en')).brandCards.map((b) => b.slug),
    );
    expect(slugs).not.toContain('tama');
  });
  it('counts only brand-less products in the Tastino lines card', async () => {
    const { tastinoLines } = await getHomeData('en');
    const lines = await db.product.count({ where: { brandId: null, status: 'PUBLISHED' } });
    expect(tastinoLines.productCount).toBe(lines);
  });
});

describe('getHomeData: product strip, fan and shelf (US-003.5 / US-003.6)', () => {
  it('has a product strip of at least four items', async () => {
    expect((await getHomeData('en')).marquee.length).toBeGreaterThanOrEqual(4);
  });
  it('never puts the still mislabelled (Liora-labelled) strawberry jam packshot in the strip', async () => {
    const slugs = (await getHomeData('en')).marquee.map((m) => m.slug);
    expect(slugs).not.toContain('lora-strawberry-jam');
  });
  it('gives every strip item a picture', async () => {
    expect((await getHomeData('en')).marquee.every((m) => m.picture !== null)).toBe(true);
  });
  it('shows six Andiamo sauces on the shelf', async () => {
    const { shelf } = await getHomeData('en');
    expect(shelf).toHaveLength(6);
  });
  it('shows the shelf names in Arabic for /ar', async () => {
    const { shelf } = await getHomeData('ar');
    expect(shelf.some((s) => s.name === 'كاتشب طماطم')).toBe(true);
  });
  it('fans out three Freshness syrups', async () => {
    expect((await getHomeData('en')).fan).toHaveLength(3);
  });
  it('hides the strip when fewer than four products have an image', async () => {
    const marquee = await withChange(
      () => db.product.updateMany({ data: { status: 'DRAFT' } }),
      () => db.product.updateMany({ data: { status: 'PUBLISHED' } }),
      async () => (await getHomeData('en')).marquee,
    );
    expect(marquee).toEqual([]);
  });
});

describe('getHomeData: contact (US-003.7)', () => {
  it('builds the WhatsApp link from settings', async () => {
    expect((await getHomeData('en')).contact.whatsapp).toBe('https://wa.me/201100111887');
  });
  it('formats the phone number for display', async () => {
    expect((await getHomeData('en')).contact.phoneDisplay).toBe('+20 110 011 1887');
  });
  it('drops the WhatsApp link when the setting is empty', async () => {
    const contact = await withChange(
      () => db.setting.update({ where: { key: 'contact.whatsapp' }, data: { value: '' } }),
      () => db.setting.update({ where: { key: 'contact.whatsapp' }, data: { value: '+201100111887' } }),
      async () => (await getHomeData('en')).contact,
    );
    expect(contact.whatsapp).toBeNull();
  });
});
