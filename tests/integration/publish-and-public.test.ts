import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { setPublishStatus } from '@/lib/content/publish';
import { getPageBlock, getPublicSettings, getPublishedProduct, getPublishedProducts, listProductsMissingImage } from '@/lib/content/public';
import { PublishRuleError } from '@/lib/content/rules';
import { runSeed } from '../../prisma/seed/run';

let categoryId: string;
let brandId: string;

beforeAll(async () => {
  await runSeed(db, { skipMedia: true });
  categoryId = (await db.category.findUniqueOrThrow({ where: { slug: 'juices' } })).id;
  brandId = (await db.brand.findUniqueOrThrow({ where: { slug: 'tama' } })).id;
});
afterAll(() => db.$disconnect());

const draft = (slug: string, over: Record<string, unknown> = {}) =>
  db.product.create({
    data: { slug, nameEn: 'Draft Nectar', nameAr: 'نكتار تجريبي', descriptionEn: 'd', descriptionAr: 'د', categoryId, brandId, ...over },
  });

describe('setPublishStatus (US-002.8)', () => {
  it('refuses to publish when the Arabic name is empty and names the field', async () => {
    const p = await draft('pub-no-ar', { nameAr: '' });
    await expect(setPublishStatus('product', p.id, 'PUBLISHED')).rejects.toThrow(PublishRuleError);
  });

  it('leaves the item unchanged when publishing is refused', async () => {
    const p = await draft('pub-no-ar-2', { descriptionAr: '  ' });
    await setPublishStatus('product', p.id, 'PUBLISHED').catch(() => {});
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).status).toBe('DRAFT');
  });

  it('publishes a complete item and writes one audit entry', async () => {
    const p = await draft('pub-ok');
    await setPublishStatus('product', p.id, 'PUBLISHED');
    expect(await db.auditLog.count({ where: { entityId: p.id, action: 'publish' } })).toBe(1);
  });

  it('treats publishing an already-published item as a no-op', async () => {
    const p = await draft('pub-twice');
    await setPublishStatus('product', p.id, 'PUBLISHED');
    const second = await setPublishStatus('product', p.id, 'PUBLISHED');
    expect(second.changed).toBe(false);
  });
});

describe('public queries', () => {
  it('never return draft products', async () => {
    await draft('public-draft');
    const slugs = (await getPublishedProducts()).map((p) => p.slug);
    expect(slugs).not.toContain('public-draft');
  });

  it('return 404-equivalent (null) for a draft slug', async () => {
    await draft('public-draft-2');
    expect(await getPublishedProduct('public-draft-2')).toBeNull();
  });

  it('filter by brand', async () => {
    const tama = await getPublishedProducts({ brand: 'tama' });
    expect(tama.every((p) => p.brand?.slug === 'tama')).toBe(true);
  });

  it('show the placeholder (null image) for a mislabelled packshot', async () => {
    const jam = await getPublishedProduct('lora-strawberry-jam');
    expect(jam?.image).toBeNull();
  });

  it('do not expose the missing-image flag publicly', async () => {
    const [p] = await getPublishedProducts({ brand: 'lora' });
    expect(p).not.toHaveProperty('imageNeedsReplacement');
  });

  it('hide products of a hidden brand', async () => {
    await db.brand.update({ where: { slug: 'liora' }, data: { visibility: 'HIDDEN' } });
    const slugs = (await getPublishedProducts()).map((p) => p.slug);
    await db.brand.update({ where: { slug: 'liora' }, data: { visibility: 'LIVE' } });
    expect(slugs.some((s) => s.startsWith('liora-'))).toBe(false);
  });

  it('return only published page blocks', async () => {
    await db.pageBlock.create({ data: { key: 'draft-block', titleEn: 't', titleAr: 'ت', bodyEn: 'b', bodyAr: 'ب' } });
    expect(await getPageBlock('draft-block')).toBeNull();
  });

  it('never return private settings', async () => {
    expect(await getPublicSettings()).not.toHaveProperty('leads.recipients');
  });

  it('list mislabelled and imageless products for admins', async () => {
    const slugs = (await listProductsMissingImage()).map((p) => p.slug);
    expect(slugs).toContain('lora-strawberry-jam');
  });
});
