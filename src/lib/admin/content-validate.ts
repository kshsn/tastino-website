// Pure input checks for the content screens (Epic 8). Browser-safe: no database, no server-only imports.

export type Errors = Record<string, string>;
export type Checked<T> = { ok: true; data: T } | { ok: false; errors: Errors };

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
export const SIMPLE_EMAIL = /^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/;
export const INTERNATIONAL_PHONE = /^\+\d{8,15}$/;

export const MAX_SHORT = 200;
export const MAX_LONG = 4000;

const asObject = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** A trimmed string, or null when the value is empty or not text. */
export function text(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

/** A trimmed optional text field with a length limit; `undefined` when absent from the input (so a partial update leaves it alone). */
function optionalText(src: Record<string, unknown>, key: string, max: number, errors: Errors): string | null | undefined {
  if (!(key in src)) return undefined;
  const v = src[key];
  if (v !== null && typeof v !== 'string') {
    errors[key] = 'invalid';
    return undefined;
  }
  const t = text(v);
  if (t && t.length > max) errors[key] = `too_long:${max}`;
  return t;
}

export const idOrNull = (v: unknown): string | null | undefined => (v === undefined ? undefined : v === null || v === '' ? null : typeof v === 'string' && /^[\w-]{1,40}$/.test(v) ? v : undefined);

// ───────── brands ─────────

export const BRAND_VISIBILITY = ['LIVE', 'COMING_SOON', 'HIDDEN'] as const;
export type BrandVisibilityKey = (typeof BRAND_VISIBILITY)[number];

export interface BrandInput {
  slug: string;
  nameEn: string | null;
  nameAr: string | null;
  categoryEn?: string | null;
  categoryAr?: string | null;
  taglineEn?: string | null;
  taglineAr?: string | null;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  accentColor: string;
  visibility?: BrandVisibilityKey;
  sortOrder?: number;
  imageId?: string | null;
  /** The editor confirmed hiding a brand that has published products. */
  confirmHide?: boolean;
}

/** A brand can be saved as a draft with a slug and one name; the rest is checked on publish. */
export function checkBrand(raw: unknown, mode: 'create' | 'update'): Checked<Partial<BrandInput>> {
  const src = asObject(raw);
  const errors: Errors = {};
  const out: Partial<BrandInput> = {};

  if (mode === 'create' || 'slug' in src) {
    const slug = text(src.slug)?.toLowerCase();
    if (!slug) errors.slug = 'required';
    else if (!SLUG.test(slug) || slug.length > 60) errors.slug = 'invalid_slug';
    else out.slug = slug;
  }
  for (const k of ['nameEn', 'nameAr'] as const) {
    const v = optionalText(src, k, MAX_SHORT, errors);
    if (v !== undefined) out[k] = v;
  }
  for (const k of ['categoryEn', 'categoryAr', 'taglineEn', 'taglineAr'] as const) {
    const v = optionalText(src, k, MAX_SHORT, errors);
    if (v !== undefined) out[k] = v;
  }
  for (const k of ['descriptionEn', 'descriptionAr'] as const) {
    const v = optionalText(src, k, MAX_LONG, errors);
    if (v !== undefined) out[k] = v;
  }
  if (mode === 'create' && !text(src.nameEn) && !text(src.nameAr)) errors.nameEn = 'name_required';
  if (mode === 'create' || 'accentColor' in src) {
    const c = text(src.accentColor) ?? (mode === 'create' ? '#333333' : null);
    if (!c || !HEX_COLOR.test(c)) errors.accentColor = 'invalid_color';
    else out.accentColor = c.toLowerCase();
  }
  if ('visibility' in src) {
    if (BRAND_VISIBILITY.includes(src.visibility as BrandVisibilityKey)) out.visibility = src.visibility as BrandVisibilityKey;
    else errors.visibility = 'invalid';
  }
  if ('sortOrder' in src) {
    if (Number.isInteger(src.sortOrder) && Math.abs(src.sortOrder as number) < 10_000) out.sortOrder = src.sortOrder as number;
    else errors.sortOrder = 'invalid';
  }
  if ('imageId' in src) {
    const id = idOrNull(src.imageId);
    if (id === undefined) errors.imageId = 'invalid';
    else out.imageId = id;
  }
  if (src.confirmHide === true) out.confirmHide = true;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: out };
}

// ───────── products ─────────

export const PRODUCT_LINES = ['FRESHNESS', 'TRADITIONAL', 'THE_LEAF'] as const;
export const SIZE_UNITS = ['G', 'KG', 'ML', 'L'] as const;
export const PACK_TYPES = ['GLASS', 'PET', 'CAN', 'TIN'] as const;

export interface VariantInput {
  sizeValue: number;
  unit: (typeof SIZE_UNITS)[number];
  packType: (typeof PACK_TYPES)[number] | null;
  shown: boolean;
}

