// Catalogue seed data, from the 2026 company profile with the agreed house rules:
// Lora = jams, Liora = tomato, Andiamo = sauces/tahini, TAMA = juices; Freshness, traditional
// beverages and THE LEAF are Tastino lines (no brand). 400g is the jam/sauce standard; correct spelling.
import type { PackType, ProductLine, SizeUnit } from '@prisma/client';

export interface BrandSeed {
  slug: string;
  nameEn: string;
  /** Brand marks are not translated, so the Arabic name is the Latin mark. */
  nameAr: string;
  categoryEn: string;
  categoryAr: string;
  taglineEn?: string;
  taglineAr?: string;
  accentColor: string;
  sortOrder: number;
  image: string;
}

export const BRANDS: BrandSeed[] = [
  { slug: 'lora', nameEn: 'Lora', nameAr: 'Lora', categoryEn: 'Premium Jams', categoryAr: 'مربى فاخر', accentColor: '#E23B3B', sortOrder: 1, image: 'lora-jam-lineup-6.png' },
  { slug: 'liora', nameEn: 'Liora', nameAr: 'Liora', categoryEn: 'Tomato Products', categoryAr: 'منتجات الطماطم', accentColor: '#C8102E', sortOrder: 2, image: 'liora-tomato-paste-can.png' },
  { slug: 'andiamo', nameEn: 'Andiamo', nameAr: 'Andiamo', categoryEn: 'Sauces & Tahini', categoryAr: 'صوصات وطحينة', taglineEn: 'Inspired by nature', taglineAr: 'مستوحى من الطبيعة', accentColor: '#D62828', sortOrder: 3, image: 'andiamo-bbq-ketchup-mustard.png' },
  { slug: 'tama', nameEn: 'TAMA', nameAr: 'TAMA', categoryEn: 'Juices & Nectars', categoryAr: 'عصائر ونكتار', accentColor: '#2F8F3A', sortOrder: 4, image: 'tama-guava-orange-250ml.png' },
];

export const CATEGORIES = [
  { slug: 'jams', nameEn: 'Jams', nameAr: 'مربى', sortOrder: 1 },
  { slug: 'tomato', nameEn: 'Tomato', nameAr: 'طماطم', sortOrder: 2 },
  { slug: 'sauces', nameEn: 'Sauces & Tahini', nameAr: 'صوصات وطحينة', sortOrder: 3 },
  { slug: 'juices', nameEn: 'Juices & Nectars', nameAr: 'عصائر ونكتار', sortOrder: 4 },
  { slug: 'syrups', nameEn: 'Syrups', nameAr: 'شراب النكهات', sortOrder: 5 },
  { slug: 'traditional', nameEn: 'Traditional Beverages', nameAr: 'مشروبات تقليدية', sortOrder: 6 },
  { slug: 'iced-tea', nameEn: 'Iced Tea', nameAr: 'شاي مثلج', sortOrder: 7 },
] as const;

export const LINES: Record<ProductLine, { en: string; ar: string }> = {
  FRESHNESS: { en: 'Freshness syrup line', ar: 'خط شراب فريشنس' },
  TRADITIONAL: { en: 'Tastino traditional beverages', ar: 'مشروبات تستينو التقليدية' },
  THE_LEAF: { en: 'THE LEAF iced tea', ar: 'شاي ذا ليف المثلج' },
};

/** [size, unit, pack]; a null pack means the catalogue does not state it ("pack on request"). */
export type VariantSeed = [number, SizeUnit, PackType | null];

export interface ProductSeed {
  slug: string;
  brand?: string;
  line?: ProductLine;
  category: (typeof CATEGORIES)[number]['slug'];
  nameEn: string;
  nameAr: string;
  variants: VariantSeed[];
  image?: string;
  /** The only packshot carries another brand's label: keep it for admins, show the placeholder publicly. */
  imageNeedsReplacement?: boolean;
  ingredientsEn?: string;
  ingredientsAr?: string;
}

