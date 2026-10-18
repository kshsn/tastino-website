import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';

const lead = (over: Record<string, unknown> = {}) => ({
  reference: `TF-T-${Math.random().toString(36).slice(2, 10)}`,
  reason: 'DISTRIBUTOR' as const,
  name: 'Test Buyer',
  email: 'buyer@example.com',
  company: 'Example Trading',
  country: 'Egypt',
  message: 'Interested in TAMA.',
  locale: 'en',
  consent: true,
  consentAt: new Date(),
  consentTextVersion: 'v1',
  ...over,
});

let categoryId: string;
let brandId: string;

beforeAll(async () => {
  const c = await db.category.upsert({ where: { slug: 'guard-cat' }, create: { slug: 'guard-cat', nameEn: 'G', nameAr: 'ج' }, update: {} });
  const b = await db.brand.upsert({
    where: { slug: 'guard-brand' },
    create: { slug: 'guard-brand', nameEn: 'G', nameAr: 'ج', accentColor: '#000' },
    update: {},
  });
  categoryId = c.id;
  brandId = b.id;
});
afterAll(() => db.$disconnect());

describe('Lead data-layer guards (US-002.2)', () => {
  it('refuses to delete a lead (archive only)', async () => {
    const l = await db.lead.create({ data: lead() });
    await expect(db.lead.delete({ where: { id: l.id } })).rejects.toThrow(/cannot be deleted/);
  });
  it('rejects a lead without consent', async () => {
    await expect(db.lead.create({ data: lead({ consent: false }) })).rejects.toThrow();
  });
  it('rejects a lead with a blank email', async () => {
    await expect(db.lead.create({ data: lead({ email: '   ' }) })).rejects.toThrow();
  });
});

describe('Audit log is append-only (US-007.7 foundation)', () => {
  it('refuses updates', async () => {
    const a = await db.auditLog.create({ data: { action: 'test', entityType: 'Test' } });
    await expect(db.auditLog.update({ where: { id: a.id }, data: { action: 'changed' } })).rejects.toThrow(/append-only/);
  });
  it('refuses deletes', async () => {
    const a = await db.auditLog.create({ data: { action: 'test', entityType: 'Test' } });
    await expect(db.auditLog.delete({ where: { id: a.id } })).rejects.toThrow(/append-only/);
  });
});

describe('User email uniqueness (US-002.2)', () => {
  it('rejects the same email in a different letter case', async () => {
    await db.user.create({ data: { email: 'Sara@TastinoFoods.com', name: 'Sara', role: 'SUPER_ADMIN' } });
    await expect(db.user.create({ data: { email: 'sara@tastinofoods.com', name: 'Sara 2', role: 'SALES' } })).rejects.toThrow();
  });
});

describe('Product ownership (US-002.1)', () => {
  it('rejects a product with both a brand and a Tastino line', async () => {
    await expect(
      db.product.create({
        data: { slug: 'both', nameEn: 'x', nameAr: 'س', categoryId, brandId, productLine: 'FRESHNESS' },
      }),
    ).rejects.toThrow();
  });
  it('rejects a product with neither', async () => {
    await expect(db.product.create({ data: { slug: 'neither', nameEn: 'x', nameAr: 'س', categoryId } })).rejects.toThrow();
  });
  it('rejects a duplicate slug', async () => {
    await db.product.create({ data: { slug: 'dup-slug', nameEn: 'x', nameAr: 'س', categoryId, brandId } });
    await expect(db.product.create({ data: { slug: 'dup-slug', nameEn: 'y', nameAr: 'ص', categoryId, brandId } })).rejects.toThrow();
  });
  it('rejects a zero size variant', async () => {
    const p = await db.product.create({ data: { slug: 'zero-size', nameEn: 'x', nameAr: 'س', categoryId, brandId } });
    await expect(db.productVariant.create({ data: { productId: p.id, sizeValue: 0, unit: 'G', packType: 'GLASS' } })).rejects.toThrow();
  });
});
