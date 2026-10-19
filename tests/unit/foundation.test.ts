import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import ar from '../../messages/ar.json';
import { parseEnv } from '@/env';
import { stripUnsupportedLocale, swapLocale } from '@/lib/locale-path';

const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('US-001.1 env validation', () => {
  it('fails fast and names the missing variable', () => {
    expect(() => parseEnv({})).toThrow(/SITE_URL/);
  });
  it('strips a trailing slash from SITE_URL', () => {
    expect(parseEnv({ SITE_URL: 'https://tastinofoods.com/' }).SITE_URL).toBe('https://tastinofoods.com');
  });
});

describe('US-001.3 unsupported locale prefixes', () => {
  it.each([
    ['/fr/about', '/about'],
    ['/fr', '/'],
    ['/en-US/products', '/products'],
  ])('%s is re-routed as %s', (input, out) => {
    expect(stripUnsupportedLocale(input)).toBe(out);
  });
  it.each(['/fr//evil.com', '/fr///evil.com', '/xx/\\evil.com', '/en-US//evil.com/x'])(
    'never returns a protocol-relative path for %s',
    (input) => {
      expect(stripUnsupportedLocale(input)).toMatch(/^\/(?![/\\])/);
    },
  );
  it.each(['/en', '/ar/about', '/about', '/brands/tama', '/'])('%s is left alone', (input) => {
    expect(stripUnsupportedLocale(input)).toBeNull();
  });
});

describe('US-001.4 language switch keeps the page', () => {
  it.each([
    ['/en/brands/tama', 'ar', '/ar/brands/tama'],
    ['/ar', 'en', '/en'],
    ['/ar/about', 'en', '/en/about'],
  ])('%s → %s = %s', (path, to, out) => {
    expect(swapLocale(path, to)).toBe(out);
  });
});

describe('US-001.5 official logo', () => {
  it('public copy is byte-for-byte identical to the supplied file', () => {
    expect(sha('public/brand/tastino-logo.svg')).toBe(sha('.claude/source/logo/tastino-logo.svg'));
  });
});

describe('Bilingual messages', () => {
  it('English and Arabic define exactly the same keys', () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });
  it('no message is empty in either language', () => {
    for (const msgs of [en, ar]) {
      const flat = keys(msgs).map((k) => k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], msgs));
      expect(flat.every((v) => typeof v === 'string' && v.trim().length > 0)).toBe(true);
    }
  });
  it('the old placeholder phone number never appears', () => {
    expect(JSON.stringify([en, ar])).not.toContain('555');
  });
});
