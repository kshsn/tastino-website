// Content rules shared by the seed, the admin (Epic 8) and the tests.

export type PublishableEntity = 'brand' | 'product' | 'pageBlock' | 'heroSlide';

/** Fields that must be filled in BOTH languages before an item can be published (no English fallback). */
export const REQUIRED_TO_PUBLISH: Record<PublishableEntity, readonly string[]> = {
  brand: ['nameEn', 'nameAr'],
  product: ['nameEn', 'nameAr', 'descriptionEn', 'descriptionAr'],
  pageBlock: ['titleEn', 'titleAr', 'bodyEn', 'bodyAr'],
  heroSlide: ['headlineEn', 'headlineAr'],
};

export const isBlank = (v: unknown) => typeof v !== 'string' || v.trim().length === 0;

/** Names of required fields that are empty or whitespace-only. */
export function missingForPublish(entity: PublishableEntity, record: Record<string, unknown>): string[] {
  return REQUIRED_TO_PUBLISH[entity].filter((f) => isBlank(record[f]));
}

export class PublishRuleError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Cannot publish: missing ${missing.join(', ')}`);
    this.name = 'PublishRuleError';
  }
}

export function assertPublishable(entity: PublishableEntity, record: Record<string, unknown>) {
  const missing = missingForPublish(entity, record);
  if (missing.length) throw new PublishRuleError(missing);
}

/** A published item may not be edited into an incomplete state; it must be unpublished first. */
export function assertUpdateKeepsPublishable(
  entity: PublishableEntity,
  current: Record<string, unknown> & { status?: string },
  patch: Record<string, unknown>,
) {
  if (current.status !== 'PUBLISHED') return;
  assertPublishable(entity, { ...current, ...patch });
}

/** Label misspellings that must never appear on the site (house rule, US-002.4 / US-004.6). */
export const BANNED_SPELLINGS: readonly RegExp[] = [/\bkatchup\b/i, /\bsesam\b/i, /\borang\b/i];

/** Borrowed boilerplate from the old site (US-002.7). */
export const BANNED_BOILERPLATE: readonly RegExp[] = [/keurig/i, /\$1 billion/i, /200 countries/i, /one billion times/i];

export function findBanned(text: string, patterns: readonly RegExp[] = [...BANNED_SPELLINGS, ...BANNED_BOILERPLATE]) {
  return patterns.filter((p) => p.test(text)).map((p) => p.source);
}

/** Jam and sauce sizes dropped by decision: 400g is the standard (650g is kept as a second jam size). */
export const BANNED_GRAMMAGES = [360, 370, 420] as const;
