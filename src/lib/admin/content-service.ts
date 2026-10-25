import { Prisma, type PublishStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { assertUpdateKeepsPublishable, isBlank, PublishRuleError, type PublishableEntity } from '@/lib/content/rules';
import { setPublishStatus } from '@/lib/content/publish';
import { diffFields, writeAudit, type Db } from './audit';
import { checkBrand, checkHero, checkProduct, type Errors } from './content-validate';
import { refreshPublicSite } from './revalidate';

export interface Actor {
  id: string;
  ip?: string;
}

export type SaveResult<T> =
  | { status: 'ok'; item: T }
  | { status: 'invalid'; errors: Errors }
  | { status: 'not_found' }
  /** Hiding a brand that has published products: the editor must confirm first. */
  | { status: 'needs_confirm'; publishedProducts: number };

const invalid = (errors: Errors): { status: 'invalid'; errors: Errors } => ({ status: 'invalid', errors });
const isUnique = (e: unknown, field: string) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && String((e.meta as { target?: unknown })?.target ?? '').includes(field);

/** Maps the fields a publish rule found empty to form errors keyed by field name. */
const missingToErrors = (missing: string[]): Errors => Object.fromEntries(missing.map((f) => [f, 'required_to_publish']));

async function imageExists(client: Db, id: string | null | undefined): Promise<boolean> {
  if (!id) return true;
  return !!(await client.mediaAsset.findUnique({ where: { id }, select: { id: true } }));
}

/** An old address of a renamed published item keeps working: it redirects to the new one (301 on the public site). */
async function recordSlugChange(tx: Prisma.TransactionClient, kind: 'BRAND' | 'PRODUCT', from: string, to: string) {
  await tx.slugRedirect.deleteMany({ where: { kind, oldSlug: to } });
  await tx.slugRedirect.updateMany({ where: { kind, targetSlug: from }, data: { targetSlug: to } });
  await tx.slugRedirect.upsert({ where: { kind_oldSlug: { kind, oldSlug: from } }, update: { targetSlug: to }, create: { kind, oldSlug: from, targetSlug: to } });
}

// ───────────────────────── brands ─────────────────────────

export const brandSelect = {
  id: true, slug: true, nameEn: true, nameAr: true, categoryEn: true, categoryAr: true, taglineEn: true, taglineAr: true,
  descriptionEn: true, descriptionAr: true, accentColor: true, status: true, visibility: true, sortOrder: true, imageId: true, updatedAt: true,
} as const;

export function listBrands() {
  return db.brand.findMany({
    select: { ...brandSelect, image: { select: { id: true, derivatives: true } }, _count: { select: { products: true } } },
    orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
  });
}

export function getBrand(id: string) {
  return db.brand.findUnique({ where: { id }, select: { ...brandSelect, image: { select: { id: true, derivatives: true, altEn: true, altAr: true } }, _count: { select: { products: true } } } });
}

export async function saveBrand(actor: Actor, id: string | null, raw: unknown) {
  const checked = checkBrand(raw, id ? 'update' : 'create');
  if (!checked.ok) return invalid(checked.errors);
  const { confirmHide, ...data } = checked.data;
  if (!(await imageExists(db, data.imageId))) return invalid({ imageId: 'unknown_image' });

  try {
    const result = await db.$transaction(async (tx): Promise<SaveResult<{ id: string; slug: string }>> => {
      if (!id) {
        const created = await tx.brand.create({
          data: { ...(data as Required<Pick<typeof data, 'slug' | 'accentColor'>>), nameEn: data.nameEn ?? '', nameAr: data.nameAr ?? '', categoryEn: data.categoryEn, categoryAr: data.categoryAr, taglineEn: data.taglineEn, taglineAr: data.taglineAr, descriptionEn: data.descriptionEn, descriptionAr: data.descriptionAr, visibility: data.visibility, sortOrder: data.sortOrder, imageId: data.imageId },
          select: { id: true, slug: true },
        });
        await writeAudit(tx, { actorId: actor.id, ip: actor.ip, action: 'brand.create', entityType: 'Brand', entityId: created.id, changes: { slug: data.slug, nameEn: data.nameEn ?? null, nameAr: data.nameAr ?? null } });
        return { status: 'ok', item: created };
      }
      const current = await tx.brand.findUnique({ where: { id } });
      if (!current) return { status: 'not_found' };

      if (data.visibility === 'HIDDEN' && current.visibility !== 'HIDDEN' && !confirmHide) {
        const publishedProducts = await tx.product.count({ where: { brandId: id, status: 'PUBLISHED' } });
        if (publishedProducts > 0) return { status: 'needs_confirm', publishedProducts };
      }
      // A live brand cannot be edited into an incomplete state: unpublish it first.
      try {
        assertUpdateKeepsPublishable('brand', current, data);
      } catch (e) {
        if (e instanceof PublishRuleError) return invalid(missingToErrors(e.missing));
        throw e;
      }
      const patch = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as Prisma.BrandUncheckedUpdateInput;
      if (patch.nameEn === null) patch.nameEn = '';
      if (patch.nameAr === null) patch.nameAr = '';
      const updated = await tx.brand.update({ where: { id }, data: patch });
      if (data.slug && data.slug !== current.slug && current.status === 'PUBLISHED') await recordSlugChange(tx, 'BRAND', current.slug, data.slug);
      const changes = diffFields(current as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
      delete changes.updatedAt;
      if (Object.keys(changes).length) await writeAudit(tx, { actorId: actor.id, ip: actor.ip, action: 'brand.update', entityType: 'Brand', entityId: id, changes });
      return { status: 'ok', item: { id: updated.id, slug: updated.slug } };
    });
    if (result.status === 'ok') refreshPublicSite();
    return result;
  } catch (e) {
    if (isUnique(e, 'slug')) return invalid({ slug: 'slug_taken' });
    throw e;
  }
}

// ───────────────────────── products ─────────────────────────

const productSelect = {
  id: true, slug: true, brandId: true, productLine: true, categoryId: true, nameEn: true, nameAr: true, descriptionEn: true, descriptionAr: true,
  ingredientsEn: true, ingredientsAr: true, shelfLifeEn: true, shelfLifeAr: true, storageEn: true, storageAr: true,
  status: true, sortOrder: true, imageId: true, imageNeedsReplacement: true, updatedAt: true,
} as const;

export function listProducts() {
  return db.product.findMany({
    select: { id: true, slug: true, nameEn: true, nameAr: true, status: true, imageId: true, imageNeedsReplacement: true, productLine: true, brand: { select: { id: true, nameEn: true, visibility: true } }, _count: { select: { variants: true } } },
    orderBy: [{ brand: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { nameEn: 'asc' }],
  });
}

export function getProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    select: { ...productSelect, image: { select: { id: true, derivatives: true, altEn: true, altAr: true } }, variants: { orderBy: [{ sortOrder: 'asc' }, { sizeValue: 'asc' }] } },
  });
}