const JAM: VariantSeed[] = [[400, 'G', 'GLASS'], [650, 'G', 'GLASS']];
const SAUCE: VariantSeed[] = [[400, 'G', 'PET']];
const TAMA: VariantSeed[] = [[200, 'ML', 'GLASS'], [250, 'ML', 'GLASS'], [1, 'L', 'GLASS']];
const SYRUP: VariantSeed[] = [[800, 'ML', 'GLASS']];
const RTD: VariantSeed[] = [[330, 'ML', null]];

// Catalogue claim for tomato paste, accepted as substantiation on 2026-10-18.
const TOMATO_EN = 'Tomato paste, added salt 2%, natural soluble solids (from tomato) 22–24%. Free from additives, flavor enhancers and artificial colors.';
const TOMATO_AR = 'معجون طماطم، ملح مضاف 2%، مواد صلبة ذائبة طبيعية من الطماطم 22–24%. خالٍ من الإضافات ومحسنات النكهة والألوان الصناعية.';

export const PRODUCTS: ProductSeed[] = [
  // Lora — jams. Individual packshots supplied so far carry the Liora label.
  { slug: 'lora-strawberry-jam', brand: 'lora', category: 'jams', nameEn: 'Premium Strawberry Jam', nameAr: 'مربى الفراولة الفاخرة', variants: JAM, image: 'liora-strawberry-jam.png', imageNeedsReplacement: true },
  { slug: 'lora-apricot-jam', brand: 'lora', category: 'jams', nameEn: 'Premium Apricot Jam', nameAr: 'مربى المشمش الفاخرة', variants: JAM, image: 'liora-apricot-jam-370g.png', imageNeedsReplacement: true },
  { slug: 'lora-blueberry-jam', brand: 'lora', category: 'jams', nameEn: 'Premium Blueberry Jam', nameAr: 'مربى التوت الفاخرة', variants: JAM, image: 'liora-blueberry-jam.png', imageNeedsReplacement: true },
  { slug: 'lora-fig-jam', brand: 'lora', category: 'jams', nameEn: 'Premium Fig Jam', nameAr: 'مربى التين الفاخرة', variants: JAM },
  { slug: 'lora-orange-marmalade', brand: 'lora', category: 'jams', nameEn: 'Premium Orange Marmalade', nameAr: 'مربى البرتقال الفاخرة', variants: JAM },
  { slug: 'lora-guava-jam', brand: 'lora', category: 'jams', nameEn: 'Premium Guava Jam', nameAr: 'مربى الجوافة الفاخرة', variants: JAM },
  { slug: 'lora-mixed-berry-jam', brand: 'lora', category: 'jams', nameEn: 'Mixed Berry Jam', nameAr: 'مربى التوت المشكل', variants: JAM },
  { slug: 'lora-peach-jam', brand: 'lora', category: 'jams', nameEn: 'Peach Jam', nameAr: 'مربى الخوخ', variants: JAM },
  { slug: 'lora-mango-jam', brand: 'lora', category: 'jams', nameEn: 'Mango Jam', nameAr: 'مربى المانجو', variants: JAM },

  // Liora — tomato
  { slug: 'liora-tomato-paste', brand: 'liora', category: 'tomato', nameEn: 'Tomato Paste', nameAr: 'معجون طماطم', variants: [[400, 'G', 'TIN'], [800, 'G', 'TIN'], [1, 'KG', 'TIN'], [3, 'KG', 'TIN']], image: 'liora-tomato-paste-can.png', ingredientsEn: TOMATO_EN, ingredientsAr: TOMATO_AR },
  { slug: 'liora-tomato-paste-glass', brand: 'liora', category: 'tomato', nameEn: 'Tomato Paste in Glass', nameAr: 'معجون طماطم في عبوة زجاجية', variants: [[285, 'G', 'GLASS'], [300, 'G', 'GLASS'], [320, 'G', 'GLASS']], ingredientsEn: TOMATO_EN, ingredientsAr: TOMATO_AR },
  { slug: 'liora-tomato-ketchup', brand: 'liora', category: 'tomato', nameEn: 'Tomato Ketchup', nameAr: 'كاتشب طماطم', variants: [[400, 'G', 'GLASS']] },

  // Andiamo — sauces & tahini
  { slug: 'andiamo-tomato-ketchup', brand: 'andiamo', category: 'sauces', nameEn: 'Tomato Ketchup', nameAr: 'كاتشب طماطم', variants: SAUCE, image: 'andiamo-ketchup.png' },
  { slug: 'andiamo-mustard-sauce', brand: 'andiamo', category: 'sauces', nameEn: 'Mustard Sauce', nameAr: 'صوص مستردة', variants: SAUCE, image: 'andiamo-mustard.png' },
  { slug: 'andiamo-barbecue-sauce', brand: 'andiamo', category: 'sauces', nameEn: 'Barbecue Sauce', nameAr: 'صوص الباربكيو', variants: SAUCE, image: 'andiamo-bbq.png' },
  { slug: 'andiamo-hot-sauce-special', brand: 'andiamo', category: 'sauces', nameEn: 'Hot Sauce Special', nameAr: 'شطة حارة', variants: SAUCE, image: 'andiamo-hot-sauce.png' },
  { slug: 'andiamo-hummus-tahini', brand: 'andiamo', category: 'sauces', nameEn: 'Hummus Tahini', nameAr: 'حمص بالطحينة', variants: SAUCE, image: 'andiamo-hummus-tahini.png' },
  { slug: 'andiamo-sesame-tahini', brand: 'andiamo', category: 'sauces', nameEn: 'Sesame Tahini', nameAr: 'طحينة السمسم', variants: SAUCE, image: 'andiamo-sesame-tahini.png' },
  { slug: 'andiamo-tomato-paste', brand: 'andiamo', category: 'tomato', nameEn: 'Tomato Paste', nameAr: 'معجون طماطم', variants: [[400, 'G', 'TIN']], image: 'andiamo-tomato-paste-400g.png' },

  // TAMA — juices & nectars
  { slug: 'tama-mango-nectar', brand: 'tama', category: 'juices', nameEn: 'Mango Nectar', nameAr: 'نكتار مانجو', variants: TAMA, image: 'tama-mango-nectar-250ml.png' },
  { slug: 'tama-lemon-nectar', brand: 'tama', category: 'juices', nameEn: 'Lemon Nectar', nameAr: 'نكتار ليمون', variants: TAMA, image: 'tama-lemon-nectar-250ml.png' },
  { slug: 'tama-guava-orange-nectar', brand: 'tama', category: 'juices', nameEn: 'Guava & Orange Nectar', nameAr: 'نكتار جوافة برتقال', variants: TAMA, image: 'tama-guava-orange-250ml.png' },
  { slug: 'tama-guava-nectar', brand: 'tama', category: 'juices', nameEn: 'Guava Nectar', nameAr: 'نكتار جوافة', variants: TAMA },
  { slug: 'tama-strawberry-nectar', brand: 'tama', category: 'juices', nameEn: 'Strawberry Nectar', nameAr: 'نكتار فراولة', variants: TAMA },
  { slug: 'tama-peach-nectar', brand: 'tama', category: 'juices', nameEn: 'Peach Nectar', nameAr: 'نكتار خوخ', variants: TAMA },
  { slug: 'tama-apple-nectar', brand: 'tama', category: 'juices', nameEn: 'Apple Nectar', nameAr: 'نكتار تفاح', variants: TAMA },
  { slug: 'tama-cocktail-nectar', brand: 'tama', category: 'juices', nameEn: 'Cocktail Nectar', nameAr: 'نكتار كوكتيل', variants: TAMA },
  { slug: 'tama-cranberry-nectar', brand: 'tama', category: 'juices', nameEn: 'Cranberry Nectar', nameAr: 'نكتار توت بري', variants: TAMA },
  { slug: 'tama-orange-nectar', brand: 'tama', category: 'juices', nameEn: 'Orange Nectar', nameAr: 'نكتار برتقال', variants: TAMA },
  { slug: 'tama-berry-nectar', brand: 'tama', category: 'juices', nameEn: 'Berry Nectar', nameAr: 'نكتار توت', variants: TAMA },

  // Tastino lines — Freshness syrups
  { slug: 'freshness-vanilla-syrup', line: 'FRESHNESS', category: 'syrups', nameEn: 'Freshness Vanilla Syrup', nameAr: 'شراب الفانيليا فريشنس', variants: SYRUP, image: 'freshness-vanilla-syrup-800ml.png' },
  { slug: 'freshness-caramel-syrup', line: 'FRESHNESS', category: 'syrups', nameEn: 'Freshness Caramel Syrup', nameAr: 'شراب الكراميل فريشنس', variants: SYRUP, image: 'freshness-caramel-syrup-pump-800ml.png' },
  { slug: 'freshness-passion-fruit-syrup', line: 'FRESHNESS', category: 'syrups', nameEn: 'Freshness Passion Fruit Syrup', nameAr: 'شراب فاكهة الباشن فريشنس', variants: SYRUP, image: 'freshness-passion-fruit-syrup-800ml.png' },
  { slug: 'freshness-hazelnut-syrup', line: 'FRESHNESS', category: 'syrups', nameEn: 'Freshness Hazelnut Syrup', nameAr: 'شراب البندق فريشنس', variants: SYRUP },
  { slug: 'freshness-berry-syrup', line: 'FRESHNESS', category: 'syrups', nameEn: 'Freshness Berry Syrup', nameAr: 'شراب التوت فريشنس', variants: SYRUP },
  { slug: 'freshness-mojito-syrup', line: 'FRESHNESS', category: 'syrups', nameEn: 'Freshness Mojito Syrup', nameAr: 'شراب الموهيتو فريشنس', variants: SYRUP },
  { slug: 'freshness-pina-colada-syrup', line: 'FRESHNESS', category: 'syrups', nameEn: 'Freshness Piña Colada Syrup', nameAr: 'شراب بينا كولادا فريشنس', variants: SYRUP },

  // Tastino lines — traditional beverages and THE LEAF (pack not stated in the catalogue)
  { slug: 'hibiscus-karkadeh', line: 'TRADITIONAL', category: 'traditional', nameEn: 'Hibiscus (Karkadeh)', nameAr: 'كركديه', variants: RTD },
  { slug: 'carob-kharrub', line: 'TRADITIONAL', category: 'traditional', nameEn: 'Carob (Kharrub)', nameAr: 'خروب', variants: RTD },
  { slug: 'qamar-al-din', line: 'TRADITIONAL', category: 'traditional', nameEn: 'Qamar Al Din', nameAr: 'قمر الدين', variants: RTD },
  { slug: 'licorice-erq-sous', line: 'TRADITIONAL', category: 'traditional', nameEn: 'Licorice (Erq Sous)', nameAr: 'عرق سوس', variants: RTD },
  { slug: 'the-leaf-iced-tea', line: 'THE_LEAF', category: 'iced-tea', nameEn: 'THE LEAF Iced Tea', nameAr: 'ذا ليف شاي مثلج', variants: RTD },
];

/** Neutral bilingual description built only from verified facts (brand, range, place of manufacture). */
export function describe(p: ProductSeed): { en: string; ar: string } {
  const brand = p.brand ? BRANDS.find((b) => b.slug === p.brand)! : null;
  const rangeEn = brand ? `${brand.nameEn} ${brand.categoryEn.toLowerCase()}` : LINES[p.line!].en;
  const rangeAr = brand ? `${brand.categoryAr} من ${brand.nameAr}` : LINES[p.line!].ar;
  return {
    en: `${p.nameEn} from the ${rangeEn} range. Made by Tastino Foods in 10th of Ramadan Industrial City, Egypt.`,
    ar: `${p.nameAr} ضمن تشكيلة ${rangeAr}. من إنتاج تستينو فودز في مدينة العاشر من رمضان الصناعية، مصر.`,
  };
}
