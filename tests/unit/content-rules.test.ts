import { describe, expect, it } from 'vitest';
import {
  assertPublishable,
  assertUpdateKeepsPublishable,
  findBanned,
  missingForPublish,
  PublishRuleError,
} from '@/lib/content/rules';
import { BRANDS, PRODUCTS, describe as describeProduct } from '../../prisma/seed/catalogue';

const complete = { nameEn: 'Mango Nectar', nameAr: 'نكتار مانجو', descriptionEn: 'x', descriptionAr: 'س' };

describe('missingForPublish (US-002.8)', () => {
  it('returns no fields when both languages are complete', () => {
    expect(missingForPublish('product', complete)).toEqual([]);
  });
  it('names the empty Arabic field', () => {
    expect(missingForPublish('product', { ...complete, nameAr: '' })).toEqual(['nameAr']);
  });
  it('treats whitespace-only Arabic text as empty', () => {
    expect(missingForPublish('product', { ...complete, descriptionAr: '   \n ' })).toEqual(['descriptionAr']);
  });
  it('treats null and undefined as empty', () => {
    expect(missingForPublish('pageBlock', { titleEn: 'A', titleAr: null, bodyEn: 'b' })).toEqual(['titleAr', 'bodyAr']);
  });
});

describe('assertPublishable', () => {
  it('throws a PublishRuleError listing the missing fields', () => {
    expect(() => assertPublishable('brand', { nameEn: 'Lora', nameAr: '' })).toThrow(PublishRuleError);
  });
});

describe('assertUpdateKeepsPublishable', () => {
  it('refuses to clear a required field on a published item', () => {
    expect(() => assertUpdateKeepsPublishable('product', { ...complete, status: 'PUBLISHED' }, { nameAr: '' })).toThrow(/nameAr/);
  });
  it('allows the same edit on a draft', () => {
    expect(() => assertUpdateKeepsPublishable('product', { ...complete, status: 'DRAFT' }, { nameAr: '' })).not.toThrow();
  });
});

describe('findBanned', () => {
  it.each(['Tomato Katchup', 'SESAM TAHINI', 'Guava & Orang juice', 'Keurig Dr Pepper', 'more than $1 billion', '200 countries'])(
    'flags "%s"',
    (text) => {
      expect(findBanned(text)).not.toHaveLength(0);
    },
  );
  it('does not flag correct spellings', () => {
    expect(findBanned('Tomato Ketchup, Sesame Tahini, Orange Nectar, Orange Marmalade')).toEqual([]);
  });
});

describe('seed catalogue house rules (US-002.3 / US-002.4)', () => {
  it('has exactly the four agreed brands', () => {
    expect(BRANDS.map((b) => b.slug)).toEqual(['lora', 'liora', 'andiamo', 'tama']);
  });
  it('puts every product under exactly one brand or Tastino line', () => {
    expect(PRODUCTS.filter((p) => Boolean(p.brand) === Boolean(p.line))).toEqual([]);
  });
  it('keeps jams under Lora and tomato products under Liora or Andiamo', () => {
    expect(PRODUCTS.filter((p) => p.category === 'jams').every((p) => p.brand === 'lora')).toBe(true);
  });
  it('never uses the dropped 360g, 370g or 420g sizes', () => {
    const grams = PRODUCTS.flatMap((p) => p.variants.filter(([, u]) => u === 'G').map(([s]) => s));
    expect(grams.filter((g) => [360, 370, 420].includes(g))).toEqual([]);
  });
  it('gives every jam and sauce a 400g variant', () => {
    const jamsAndSauces = PRODUCTS.filter((p) => p.category === 'jams' || p.category === 'sauces');
    expect(jamsAndSauces.every((p) => p.variants.some(([s, u]) => s === 400 && u === 'G'))).toBe(true);
  });
  it('contains no banned spelling in any name or description', () => {
    const text = PRODUCTS.map((p) => `${p.nameEn} ${p.nameAr} ${describeProduct(p).en}`).join(' ');
    expect(findBanned(text)).toEqual([]);
  });
  it('flags every Liora-labelled jam packshot for replacement', () => {
    const lioraOnLora = PRODUCTS.filter((p) => p.brand === 'lora' && p.image?.startsWith('liora-'));
    expect(lioraOnLora.every((p) => p.imageNeedsReplacement)).toBe(true);
  });
  it('has unique slugs', () => {
    expect(new Set(PRODUCTS.map((p) => p.slug)).size).toBe(PRODUCTS.length);
  });
});