export const listCategories = () => db.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, nameEn: true } });

const variantKey = (v: { sizeValue: unknown; unit: string; packType: string | null }) => `${Number(v.sizeValue)}|${v.unit}|${v.packType ?? ''}`;

export async function saveProduct(actor: Actor, id: string | null, raw: unknown) {
  const checked = checkProduct(raw, id ? 'update' : 'create');
  if (!checked.ok) return invalid(checked.errors);
  const { variants, ...data } = checked.data;
  if (!(await imageExists(db, data.imageId))) return invalid({ imageId: 'unknown_image' });
  if (data.brandId && !(await db.brand.findUnique({ where: { id: data.brandId }, select: { id: true } }))) return invalid({ brandId: 'unknown_brand' });
  if (data.categoryId && !(await db.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }))) return invalid({ categoryId: 'unknown_category' });

  try {
    const result = await db.$transaction(async (tx): Promise<SaveResult<{ id: string; slug: string }>> => {
      let productId = id;
      let before: Record<string, unknown> = {};
      let published = false;
      if (!id) {
        const c = data as Required<Pick<typeof data, 'slug' | 'categoryId'>> & typeof data;
        const created = await tx.product.create({
          data: { slug: c.slug, brandId: c.brandId ?? null, productLine: c.productLine ?? null, categoryId: c.categoryId, nameEn: c.nameEn ?? '', nameAr: c.nameAr ?? '', descriptionEn: c.descriptionEn, descriptionAr: c.descriptionAr, ingredientsEn: c.ingredientsEn, ingredientsAr: c.ingredientsAr, shelfLifeEn: c.shelfLifeEn, shelfLifeAr: c.shelfLifeAr, storageEn: c.storageEn, storageAr: c.storageAr, sortOrder: c.sortOrder, imageId: c.imageId, imageNeedsReplacement: c.imageNeedsReplacement },
          select: { id: true },
        });
        productId = created.id;
      } else {
        const current = await tx.product.findUnique({ where: { id } });
        if (!current) return { status: 'not_found' };
        published = current.status === 'PUBLISHED';
        before = current as unknown as Record<string, unknown>;
        try {
          assertUpdateKeepsPublishable('product', current, data);
        } catch (e) {
          if (e instanceof PublishRuleError) return invalid(missingToErrors(e.missing));
          throw e;
        }
        if (published && variants && variants.length === 0) return invalid({ variants: 'variants_required' });
        const patch = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as Prisma.ProductUncheckedUpdateInput;
        if (patch.nameEn === null) patch.nameEn = '';
        if (patch.nameAr === null) patch.nameAr = '';
        await tx.product.update({ where: { id }, data: patch });
        if (data.slug && data.slug !== current.slug && published) await recordSlugChange(tx, 'PRODUCT', current.slug, data.slug);
      }

      // Variants are replaced as one set inside this transaction, so a failure leaves nothing half-saved.
      let variantChange: { before: string[]; after: string[] } | null = null;
      if (variants) {
        const existing = await tx.productVariant.findMany({ where: { productId: productId! } });
        const wanted = new Map(variants.map((v, i) => [variantKey(v), { ...v, sortOrder: i }]));
        const label = (v: { sizeValue: unknown; unit: string; packType: string | null }) => `${Number(v.sizeValue)} ${v.unit}${v.packType ? ` ${v.packType}` : ''}`;
        const toRemove = existing.filter((e) => !wanted.has(variantKey(e)));
        if (toRemove.length) await tx.productVariant.deleteMany({ where: { id: { in: toRemove.map((e) => e.id) } } });
        for (const [key, v] of wanted) {
          const match = existing.find((e) => variantKey(e) === key);
          if (match) await tx.productVariant.update({ where: { id: match.id }, data: { shown: v.shown, sortOrder: v.sortOrder } });
          else await tx.productVariant.create({ data: { productId: productId!, sizeValue: v.sizeValue, unit: v.unit, packType: v.packType, shown: v.shown, sortOrder: v.sortOrder } });
        }
        const beforeLabels = existing.map(label).sort();
        const afterLabels = [...wanted.values()].map(label).sort();
        if (JSON.stringify(beforeLabels) !== JSON.stringify(afterLabels)) variantChange = { before: beforeLabels, after: afterLabels };
      }

      const slug = data.slug ?? (before.slug as string);
      if (!id) {
        await writeAudit(tx, { actorId: actor.id, ip: actor.ip, action: 'product.create', entityType: 'Product', entityId: productId, changes: { slug, nameEn: data.nameEn ?? null, nameAr: data.nameAr ?? null, ...(variantChange ? { variants: variantChange } : {}) } });
      } else {
        const changes = diffFields(before, { ...before, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) });
        if (variantChange) changes.variants = variantChange;
        if (Object.keys(changes).length) await writeAudit(tx, { actorId: actor.id, ip: actor.ip, action: 'product.update', entityType: 'Product', entityId: productId, changes });
      }
      return { status: 'ok', item: { id: productId!, slug } };
    });
    if (result.status === 'ok') refreshPublicSite();
    return result;
  } catch (e) {
    if (isUnique(e, 'slug')) return invalid({ slug: 'slug_taken' });
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return invalid({ variants: 'duplicate_variant' });
    throw e;
  }
}

