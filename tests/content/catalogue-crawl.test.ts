import { beforeAll, describe, expect, it } from 'vitest';
import { bannedHits, droppedGrammages, duplicateCardNames, linksMatching, ownerLinks, visibleText } from '@/lib/content/audit';

// US-004.6: crawls the public brand and product pages in English and Arabic and fails on any known wrong value.
// Needs a running build: `npm run build`, then `npm start` (port 3000), or set CONTENT_BASE_URL.
const BASE = (process.env.CONTENT_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const LOCALES = ['en', 'ar'] as const;
const OWNER = /^\/(en|ar)\/(brands\/(lora|liora|andiamo|tama)|products\/tastino-lines)$/;

interface Page {
  url: string;
  status: number;
  html: string;
}

async function get(path: string): Promise<Page> {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return { url: path, status: res.status, html: await res.text() };
}

const pages: Record<string, Page[]> = { brand: [], product: [], index: [] };

beforeAll(async () => {
  for (const locale of LOCALES) {
    const brandsIndex = await get(`/${locale}/brands`);
    const listing = await get(`/${locale}/products`);
    const lines = await get(`/${locale}/products/tastino-lines`);
    pages.index.push(brandsIndex, listing, lines);

    const brandPaths = linksMatching(brandsIndex.html, new RegExp(`^/${locale}/brands/[a-z0-9-]+$`));
    const productPaths = linksMatching(listing.html, new RegExp(`^/${locale}/products/(?!tastino-lines$)[a-z0-9-]+$`));
    pages.brand.push(...(await Promise.all(brandPaths.map(get))));
    pages.product.push(...(await Promise.all(productPaths.map(get))));
  }
}, 300_000);

describe('catalogue content crawl (US-004.6)', () => {
  it('reaches the four brands and every product in both languages', () => {
    expect([pages.brand.length, pages.product.length >= 80]).toEqual([8, true]);
  });

  it('answers 200 on every page', () => {
    const bad = [...pages.index, ...pages.brand, ...pages.product].filter((p) => p.status !== 200).map((p) => `${p.url} → ${p.status}`);
    expect(bad).toEqual([]);
  });

  it('shows no banned spelling or borrowed boilerplate anywhere', () => {
    const hits = [...pages.index, ...pages.brand, ...pages.product].flatMap((p) => bannedHits(visibleText(p.html)).map((h) => `${p.url}: ${h}`));
    expect(hits).toEqual([]);
  });

  it('shows no dropped 360g, 370g or 420g size anywhere', () => {
    const hits = [...pages.index, ...pages.brand, ...pages.product].flatMap((p) => droppedGrammages(visibleText(p.html)).map((h) => `${p.url}: ${h}`));
    expect(hits).toEqual([]);
  });

  it('puts every product under exactly one brand or Tastino line', () => {
    const bad = pages.product.filter((p) => {
      const owners = ownerLinks(p.html);
      return owners.length !== 1 || !OWNER.test(owners[0]);
    });
    expect(bad.map((p) => `${p.url}: ${ownerLinks(p.html).join(', ') || 'no owner'}`)).toEqual([]);
  });

  it('has no duplicate product name within a brand', () => {
    const dups = pages.brand.flatMap((p) => duplicateCardNames(p.html).map((n) => `${p.url}: ${n}`));
    expect(dups).toEqual([]);
  });

  it('never links a Tastino line to a brand page', () => {
    const lines = pages.index.filter((p) => p.url.endsWith('/products/tastino-lines'));
    const brandLinksInSections = lines.flatMap((p) => linksMatching(p.html.split('<section')[1] ?? '', /\/brands\//));
    expect(brandLinksInSections).toEqual([]);
  });

  it('keeps the 400g standard on Lora jams and shows 650g as the second size', () => {
    const lora = pages.brand.filter((p) => p.url.endsWith('/brands/lora')).map((p) => visibleText(p.html));
    expect(lora.every((t) => t.includes('400g') && t.includes('650g'))).toBe(true);
  });
});
