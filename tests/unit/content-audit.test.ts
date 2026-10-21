import { describe, expect, it } from 'vitest';
import { bannedHits, droppedGrammages, duplicateCardNames, linksMatching, ownerLinks, visibleText } from '@/lib/content/audit';

describe('visibleText', () => {
  it('drops scripts, styles and tags and decodes entities', () => {
    expect(visibleText('<style>a{}</style><script>var Katchup=1</script><p>Tom &amp; <b>Jerry</b></p>')).toBe('Tom & Jerry');
  });
});

describe('bannedHits (US-004.6)', () => {
  it.each(['Tomato Katchup', 'Sesam Tahini', 'Guava Orang Juice', 'Keurig Dr Pepper', '200 countries'])('flags "%s"', (t) => {
    expect(bannedHits(t)).not.toEqual([]);
  });
  it('accepts the correct spellings', () => {
    expect(bannedHits('Tomato Ketchup, Sesame Tahini, Orange Nectar')).toEqual([]);
  });
});

describe('droppedGrammages', () => {
  it.each(['Jam 360g', 'Jam 370 g', 'Sauce 420gm', 'jam 360 gram'])('flags "%s"', (t) => {
    expect(droppedGrammages(t)).toHaveLength(1);
  });
  it.each(['400g', '650g', 'Tomato paste 1360g', '2420g tin', '3.60g', 'Tin 400g and glass 285g'])('allows "%s"', (t) => {
    expect(droppedGrammages(t)).toEqual([]);
  });
});

describe('linksMatching', () => {
  const html = '<a href="/en/brands/lora">a</a><a href="/en/brands/lora?x=1#y">b</a><a href="/en/about">c</a><a href="/ar/brands/tama">d</a>';
  it('finds unique matching paths without queries', () => {
    expect(linksMatching(html, /^\/(en|ar)\/brands\/[a-z-]+$/).sort()).toEqual(['/ar/brands/tama', '/en/brands/lora']);
  });
});

describe('ownerLinks (exactly one brand or line per product)', () => {
  it('finds the owner tag link', () => {
    expect(ownerLinks('<a class="tag" href="/en/brands/tama">TAMA</a><a class="btn" href="/x">x</a>')).toEqual(['/en/brands/tama']);
  });
  it('finds two when a product is listed under two owners', () => {
    expect(ownerLinks('<a href="/a" class="info tag">A</a><a class="tag" href="/b">B</a>')).toHaveLength(2);
  });
  it('finds none for a page without an owner', () => {
    expect(ownerLinks('<a class="btn" href="/x">x</a>')).toEqual([]);
  });
});

describe('duplicateCardNames', () => {
  it('reports a product name used twice on a brand page', () => {
    const card = (n: string) => `<a class="pcard" href="/x"><span class="tag">T</span><h3>${n}</h3></a>`;
    expect(duplicateCardNames(card('Mango') + card('Lemon') + card('Mango'))).toEqual(['Mango']);
  });
  it('returns nothing when names are unique', () => {
    expect(duplicateCardNames('<a class="pcard" href="/x"><h3>A</h3></a><a class="pcard" href="/y"><h3>B</h3></a>')).toEqual([]);
  });
});