// ───────────────────────── hero slides ─────────────────────────

export const MAX_PUBLISHED_SLIDES = 3;

export function listHeroSlides() {
  return db.heroSlide.findMany({ include: { image: { select: { id: true, derivatives: true } } }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
}

export function getHeroSlide(id: string) {
  return db.heroSlide.findUnique({ where: { id }, include: { image: { select: { id: true, derivatives: true, altEn: true, altAr: true } } } });
}

export async function saveHeroSlide(actor: Actor, id: string | null, raw: unknown) {
  const checked = checkHero(raw, id ? 'update' : 'create');
  if (!checked.ok) return invalid(checked.errors);
  const data = checked.data;
  if (!(await imageExists(db, data.imageId))) return invalid({ imageId: 'unknown_image' });

  const result = await db.$transaction(async (tx): Promise<SaveResult<{ id: string }>> => {
    const patch = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as Prisma.HeroSlideUncheckedUpdateInput;
    if (!id) {
      const last = await tx.heroSlide.aggregate({ _max: { sortOrder: true } });
      const created = await tx.heroSlide.create({ data: { ...(patch as Prisma.HeroSlideUncheckedCreateInput), headlineEn: data.headlineEn ?? '', headlineAr: data.headlineAr ?? '', sortOrder: (last._max.sortOrder ?? 0) + 1 }, select: { id: true } });
      await writeAudit(tx, { actorId: actor.id, ip: actor.ip, action: 'hero.create', entityType: 'HeroSlide', entityId: created.id, changes: { headlineEn: data.headlineEn ?? null, headlineAr: data.headlineAr ?? null } });
      return { status: 'ok', item: created };
    }
    const current = await tx.heroSlide.findUnique({ where: { id } });
    if (!current) return { status: 'not_found' };
    try {
      assertUpdateKeepsPublishable('heroSlide', current, data);
    } catch (e) {
      if (e instanceof PublishRuleError) return invalid(missingToErrors(e.missing));
      throw e;
    }
    if (current.status === 'PUBLISHED') {
      const next = { ...current, ...data };
      const needs = ['sublineEn', 'sublineAr', 'ctaHref'].filter((f) => f in data && isBlank((next as Record<string, unknown>)[f]));
      if (needs.length) return invalid(missingToErrors(needs));
    }
    if (patch.headlineEn === null) patch.headlineEn = '';
    if (patch.headlineAr === null) patch.headlineAr = '';
    await tx.heroSlide.update({ where: { id }, data: patch });
    const changes = diffFields(current as unknown as Record<string, unknown>, { ...(current as unknown as Record<string, unknown>), ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) });
    if (Object.keys(changes).length) await writeAudit(tx, { actorId: actor.id, ip: actor.ip, action: 'hero.update', entityType: 'HeroSlide', entityId: id, changes });
    return { status: 'ok', item: { id } };
  });
  if (result.status === 'ok') refreshPublicSite();
  return result;
}

/** Saves a new slide order. Unknown or repeated ids are refused as a whole, so the previous order always stays intact. */
export async function reorderHeroSlides(actor: Actor, ids: unknown): Promise<{ status: 'ok' } | { status: 'invalid' }> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 || ids.some((i) => typeof i !== 'string') || new Set(ids).size !== ids.length) return { status: 'invalid' };
  const result = await db.$transaction(async (tx) => {
    const rows = await tx.heroSlide.findMany({ select: { id: true } });
    if (rows.length !== ids.length || !rows.every((r) => ids.includes(r.id))) return false;
    await Promise.all((ids as string[]).map((id, i) => tx.heroSlide.update({ where: { id }, data: { sortOrder: i } })));
    await writeAudit(tx, { actorId: actor.id, ip: actor.ip, action: 'hero.reorder', entityType: 'HeroSlide', changes: { order: ids } });
    return true;
  });
  if (!result) return { status: 'invalid' };
  refreshPublicSite();
  return { status: 'ok' };
}

