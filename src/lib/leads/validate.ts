import { z } from 'zod';
import { multiLine, normalizeEmail, normalizePhone, singleLine } from './normalize';
import {
  BRAND_KEYS,
  COMPANY_TYPES,
  COUNTRIES,
  DIAL_CODES,
  FIELDS_FOR,
  LIMITS,
  REASONS,
  type BrandKey,
  type CompanyType,
  type Reason,
} from './options';

// One Zod schema shared by the browser (instant feedback) and the server (the real check).
// Issue messages are short, language-free codes; the form turns them into localized text.

export const ERROR_CODES = ['required', 'email', 'phone', 'tooLong', 'consent', 'invalid'] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export type LeadField = 'reason' | 'name' | 'company' | 'email' | 'phone' | 'country' | 'companyType' | 'brands' | 'product' | 'message' | 'consent' | 'locale' | 'key';

export interface LeadInput {
  reason: Reason;
  name: string;
  company: string;
  email: string;
  /** "+<dialling code><digits>" or null when not given. */
  phone: string | null;
  /** Country code from the offered list, e.g. "EG". */
  country: string;
  companyType: CompanyType | null;
  brands: BrandKey[];
  product: string | null;
  message: string;
  consent: true;
  locale: 'en' | 'ar';
  /** Random id made by the form: a retry of the same submission carries the same id. */
  key: string;
}

/** A required single-line text of at most `max` characters. */
const line = (max: number) =>
  z.preprocess(singleLine, z.string().min(1, 'required').max(max, 'tooLong'));

const schema = z
  .object({
    reason: z.enum(REASONS, { error: 'invalid' }),
    name: line(LIMITS.name),
    company: line(LIMITS.company),
    email: z.preprocess(singleLine, z.string().min(1, 'required')).transform((v, ctx) => {
      const email = normalizeEmail(v);
      if (!email) ctx.issues.push({ code: 'custom', message: 'email', input: v });
      return email ?? '';
    }),
    country: z.string({ error: 'required' }).min(1, 'required').refine((c) => COUNTRIES.some((x) => x.code === c), 'invalid'),
    // Optional fields are checked below, once the reason is known.
    phoneCode: z.unknown().optional(),
    phone: z.unknown().optional(),
    companyType: z.unknown().optional(),
    brands: z.unknown().optional(),
    product: z.unknown().optional(),
    message: z.preprocess(multiLine, z.string().min(1, 'required').max(LIMITS.message, 'tooLong')),
    consent: z.literal(true, { error: 'consent' }),
    locale: z.enum(['en', 'ar'], { error: 'invalid' }),
    key: z.string({ error: 'invalid' }).regex(/^[A-Za-z0-9-]{8,64}$/, 'invalid'),
  })
  .transform((v, ctx): LeadInput => {
    const show = FIELDS_FOR[v.reason];
    const issue = (path: LeadField, message: ErrorCode) => ctx.issues.push({ code: 'custom', message, path: [path], input: v });

    let phone: string | null = null;
    const typed = typeof v.phone === 'string' ? v.phone.trim() : '';
    if (typed) {
      const dial = DIAL_CODES.find((d) => d.code === v.phoneCode)?.dial ?? DIAL_CODES[0].dial;
      phone = normalizePhone(dial, typed, LIMITS.phoneMin, LIMITS.phoneMax);
      if (!phone) issue('phone', 'phone');
    }

    let companyType: CompanyType | null = null;
    if (show.companyType && v.companyType) {
      if ((COMPANY_TYPES as readonly string[]).includes(v.companyType as string)) companyType = v.companyType as CompanyType;
      else issue('companyType', 'invalid');
    }

    const brands: BrandKey[] = [];
    if (show.brands && Array.isArray(v.brands)) {
      for (const b of v.brands) {
        if (!(BRAND_KEYS as readonly string[]).includes(b)) issue('brands', 'invalid');
        else if (!brands.includes(b as BrandKey)) brands.push(b as BrandKey);
      }
    }

    let product: string | null = null;
    if (show.product) {
      product = singleLine(v.product) || null;
      if (product && product.length > LIMITS.product) issue('product', 'tooLong');
    }

    return { reason: v.reason, name: v.name, company: v.company, email: v.email, phone, country: v.country, companyType, brands, product, message: v.message, consent: true, locale: v.locale, key: v.key };
  });

export type ValidationResult = { ok: true; data: LeadInput } | { ok: false; errors: Partial<Record<LeadField, ErrorCode>> };

/**
 * Checks a submission. Unknown fields are dropped (never stored), fields that do not apply to the chosen reason
 * are ignored, and every text is cleaned. Nothing here trusts the browser.
 */
export function validateLead(raw: unknown): ValidationResult {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: Partial<Record<LeadField, ErrorCode>> = {};
  for (const issue of parsed.error.issues) {
    const field = (issue.path[0] ?? 'reason') as LeadField;
    if (errors[field]) continue; // the first problem per field is enough
    errors[field] = (ERROR_CODES as readonly string[]).includes(issue.message) ? (issue.message as ErrorCode) : 'invalid';
  }
  return { ok: false, errors };
}

/** English country name for staff (inbox and emails). */
export function countryNameEn(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.en ?? code;
}
