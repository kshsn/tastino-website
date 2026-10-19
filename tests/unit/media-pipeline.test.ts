import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { MediaError, processImage, toUrls } from '@/lib/media/pipeline';

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 1 } } }).png().toBuffer();

describe('processImage (US-002.5)', () => {
  it('renders AVIF and WebP at 320, 640 and 1024 plus the source width for a large image', async () => {
    const out = await processImage(await png(1600, 900));
    expect(Object.keys(out.names.webp).map(Number).sort((a, b) => a - b)).toEqual([320, 640, 1024, 1600]);
  });
  it('never upscales: a 300px image only gets a 300px rendition', async () => {
    const out = await processImage(await png(300, 500));
    expect(Object.keys(out.names.avif)).toEqual(['300']);
  });
  it('caps the largest rendition at 2048px', async () => {
    const out = await processImage(await png(3000, 1000));
    expect(Math.max(...Object.keys(out.names.webp).map(Number))).toBe(2048);
  });
  it('rejects a decompression bomb (huge dimensions in a tiny file)', async () => {
    const bomb = await sharp({ create: { width: 15000, height: 15000, channels: 3, background: '#fff' } }).png().toBuffer();
    await expect(processImage(bomb)).rejects.toThrow(MediaError);
  });
  it('strips EXIF metadata from the stored original', async () => {
    const withExif = await sharp(await png(200, 200)).withExif({ IFD0: { Copyright: 'secret-gps' } }).png().toBuffer();
    const out = await processImage(withExif);
    expect((await sharp(out.files[0].data).metadata()).exif).toBeUndefined();
  });
  it('marks images under 1000px as low resolution', async () => {
    expect((await processImage(await png(800, 600))).lowRes).toBe(true);
  });
  it('keeps the original file', async () => {
    expect((await processImage(await png(400, 400))).names.original).toBe('original.png');
  });
  it('rejects an empty file', async () => {
    await expect(processImage(Buffer.alloc(0))).rejects.toThrow(MediaError);
  });
  it('rejects a non-image file whatever its name', async () => {
    await expect(processImage(Buffer.from('MZ fake executable'))).rejects.toThrow(MediaError);
  });
  it('rejects SVG (scripts possible)', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
    await expect(processImage(svg)).rejects.toThrow(/JPG, PNG or WebP/);
  });
  it('gives identical bytes the same hash', async () => {
    const buf = await png(50, 50);
    expect((await processImage(buf)).sha256).toBe((await processImage(Buffer.from(buf))).sha256);
  });
});

describe('toUrls', () => {
  it('prefixes every derivative with the media base and asset folder', () => {
    const urls = toUrls('/media/', 'abcdef0123456789ffff', { original: 'original.png', avif: { 320: '320.avif' }, webp: {} });
    expect(urls.avif['320']).toBe('/media/abcdef0123456789/320.avif');
  });
});
