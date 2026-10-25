import path from 'node:path';
import { rm } from 'node:fs/promises';
import { env } from '@/env';
import { db } from '@/lib/db';
import { MediaError, assetFolder } from '@/lib/media/pipeline';
import { storeImage } from '@/lib/media/store';
import { diffFields, writeAudit } from './audit';
import { MAX_SHORT, text } from './content-validate';
import type { Actor } from './content-service';
import { refreshPublicSite } from './revalidate';

export interface MediaRow {
  id: string;
  fileName: string;
  width: number;
  height: number;
  bytes: number;
  lowRes: boolean;
  altEn: string | null;
  altAr: string | null;
  derivatives: unknown;
  createdAt: string;
}

const toRow = (a: { id: string; fileName: string; width: number; height: number; bytes: number; lowRes: boolean; altEn: string | null; altAr: string | null; derivatives: unknown; createdAt: Date }): MediaRow => ({
  id: a.id, fileName: a.fileName, width: a.width, height: a.height, bytes: a.bytes, lowRes: a.lowRes, altEn: a.altEn, altAr: a.altAr, derivatives: a.derivatives, createdAt: a.createdAt.toISOString(),
});

/** The library, newest first; the search matches file name and alt text in either language. */
export async function listMedia(search?: string | null, limit = 60): Promise<MediaRow[]> {
  const q = text(search)?.slice(0, 80);
  const like = q ? { contains: q, mode: 'insensitive' as const } : null;
  const rows = await db.mediaAsset.findMany({
    where: like ? { OR: [{ fileName: like }, { altEn: like }, { altAr: like }] } : undefined,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
  });
  return rows.map(toRow);
}

export type UploadResult =
  | { status: 'ok'; asset: MediaRow; created: boolean }
  | { status: 'invalid'; error: string };

/** Stores one upload. The same bytes answer with the existing asset (`created: false`) so the editor can reuse it. */
export async function uploadMedia(actor: Actor, input: Buffer, fileName: string, altEn?: string | null, altAr?: string | null): Promise<UploadResult> {
  try {
    const { asset, created } = await storeImage(input, { fileName: path.basename(fileName).replace(/[^\w.\- ]+/g, '_') || 'image', altEn: text(altEn)?.slice(0, MAX_SHORT), altAr: text(altAr)?.slice(0, MAX_SHORT) });
    if (created) {
      await writeAudit(db, { actorId: actor.id, ip: actor.ip, action: 'media.upload', entityType: 'MediaAsset', entityId: asset.id, changes: { fileName: asset.fileName, bytes: asset.bytes, width: asset.width, height: asset.height } });
    }
    return { status: 'ok', asset: toRow(asset), created };
  } catch (e) {
    if (e instanceof MediaError) return { status: 'invalid', error: e.message };
    throw e;
  }
}

export async function updateMediaAlt(actor: Actor, id: string, raw: unknown): Promise<{ status: 'ok'; asset: MediaRow } | { status: 'not_found' } | { status: 'invalid'; errors: Record<string, string> }> {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const data: { altEn?: string | null; altAr?: string | null } = {};
  for (const k of ['altEn', 'altAr'] as const) {
    if (!(k in src)) continue;
    if (src[k] !== null && typeof src[k] !== 'string') errors[k] = 'invalid';
    else if (typeof src[k] === 'string' && (src[k] as string).trim().length > MAX_SHORT) errors[k] = `too_long:${MAX_SHORT}`;
    else data[k] = text(src[k]);
  }
  if (Object.keys(errors).length) return { status: 'invalid', errors };
  const result = await db.$transaction(async (tx) => {
    const current = await tx.mediaAsset.findUnique({ where: { id } });
    if (!current) return null;
    const updated = await tx.mediaAsset.update({ where: { id }, data });
    const changes = diffFields({ altEn: current.altEn, altAr: current.altAr }, { altEn: updated.altEn, altAr: updated.altAr });
    if (Object.keys(changes).length) await writeAudit(tx, { actorId: actor.id, ip: actor.ip, action: 'media.update', entityType: 'MediaAsset', entityId: id, changes });
    return updated;
  });
  if (!result) return { status: 'not_found' };
  refreshPublicSite();
  return { status: 'ok', asset: toRow(result) };
}

export interface MediaUsage {
  brands: { id: string; name: string }[];
  products: { id: string; name: string }[];
  slides: { id: string; name: string }[];
}

export async function mediaUsage(id: string): Promise<MediaUsage> {
  const [brands, products, slides] = await Promise.all([
    db.brand.findMany({ where: { imageId: id }, select: { id: true, nameEn: true } }),
    db.product.findMany({ where: { imageId: id }, select: { id: true, nameEn: true } }),
    db.heroSlide.findMany({ where: { imageId: id }, select: { id: true, headlineEn: true } }),
  ]);
  return {
    brands: brands.map((b) => ({ id: b.id, name: b.nameEn })),
    products: products.map((p) => ({ id: p.id, name: p.nameEn })),
    slides: slides.map((s) => ({ id: s.id, name: s.headlineEn })),
  };
}

/** Deletes an asset nobody uses. An image in use is refused with the list of places using it. */
export async function deleteMedia(actor: Actor, id: string): Promise<{ status: 'ok' } | { status: 'not_found' } | { status: 'in_use'; usage: MediaUsage }> {
  const usage = await mediaUsage(id);
  if (usage.brands.length || usage.products.length || usage.slides.length) return { status: 'in_use', usage };
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) return { status: 'not_found' };
  try {
    await db.$transaction(async (tx) => {
      await tx.mediaAsset.delete({ where: { id } });
      await writeAudit(tx, { actorId: actor.id, ip: actor.ip, action: 'media.delete', entityType: 'MediaAsset', entityId: id, changes: { fileName: asset.fileName } });
    });
  } catch {
    // The image was assigned between the check and the delete (foreign keys would only clear it): report it as in use.
    return { status: 'in_use', usage: await mediaUsage(id) };
  }
  await rm(path.join(path.resolve(env.MEDIA_DIR), assetFolder(asset.sha256)), { recursive: true, force: true });
  refreshPublicSite();
  return { status: 'ok' };
}