export interface ProductInput {
  slug: string;
  brandId: string | null;
  productLine: (typeof PRODUCT_LINES)[number] | null;
  categoryId: string;
  nameEn: string | null;
  nameAr: string | null;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  ingredientsEn?: string | null;
  ingredientsAr?: string | null;
  shelfLifeEn?: string | null;
  shelfLifeAr?: string | null;
  storageEn?: string | null;
  storageAr?: string | null;
  sortOrder?: number;
  imageId?: string | null;
  imageNeedsReplacement?: boolean;
  variants?: VariantInput[];
}

export function checkVariants(raw: unknown): Checked<VariantInput[]> {
  const errors: Errors = {};
  if (!Array.isArray(raw)) return { ok: false, errors: { variants: 'invalid' } };
  if (raw.length > 40) return { ok: false, errors: { variants: 'too_many' } };
  const seen = new Set<string>();
  const out: VariantInput[] = [];
  raw.forEach((item, i) => {
    const v = asObject(item);
    const size = typeof v.sizeValue === 'string' ? Number(v.sizeValue) : v.sizeValue;
    if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0 || size > 100_000) {
      errors[`variants.${i}.sizeValue`] = 'invalid_size';
      return;
    }
    if (!SIZE_UNITS.includes(v.unit as never)) {
      errors[`variants.${i}.unit`] = 'invalid';
      return;
    }
    const pack = v.packType === null || v.packType === '' || v.packType === undefined ? null : v.packType;
    if (pack !== null && !PACK_TYPES.includes(pack as never)) {
      errors[`variants.${i}.packType`] = 'invalid';
      return;
    }
    const rounded = Math.round(size * 100) / 100;
    const key = `${rounded}|${v.unit}|${pack ?? ''}`;
    if (seen.has(key)) {
      errors[`variants.${i}`] = 'duplicate_variant';
      return;
    }
    seen.add(key);
    out.push({ sizeValue: rounded, unit: v.unit as VariantInput['unit'], packType: pack as VariantInput['packType'], shown: v.shown !== false });
  });
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: out };
}

export function checkProduct(raw: unknown, mode: 'create' | 'update'): Checked<Partial<ProductInput>> {
  const src = asObject(raw);
  const errors: Errors = {};
  const out: Partial<ProductInput> = {};

  if (mode === 'create' || 'slug' in src) {
    const slug = text(src.slug)?.toLowerCase();
    if (!slug) errors.slug = 'required';
    else if (!SLUG.test(slug) || slug.length > 80 || slug === 'tastino-lines') errors.slug = 'invalid_slug';
    else out.slug = slug;
  }
  for (const k of ['nameEn', 'nameAr'] as const) {
    const v = optionalText(src, k, MAX_SHORT, errors);
    if (v !== undefined) out[k] = v;
  }
  if (mode === 'create' && !text(src.nameEn) && !text(src.nameAr)) errors.nameEn = 'name_required';
  for (const k of ['descriptionEn', 'descriptionAr', 'ingredientsEn', 'ingredientsAr', 'shelfLifeEn', 'shelfLifeAr', 'storageEn', 'storageAr'] as const) {
    const v = optionalText(src, k, MAX_LONG, errors);
    if (v !== undefined) out[k] = v;
  }

  // Exactly one owner: a brand, or one of the Tastino lines.
  if (mode === 'create' || 'brandId' in src || 'productLine' in src) {
    const brandId = idOrNull(src.brandId);
    const line = src.productLine === null || src.productLine === '' || src.productLine === undefined ? null : src.productLine;
    if (line !== null && !PRODUCT_LINES.includes(line as never)) errors.productLine = 'invalid';
    else if ((brandId ? 1 : 0) + (line ? 1 : 0) !== 1) errors.brandId = 'one_owner';
    else {
      out.brandId = brandId ?? null;
      out.productLine = line as ProductInput['productLine'];
    }
  }
  if (mode === 'create' || 'categoryId' in src) {
    const id = idOrNull(src.categoryId);
    if (!id) errors.categoryId = 'required';
    else out.categoryId = id;
  }
  if ('sortOrder' in src) {
    if (Number.isInteger(src.sortOrder) && Math.abs(src.sortOrder as number) < 10_000) out.sortOrder = src.sortOrder as number;
    else errors.sortOrder = 'invalid';
  }
  if ('imageId' in src) {
    const id = idOrNull(src.imageId);
    if (id === undefined) errors.imageId = 'invalid';
    else out.imageId = id;
  }
  if ('imageNeedsReplacement' in src) out.imageNeedsReplacement = src.imageNeedsReplacement === true;
  if ('variants' in src) {
    const v = checkVariants(src.variants);
    if (v.ok) out.variants = v.data;
    else Object.assign(errors, v.errors);
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: out };
}

// ───────── hero slides ─────────

