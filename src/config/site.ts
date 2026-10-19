// Contact details shown site-wide. Epic 8 (US-008.7) moves these into admin-managed settings.
export const site = {
  email: 'info@tastinofoods.com',
  phoneDisplay: '+20 110 011 1887',
  phoneE164: '+201100111887',
  whatsapp: 'https://wa.me/201100111887',
  // Only confirmed, active accounts are listed; empty until Tastino confirms them.
  social: [] as { network: string; url: string }[],
} as const;

export const PAGES = ['about', 'brands', 'products', 'quality', 'innovation', 'distributors', 'privacy', 'terms'] as const;
export type PageKey = (typeof PAGES)[number];