// ───────────────────────── page copy blocks (US-008.6) ─────────────────────────

export const MAX_BLOCK_CHARS = 10_000;
/** Blocks that carry legal text: they may never be published empty in either language. */
export const LEGAL_BLOCKS = ['privacy', 'terms'];

export const listPageBlocks = () => db.pageBlock.findMany({ orderBy: { key: 'asc' } });
export const getPageBlockById = (id: string) => db.pageBlock.findUnique({ where: { id } });

export type BlockResult =
  | { status: 'ok'; updatedAt: string }
  | { status: 'invalid'; errors: Errors }
  | { status: 'conflict'; block: { titleEn: string; titleAr: string; bodyEn: string; bodyAr: string; updatedAt: string } }
  | { status: 'not_found' };

/**
 * Edits a block's text. Text is plain (shown as paragraphs, never as HTML). `expectedUpdatedAt` must match the stored
 * time, so a second editor is told about the newer version instead of silently overwriting it. The previous text goes
 * to the audit log.
 */
export async function savePageBlock(actor: Actor, id: string, raw: unknown): Promise<BlockResult> {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const errors: Errors = {};
  const patch: Partial<Record<'titleEn' | 'titleAr' | 'bodyEn' | 'bodyAr', string>> = {};
  for (const k of ['titleEn', 'titleAr', 'bodyEn', 'bodyAr'] as const) {
    if (!(k in src)) continue;
    if (typeof src[k] !== 'string') errors[k] = 'invalid';
    else if ((src[k] as string).length > MAX_BLOCK_CHARS) errors[k] = `too_long:${MAX_BLOCK_CHARS}`;
    else patch[k] = (src[k] as string).replace(/<[^>]*>/g, '').trim();
  }
  if (typeof src.expectedUpdatedAt !== 'string' || Number.isNaN(Date.parse(src.expectedUpdatedAt))) errors.expectedUpdatedAt = 'required';
  if (Object.keys(errors).length) return { status: 'invalid', errors };

  const result = await db.$transaction(async (tx): Promise<BlockResult> => {
    const current = await tx.pageBlock.findUnique({ where: { id } });
    if (!current) return { status: 'not_found' };
    if (current.updatedAt.getTime() !== Date.parse(src.expectedUpdatedAt as string)) {
      const { titleEn, titleAr, bodyEn, bodyAr } = current;
      return { status: 'conflict', block: { titleEn, titleAr, bodyEn, bodyAr, updatedAt: current.updatedAt.toISOString() } };
    }
    const next = { ...current, ...patch };
    if (current.status === 'PUBLISHED') {
      const missing = ['titleEn', 'titleAr', 'bodyEn', 'bodyAr'].filter((f) => isBlank((next as Record<string, unknown>)[f]));
      if (missing.length) return { status: 'invalid', errors: missingToErrors(missing) };
    }
    const changes = diffFields(current as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>);
    delete changes.updatedAt;
    if (!Object.keys(changes).length) return { status: 'ok', updatedAt: current.updatedAt.toISOString() };
    const saved = await tx.pageBlock.update({ where: { id }, data: { ...patch, editedByAdmin: true } });
    await writeAudit(tx, { actorId: actor.id, ip: actor.ip, action: 'block.update', entityType: 'PageBlock', entityId: id, changes });
    return { status: 'ok', updatedAt: saved.updatedAt.toISOString() };
  });
  if (result.status === 'ok') refreshPublicSite();
  return result;
}

