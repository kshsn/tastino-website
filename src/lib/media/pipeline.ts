import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp, { type Metadata } from 'sharp';

export const WIDTHS = [320, 640, 1024] as const;
export const MAX_BYTES = 10 * 1024 * 1024;
export const LOW_RES_PX = 1000;
/** Decompression-bomb guards: tiny files can declare enormous dimensions. */
export const MAX_PIXELS = 40_000_000;
export const MAX_SIDE = 12_000;
/** Largest rendition served; bigger sources are scaled down to this. */
export const MAX_RENDITION = 2048;
const SHARP_OPTS = { limitInputPixels: MAX_PIXELS, sequentialRead: true } as const;
const ACCEPTED = new Set(['jpeg', 'png', 'webp']);
const EXT: Record<string, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };

export class MediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaError';
  }
}

export interface Derivatives {
  original: string;
  avif: Record<string, string>;
  webp: Record<string, string>;
}

export interface ProcessedImage {
  sha256: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  lowRes: boolean;
  /** Relative file names inside the asset folder, with their content. */
  files: { name: string; data: Buffer }[];
  /** Same keys as Derivatives, but file names relative to the asset folder. */
  names: Derivatives;
}

/**
 * Validates an upload by its content (not its extension) and renders AVIF + WebP at 320/640/1024px.
 * Widths larger than the source are skipped: images are never upscaled.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new MediaError('The file is empty.');
  if (input.length > MAX_BYTES) throw new MediaError('The file is larger than 10 MB.');

  let meta: Metadata;
  try {
    meta = await sharp(input, SHARP_OPTS).metadata();
  } catch {
    throw new MediaError('The file is not a supported image.');
  }
  if (!meta.format || !ACCEPTED.has(meta.format) || !meta.width || !meta.height) {
    throw new MediaError('Only JPG, PNG or WebP images are accepted.');
  }
  if (meta.width > MAX_SIDE || meta.height > MAX_SIDE || meta.width * meta.height > MAX_PIXELS) {
    throw new MediaError('The image dimensions are too large.');
  }

  const sha256 = createHash('sha256').update(input).digest('hex');
  const originalName = `original.${EXT[meta.format]}`;
  // Re-encoded original: same format, but EXIF/GPS metadata and any trailing bytes are dropped.
  const cleanOriginal = await sharp(input, SHARP_OPTS).rotate().toBuffer();
  const files: ProcessedImage['files'] = [{ name: originalName, data: cleanOriginal }];
  const names: Derivatives = { original: originalName, avif: {}, webp: {} };

  const top = Math.min(meta.width, MAX_RENDITION);
  const widths = WIDTHS.filter((w) => w < top);
  for (const w of [...widths, top]) {
    const base = sharp(input, SHARP_OPTS).rotate().resize({ width: w, withoutEnlargement: true });
    const [avif, webp] = await Promise.all([
      base.clone().avif({ quality: 60 }).toBuffer(),
      base.clone().webp({ quality: 80 }).toBuffer(),
    ]);
    files.push({ name: `${w}.avif`, data: avif }, { name: `${w}.webp`, data: webp });
    names.avif[w] = `${w}.avif`;
    names.webp[w] = `${w}.webp`;
  }

  return {
    sha256,
    mime: `image/${meta.format}`,
    width: meta.width,
    height: meta.height,
    bytes: input.length,
    lowRes: Math.max(meta.width, meta.height) < LOW_RES_PX,
    files,
    names,
  };
}

/** Folder name for an asset: the first 16 hex chars of its hash. */
export const assetFolder = (sha256: string) => sha256.slice(0, 16);

/**
 * Writes all files into `<mediaDir>/<folder>` atomically: a temp folder is renamed into place,
 * so an interrupted write never leaves a partial asset.
 */
export async function writeAssetFiles(mediaDir: string, img: ProcessedImage) {
  const finalDir = path.join(mediaDir, assetFolder(img.sha256));
  // Same bytes are already on disk (e.g. a concurrent upload won): never replace live files.
  if (await access(finalDir).then(() => true, () => false)) return finalDir;
  const tmpDir = path.join(mediaDir, `.tmp-${randomUUID()}`);
  await mkdir(tmpDir, { recursive: true });
  try {
    await Promise.all(img.files.map((f) => writeFile(path.join(tmpDir, f.name), f.data)));
    await rename(tmpDir, finalDir);
  } catch (e) {
    await rm(tmpDir, { recursive: true, force: true });
    throw e;
  }
  return finalDir;
}

/** Public URLs for the derivative names, under the media URL base. */
export function toUrls(urlBase: string, sha256: string, names: Derivatives): Derivatives {
  const prefix = `${urlBase.replace(/\/+$/, '')}/${assetFolder(sha256)}/`;
  const map = (r: Record<string, string>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, prefix + v]));
  return { original: prefix + names.original, avif: map(names.avif), webp: map(names.webp) };
}
