import { describe, expect, it } from 'vitest';
import { MIN_MARQUEE_ITEMS, pickMarquee } from '@/lib/content/marquee';
import { fallbackSrc, parseDerivatives, srcSet, toPictureData } from '@/lib/media/picture';
import { displayPhone, telLink, waLink } from '@/lib/phone';
import { formatCount, paragraphs, pick, splitTagline } from '@/lib/text';

describe('paragraphs', () => {
  it('splits on blank lines and trims', () => {
    expect(paragraphs('One.\n\n  Two.  \n\n\nThree.')).toEqual(['One.', 'Two.', 'Three.']);
  });
  it('returns an empty list for null or blank input', () => {
    expect([paragraphs(null), paragraphs('  \n\n ')]).toEqual([[], []]);
  });
});

describe('splitTagline', () => {
  it('splits the English tagline after the first sentence', () => {
    expect(splitTagline('Crafted with Care. Inspired by Nature.')).toEqual({ first: 'Crafted with Care.', second: 'Inspired by Nature.' });
  });
  it('splits the Arabic tagline at the Arabic comma', () => {
    expect(splitTagline('صُنع بعناية، مستوحى من الطبيعة.')).toEqual({ first: 'صُنع بعناية،', second: 'مستوحى من الطبيعة.' });
  });
  it('keeps a single sentence whole', () => {
    expect(splitTagline('Only one part')).toEqual({ first: 'Only one part', second: '' });
  });
});

describe('pick', () => {
  it('returns the Arabic value only for ar and English otherwise', () => {
    expect([pick('ar', 'e', 'a'), pick('en', 'e', 'a'), pick('xx', 'e', 'a')]).toEqual(['a', 'e', 'e']);
  });
});

describe('formatCount', () => {
  it('uses Arabic-Indic digits for Arabic', () => {
    expect(formatCount(42, 'ar')).toBe('٤٢');
  });
  it('uses Latin digits for English', () => {
    expect(formatCount(42, 'en')).toBe('42');
  });
  it('formats zero', () => {
    expect(formatCount(0, 'en')).toBe('0');
  });
});

describe('phone helpers (US-003.7)', () => {
  it('builds the wa.me link from a stored number', () => {
    expect(waLink('+201100111887')).toBe('https://wa.me/201100111887');
  });
  it('returns null for an empty WhatsApp number so the button is hidden', () => {
    expect([waLink(''), waLink(undefined), waLink('  ')]).toEqual([null, null, null]);
  });
  it('builds a tel link', () => {
    expect(telLink('+20 110 011 1887')).toBe('tel:+201100111887');
  });
  it('formats Egyptian numbers readably', () => {
    expect(displayPhone('+201100111887')).toBe('+20 110 011 1887');
  });
  it('leaves other numbers as typed', () => {
    expect(displayPhone('+971 4 123 4567')).toBe('+971 4 123 4567');
  });
});

describe('pickMarquee (US-003.5)', () => {
  const item = (slug: string, group: string, hasImage = true) => ({ slug, group, hasImage });
  it('alternates between groups', () => {
    const out = pickMarquee([item('a1', 'A'), item('a2', 'A'), item('b1', 'B'), item('c1', 'C')], 4);
    expect(out.map((i) => i.slug)).toEqual(['a1', 'b1', 'c1', 'a2']);
  });
  it('skips products without an image', () => {
    expect(pickMarquee([item('a1', 'A', false), item('b1', 'B')]).map((i) => i.slug)).toEqual(['b1']);
  });
  it('caps the result at max', () => {
    const many = Array.from({ length: 30 }, (_, i) => item(`p${i}`, `g${i % 4}`));
    expect(pickMarquee(many, 12)).toHaveLength(12);
  });
  it('returns nothing for an empty list', () => {
    expect(pickMarquee([])).toEqual([]);
  });
  it('states the minimum item count', () => {
    expect(MIN_MARQUEE_ITEMS).toBe(4);
  });
});

describe('picture helpers', () => {
  const derivatives = { original: '/m/a/original.png', avif: { '320': '/m/a/320.avif', '640': '/m/a/640.avif' }, webp: { '320': '/m/a/320.webp', '640': '/m/a/640.webp' } };
  const row = { width: 700, height: 500, altEn: 'Mango', altAr: 'مانجو', derivatives };

  it('uses the alt text of the requested language only', () => {
    expect([toPictureData(row, 'en')?.alt, toPictureData(row, 'ar')?.alt]).toEqual(['Mango', 'مانجو']);
  });
  it('uses the fallback alt when the asset has none for that language', () => {
    expect(toPictureData({ ...row, altAr: null }, 'ar', 'نكتار')?.alt).toBe('نكتار');
  });
  it('returns null for a missing image or malformed derivatives', () => {
    expect([toPictureData(null, 'en'), toPictureData({ ...row, derivatives: { bad: 1 } }, 'en')]).toEqual([null, null]);
  });
  it.each([
    ['javascript:alert(1)'],
    ['//evil.example/x.webp'],
    ['/media/a.webp, https://evil/x 1w'],
    ['/media/a b.webp'],
    ['/media/a.webp"onerror=1'],
  ])('rejects the unsafe URL %s', (url) => {
    expect(parseDerivatives({ original: url, avif: {}, webp: {} })).toBeNull();
  });
  it('rejects a non-numeric rendition width', () => {
    expect(parseDerivatives({ original: '/media/a/o.png', avif: { big: '/media/a/big.avif' }, webp: {} })).toBeNull();
  });
  it('accepts the shape the media store writes', () => {
    expect(parseDerivatives({ original: '/media/0123456789abcdef/original.png', avif: { '320': '/media/0123456789abcdef/320.avif' }, webp: {} })).not.toBeNull();
  });
  it('rejects derivatives with non-string URLs', () => {
    expect(parseDerivatives({ original: 'x', avif: { '320': 5 }, webp: {} })).toBeNull();
  });
  it('orders srcset by width', () => {
    expect(srcSet({ '640': 'b', '320': 'a' })).toBe('a 320w, b 640w');
  });
  it('uses the largest WebP as the img fallback', () => {
    expect(fallbackSrc(derivatives)).toBe('/m/a/640.webp');
  });
});
