import path from 'node:path';
import { access, rm } from 'node:fs/promises';
import { Prisma, type MediaAsset } from '@prisma/client';
import { env } from '@/env';
import { db } from '@/lib/db';
import { assetFolder, processImage, toUrls, writeAssetFiles } from './pipeline';

export interface StoreOptions {
  fileName: string;
  altEn?: string;
  altAr?: string;
  mediaDir?: string;
  urlBase?: string;
}

/**
 * Stores an image once: the same bytes (same SHA-256) return the existing asset instead of a duplicate.
 * If the database write fails, the written files are removed so no orphan folder remains.
 */
export async function storeImage(input: Buffer, opts: StoreOptions): Promise<{ asset: MediaAsset; created: boolean }> {
  const img = await processImage(input);
  const existing = await db.mediaAsset.findUnique({ where: { sha256: img.sha256 } });
  if (existing) return { asset: existing, created: false };

  const mediaDir = path.resolve(opts.mediaDir ?? env.MEDIA_DIR);
  const folder = path.join(mediaDir, assetFolder(img.sha256));
  const existedBefore = await access(folder).then(() => true, () => false);
  await writeAssetFiles(mediaDir, img);
  try {
    const asset = await db.mediaAsset.create({
      data: {
        sha256: img.sha256,
        fileName: opts.fileName.slice(0, 255),
        mime: img.mime,
        width: img.width,
        height: img.height,
        bytes: img.bytes,
        lowRes: img.lowRes,
        altEn: opts.altEn,
        altAr: opts.altAr,
        derivatives: toUrls(opts.urlBase ?? env.MEDIA_URL_BASE, img.sha256, img.names) as unknown as Prisma.InputJsonValue,
      },
    });
    return { asset, created: true };
  } catch (e) {
    // A concurrent upload of the same bytes won the race: reuse its row and keep its files.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const winner = await db.mediaAsset.findUnique({ where: { sha256: img.sha256 } });
      if (winner) return { asset: winner, created: false };
    }
    // Only remove files this call created.
    if (!existedBefore) await rm(folder, { recursive: true, force: true });
    throw e;
  }
}