/** A call-to-action link: a path on this site, or an https address. Anything else (javascript:, http:, data:) is refused. */
export function checkCtaHref(v: unknown): string | null {
  const t = text(v);
  if (!t || t.length > 300 || /[\s\u0000-\u001f]/.test(t)) return null;
  if (/^\/(?!\/)[\w\-./?=&%#]*$/.test(t)) return t;
  try {
    const u = new URL(t);
    return u.protocol === 'https:' && u.hostname.includes('.') ? u.toString() : null;
  } catch {
    return null;
  }
}

export interface HeroInput {
  headlineEn: string | null;
  headlineAr: string | null;
  sublineEn?: string | null;
  sublineAr?: string | null;
  ctaLabelEn?: string | null;
  ctaLabelAr?: string | null;
  ctaHref?: string | null;
  accentColor?: string | null;
  imageId?: string | null;
}

export function checkHero(raw: unknown, mode: 'create' | 'update'): Checked<Partial<HeroInput>> {
  const src = asObject(raw);
  const errors: Errors = {};
  const out: Partial<HeroInput> = {};
  for (const k of ['headlineEn', 'headlineAr', 'sublineEn', 'sublineAr', 'ctaLabelEn', 'ctaLabelAr'] as const) {
    const v = optionalText(src, k, MAX_SHORT, errors);
    if (v !== undefined) out[k] = v;
  }
  if (mode === 'create' && !text(src.headlineEn) && !text(src.headlineAr)) errors.headlineEn = 'name_required';
  if ('ctaHref' in src) {
    if (text(src.ctaHref) === null) out.ctaHref = null;
    else {
      const href = checkCtaHref(src.ctaHref);
      if (!href) errors.ctaHref = 'invalid_link';
      else out.ctaHref = href;
    }
  }
  if ('accentColor' in src) {
    const c = text(src.accentColor);
    if (c && !HEX_COLOR.test(c)) errors.accentColor = 'invalid_color';
    else out.accentColor = c ? c.toLowerCase() : null;
  }
  if ('imageId' in src) {
    const id = idOrNull(src.imageId);
    if (id === undefined) errors.imageId = 'invalid';
    else out.imageId = id;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: out };
}

// ───────── settings ─────────

export const SOCIAL_NETWORKS = ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'x'] as const;

export interface SettingsInput {
  'contact.email': string;
  'contact.phone': string;
  'contact.whatsapp': string;
  'contact.addressEn': string;
  'contact.addressAr': string;
  'contact.mapLink': string;
  social: { network: string; url: string }[];
}

const httpsUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && u.hostname.includes('.');
  } catch {
    return false;
  }
};

/** Contact details and social links. Phone and WhatsApp may be empty; the email may not (it receives the leads). */
export function checkSettings(raw: unknown): Checked<Partial<SettingsInput>> {
  const src = asObject(raw);
  const errors: Errors = {};
  const out: Partial<SettingsInput> = {};

  if ('contact.email' in src) {
    const e = text(src['contact.email']);
    if (!e) errors['contact.email'] = 'required';
    else if (!SIMPLE_EMAIL.test(e) || e.length > 254) errors['contact.email'] = 'invalid_email';
    else out['contact.email'] = e;
  }
  for (const k of ['contact.phone', 'contact.whatsapp'] as const) {
    if (!(k in src)) continue;
    const p = text(src[k])?.replace(/[\s()-]/g, '') ?? '';
    if (p && !INTERNATIONAL_PHONE.test(p)) errors[k] = 'invalid_phone';
    else out[k] = p;
  }
  for (const k of ['contact.addressEn', 'contact.addressAr'] as const) {
    const v = optionalText(src, k, MAX_SHORT * 2, errors);
    if (v !== undefined) out[k] = v ?? '';
  }
  if ('contact.mapLink' in src) {
    const m = text(src['contact.mapLink']) ?? '';
    if (m && !httpsUrl(m)) errors['contact.mapLink'] = 'invalid_url';
    else out['contact.mapLink'] = m;
  }
  if ('social' in src) {
    if (!Array.isArray(src.social) || src.social.length > 12) errors.social = 'invalid';
    else {
      const list: { network: string; url: string }[] = [];
      const seen = new Set<string>();
      src.social.forEach((item, i) => {
        const s = asObject(item);
        const url = text(s.url);
        if (!url) return; // an empty link means no icon
        const network = text(s.network)?.toLowerCase() ?? '';
        if (!(SOCIAL_NETWORKS as readonly string[]).includes(network)) errors[`social.${i}.network`] = 'invalid';
        else if (!httpsUrl(url) || url.length > 300) errors[`social.${i}.url`] = 'invalid_url';
        else if (seen.has(network)) errors[`social.${i}.network`] = 'duplicate';
        else {
          seen.add(network);
          list.push({ network, url });
        }
      });
      out.social = list;
    }
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: out };
}