// ───────────────────────── publish / unpublish ─────────────────────────

export type PublishResult =
  | { status: 'ok'; changed: boolean }
  | { status: 'invalid'; errors: Errors }
  | { status: 'not_found' };

/** Thrown by the publish checks below; carries the form errors to show. */
class ContentRuleError extends Error {
  constructor(public readonly errors: Errors) {
    super('content rule');
  }
}

type AltSource = { imageId?: string | null };

async function requireAltText(tx: Prisma.TransactionClient, row: AltSource) {
  if (!row.imageId) return;
  const img = await tx.mediaAsset.findUnique({ where: { id: row.imageId }, select: { altEn: true, altAr: true } });
  const missing = [isBlank(img?.altEn) ? 'altEn' : '', isBlank(img?.altAr) ? 'altAr' : ''].filter(Boolean);
  if (missing.length) throw new ContentRuleError({ imageId: 'alt_required' });
}

async function publishChecks(tx: Prisma.TransactionClient, entity: PublishableEntity, current: Record<string, unknown>) {
  if (entity === 'product') {
    const variants = await tx.productVariant.count({ where: { productId: current.id as string } });
    if (variants === 0) throw new ContentRuleError({ variants: 'variants_required' });
    await requireAltText(tx, current as AltSource);
  }
  if (entity === 'brand') await requireAltText(tx, current as AltSource);
  if (entity === 'heroSlide') {
    const errors: Errors = {};
    for (const f of ['sublineEn', 'sublineAr']) if (isBlank(current[f])) errors[f] = 'required_to_publish';
    if (isBlank(current.ctaHref)) errors.ctaHref = 'required_to_publish';
    if (Object.keys(errors).length) throw new ContentRuleError(errors);
    await requireAltText(tx, current as AltSource);
    // Serialise concurrent publishes so two editors cannot both take the third place.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(8005)`;
    const live = await tx.heroSlide.count({ where: { status: 'PUBLISHED', id: { not: current.id as string } } });
    if (live >= MAX_PUBLISHED_SLIDES) throw new ContentRuleError({ status: 'max_slides' });
  }
  if (entity === 'pageBlock' && LEGAL_BLOCKS.includes(current.key as string)) {
    const errors: Errors = {};
    for (const f of ['bodyEn', 'bodyAr']) if (isBlank(current[f])) errors[f] = 'required_to_publish';
    if (Object.keys(errors).length) throw new ContentRuleError(errors);
  }
}

const ENTITIES: readonly PublishableEntity[] = ['brand', 'product', 'heroSlide', 'pageBlock'];
export const isPublishableEntity = (v: unknown): v is PublishableEntity => ENTITIES.includes(v as PublishableEntity);

/**
 * Publishes or unpublishes one item. Publishing needs both languages complete (and, per kind: a variant, alt text on
 * its image, a call-to-action link, room among the three live slides). Repeating the current status changes nothing
 * and writes no audit entry.
 */
export async function publishItem(actor: Actor, entity: PublishableEntity, id: string, status: PublishStatus): Promise<PublishResult> {
  try {
    const r = await setPublishStatus(entity, id, status, actor.id, (tx, current) => publishChecks(tx, entity, current), actor.ip);
    if (r.changed) refreshPublicSite();
    return { status: 'ok', changed: r.changed };
  } catch (e) {
    if (e instanceof PublishRuleError) return { status: 'invalid', errors: missingToErrors(e.missing) };
    if (e instanceof ContentRuleError) return { status: 'invalid', errors: e.errors };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') return { status: 'not_found' };
    throw e;
  }
}
