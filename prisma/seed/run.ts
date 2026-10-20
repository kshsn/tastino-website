import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { Prisma, type PrismaClient } from '@prisma/client';
import { findBanned, missingForPublish } from '@/lib/content/rules';
import { storeImage } from '@/lib/media/store';
import { BRANDS, CATEGORIES, HERO_SLIDES, PRODUCTS, describe } from './catalogue';
import { loadOfficialCopy, TAGLINE } from './copy';

const ROOT = path.resolve(__dirname, '../..');
export const CUTOUTS = path.join(ROOT, '.claude/source/cutouts');
export const COPY_FILE = path.join(ROOT, '.claude/source/content/official-copy.md');

export interface SeedOptions {
  /** Skip image processing (fast runs); products then show the placeholder. */
  skipMedia?: boolean;
  mediaDir?: string;
  log?: (msg: string) => void;
}

export interface SeedReport {
  brands: number;
  categories: number;
  products: number;
  variants: number;
  blocks: number;
  heroSlides: number;
  media: number;
  skipped: string[];
}

/**
 * Idempotent seed: everything is upserted by slug/key, so running it twice leaves row counts unchanged.
 * Uses only local files (no network). Fails loudly on missing Arabic text or banned spellings.
 */
export async function runSeed(db: PrismaClient, opts: SeedOptions = {}): Promise<SeedReport> {
  const log = opts.log ?? (() => {});
  const report: SeedReport = { brands: 0, categories: 0, products: 0, variants: 0, blocks: 0, heroSlides: 0, media: 0, skipped: [] };

  const imageIds = new Map<string, string>();
  async function image(file: string | undefined, altEn: string, altAr: string) {
    if (!file || opts.skipMedia) return null;
    if (imageIds.has(file)) return imageIds.get(file)!;
    const { asset, created } = await storeImage(await readFile(path.join(CUTOUTS, file)), {
      fileName: file,
      altEn,
      altAr,
      mediaDir: opts.mediaDir,
    });
    if (created) report.media++;
    imageIds.set(file, asset.id);
    return asset.id;
  }

  for (const b of BRANDS) {
    const missing = missingForPublish('brand', b as unknown as Record<string, unknown>);
    if (missing.length) throw new Error(`Seed: brand "${b.slug}" is missing ${missing.join(', ')}`);
    const imageId = await image(b.image, `${b.nameEn} ${b.categoryEn}`, `${b.categoryAr} ${b.nameAr}`);
    const data = {
      nameEn: b.nameEn, nameAr: b.nameAr, categoryEn: b.categoryEn, categoryAr: b.categoryAr,
      taglineEn: b.taglineEn ?? null, taglineAr: b.taglineAr ?? null, accentColor: b.accentColor,
      sortOrder: b.sortOrder, imageId, status: 'PUBLISHED' as const, visibility: 'LIVE' as const,
    };
    await db.brand.upsert({ where: { slug: b.slug }, create: { slug: b.slug, ...data }, update: data });
    report.brands++;
  }

  for (const c of CATEGORIES) {
    await db.category.upsert({ where: { slug: c.slug }, create: { ...c }, update: { ...c } });
    report.categories++;
  }

  const brandIds = new Map((await db.brand.findMany({ select: { id: true, slug: true } })).map((b) => [b.slug, b.id]));
  const categoryIds = new Map((await db.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));

  for (const [i, p] of PRODUCTS.entries()) {
    if (p.variants.length === 0) {
      report.skipped.push(`${p.slug}: no size in catalogue`);
      continue;
    }
    const desc = describe(p);
    const record = { ...p, descriptionEn: desc.en, descriptionAr: desc.ar };
    const missing = missingForPublish('product', record as unknown as Record<string, unknown>);
    if (missing.length) throw new Error(`Seed: product "${p.slug}" is missing ${missing.join(', ')}`);
    const banned = findBanned([p.nameEn, p.nameAr, desc.en, desc.ar, p.ingredientsEn ?? ''].join(' '));
    if (banned.length) throw new Error(`Seed: product "${p.slug}" contains banned text ${banned.join(', ')}`);

    const imageId = await image(p.image, p.nameEn, p.nameAr);
    const data = {
      brandId: p.brand ? brandIds.get(p.brand)! : null,
      productLine: p.line ?? null,
      categoryId: categoryIds.get(p.category)!,
      nameEn: p.nameEn, nameAr: p.nameAr,
      descriptionEn: desc.en, descriptionAr: desc.ar,
      ingredientsEn: p.ingredientsEn ?? null, ingredientsAr: p.ingredientsAr ?? null,
      imageId, imageNeedsReplacement: p.imageNeedsReplacement ?? false,
      status: 'PUBLISHED' as const, sortOrder: i,
    };
    const product = await db.product.upsert({ where: { slug: p.slug }, create: { slug: p.slug, ...data }, update: data });
    report.products++;

    // Variants are replaced as a set so the seed always matches the catalogue exactly.
    await db.$transaction([
      db.productVariant.deleteMany({ where: { productId: product.id } }),
      db.productVariant.createMany({
        data: p.variants.map(([size, unit, pack], k) => ({
          productId: product.id, sizeValue: new Prisma.Decimal(size), unit, packType: pack, sortOrder: k,
        })),
      }),
    ]);
    report.variants += p.variants.length;
  }

  // Hero slides are created once: re-seeding never overwrites what an admin has since edited.
  // The only thing it fills in later is a missing image (e.g. the first seed ran with media skipped).
  for (const h of HERO_SLIDES) {
    const imageId = await image(h.image, `${h.sublineEn} ${h.headlineEn}`, `${h.sublineAr} ${h.headlineAr}`);
    const { image: _file, ...fields } = h;
    void _file;
    const existing = await db.heroSlide.findUnique({ where: { id: h.id } });
    if (!existing) await db.heroSlide.create({ data: { ...fields, imageId, status: 'PUBLISHED' } });
    else if (!existing.imageId && imageId) await db.heroSlide.update({ where: { id: h.id }, data: { imageId } });
    report.heroSlides++;
  }

  for (const block of await loadOfficialCopy(COPY_FILE)) {
    const existing = await db.pageBlock.findUnique({ where: { key: block.key } });
    if (existing?.editedByAdmin) {
      log(`Seed: kept admin-edited block "${block.key}"`);
      continue;
    }
    const banned = findBanned(`${block.bodyEn} ${block.bodyAr}`);
    if (banned.length) throw new Error(`Seed: block "${block.key}" contains banned text ${banned.join(', ')}`);
    const status = missingForPublish('pageBlock', block as unknown as Record<string, unknown>).length ? 'DRAFT' : 'PUBLISHED';
    const { key, ...data } = block;
    await db.pageBlock.upsert({ where: { key }, create: { key, ...data, status }, update: { ...data, status } });
    report.blocks++;
  }
  const tagline = { titleEn: 'Tagline', titleAr: 'الشعار', bodyEn: TAGLINE.en, bodyAr: TAGLINE.ar, status: 'PUBLISHED' as const };
  const existingTagline = await db.pageBlock.findUnique({ where: { key: 'tagline' } });
  if (!existingTagline?.editedByAdmin) {
    await db.pageBlock.upsert({ where: { key: 'tagline' }, create: { key: 'tagline', ...tagline }, update: tagline });
    report.blocks++;
  }

  const settings: { key: string; value: Prisma.InputJsonValue; isPrivate?: boolean }[] = [
    { key: 'contact.email', value: 'info@tastinofoods.com' },
    { key: 'contact.phone', value: '+201100111887' },
    { key: 'contact.whatsapp', value: '+201100111887' },
    { key: 'contact.addressEn', value: 'Industrial City, 10th of Ramadan, C5, Building No. 21' },
    { key: 'contact.addressAr', value: 'المنطقة الصناعية، العاشر من رمضان، C5، مبنى رقم 21' },
    { key: 'social', value: [] },
    { key: 'leads.recipients', value: ['info@tastinofoods.com'], isPrivate: true },
  ];
  for (const s of settings) {
    // Only create: an admin's later change to a setting is never overwritten by re-seeding.
    await db.setting.upsert({ where: { key: s.key }, create: { key: s.key, value: s.value, isPrivate: s.isPrivate ?? false }, update: {} });
  }

  log(`Seed done: ${JSON.stringify(report)}`);
  return report;
}
