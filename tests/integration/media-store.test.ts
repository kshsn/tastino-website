import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { assetFolder } from '@/lib/media/pipeline';
import { storeImage } from '@/lib/media/store';

const png = (seed: number) =>
  sharp({ create: { width: 700, height: 500, channels: 3, background: { r: seed % 255, g: 90, b: 30 } } }).png().toBuffer();

afterAll(() => db.$disconnect());

describe('storeImage (US-002.5)', () => {
  it('stores one asset with derivative URLs under the media base', async () => {
    const { asset } = await storeImage(await png(11), { fileName: 'a.png', altEn: 'A', altAr: 'أ' });
    expect((asset.derivatives as { webp: Record<string, string> }).webp['640']).toMatch(/^\/media\/[0-9a-f]{16}\/640\.webp$/);
  });

  it('writes the files to disk', async () => {
    const { asset } = await storeImage(await png(12), { fileName: 'b.png' });
    expect(existsSync(path.resolve('tests/.media', assetFolder(asset.sha256), '320.avif'))).toBe(true);
  });

  it('returns the existing asset when the same file is uploaded twice', async () => {
    const buf = await png(13);
    const a = await storeImage(buf, { fileName: 'c.png' });
    const b = await storeImage(Buffer.from(buf), { fileName: 'c-again.png' });
    expect([b.created, b.asset.id]).toEqual([false, a.asset.id]);
  });

  it('writes nothing to the database for an invalid file', async () => {
    const before = await db.mediaAsset.count();
    await storeImage(Buffer.from('not an image'), { fileName: 'x.png' }).catch(() => {});
    expect(await db.mediaAsset.count()).toBe(before);
  });
});
