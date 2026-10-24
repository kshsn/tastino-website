// Fixed choices for the lead form. English labels are what sales staff see in the inbox and emails;
// the visitor sees the localized labels from the messages files.

export const REASONS = ['distributor', 'catalogue', 'product', 'other'] as const;
export type Reason = (typeof REASONS)[number];

/** Database enum value for each reason. */
export const REASON_ENUM = { distributor: 'DISTRIBUTOR', catalogue: 'CATALOGUE', product: 'PRODUCT', other: 'OTHER' } as const;

export const COMPANY_TYPES = ['distribution', 'wholesaler', 'supermarket', 'horeca', 'catering', 'other'] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

export const COMPANY_TYPE_LABEL_EN: Record<CompanyType, string> = {
  distribution: 'Distribution company',
  wholesaler: 'Wholesaler',
  supermarket: 'Supermarket chain',
  horeca: 'Hotel / restaurant / café',
  catering: 'Catering',
  other: 'Other',
};

export const BRAND_KEYS = ['lora', 'liora', 'andiamo', 'tama', 'tastino'] as const;
export type BrandKey = (typeof BRAND_KEYS)[number];

export const BRAND_LABEL_EN: Record<BrandKey, string> = {
  lora: 'Lora',
  liora: 'Liora',
  andiamo: 'Andiamo',
  tama: 'TAMA',
  tastino: 'Tastino lines',
};

/** Which optional fields a reason shows. Fields that do not apply are hidden in the form and dropped by the server. */
export const FIELDS_FOR: Record<Reason, { companyType: boolean; brands: boolean; product: boolean }> = {
  distributor: { companyType: true, brands: true, product: false },
  catalogue: { companyType: false, brands: true, product: false },
  product: { companyType: false, brands: false, product: true },
  other: { companyType: false, brands: false, product: false },
};

export interface Country {
  code: string;
  en: string;
  ar: string;
  /** International dialling code, when the country is offered in the phone selector. */
  dial?: string;
}

// Same list as the approved mockup. The admin will be able to edit the list later (Epic 8, US-008.7).
export const COUNTRIES: readonly Country[] = [
  { code: 'EG', en: 'Egypt', ar: 'مصر', dial: '20' },
  { code: 'SA', en: 'Saudi Arabia', ar: 'السعودية', dial: '966' },
  { code: 'AE', en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة', dial: '971' },
  { code: 'JO', en: 'Jordan', ar: 'الأردن', dial: '962' },
  { code: 'KW', en: 'Kuwait', ar: 'الكويت', dial: '965' },
  { code: 'QA', en: 'Qatar', ar: 'قطر', dial: '974' },
  { code: 'BH', en: 'Bahrain', ar: 'البحرين', dial: '973' },
  { code: 'OM', en: 'Oman', ar: 'عُمان', dial: '968' },
  { code: 'LB', en: 'Lebanon', ar: 'لبنان', dial: '961' },
  { code: 'IQ', en: 'Iraq', ar: 'العراق', dial: '964' },
  { code: 'XX', en: 'Other', ar: 'أخرى' },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);
export const DIAL_CODES = COUNTRIES.filter((c) => c.dial).map((c) => ({ code: c.code, dial: c.dial! }));

export const LIMITS = { name: 100, company: 120, email: 254, product: 120, message: 2000, phoneMin: 7, phoneMax: 12 } as const;

/** Version of the consent wording. Bump it whenever the text changes, so each lead records what was agreed to. */
export const CONSENT_VERSION = '2026-10-v1';
