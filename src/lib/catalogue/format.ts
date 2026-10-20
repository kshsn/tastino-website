// Catalogue display helpers (pure). Sizes keep Latin units ("400g", "1L") in both languages, as in the approved mockup.

interface VariantLike {
  sizeValue: { toString(): string } | number | string;
  unit: 'G' | 'KG' | 'ML' | 'L';
}

const UNIT_LABEL = { G: 'g', KG: 'kg', ML: 'ml', L: 'L' } as const;

/** "400g", "1kg", "250ml", "1L" from a stored variant. Whole numbers have no decimals; others keep up to two. */
export function formatSize(v: VariantLike): string {
  const n = Number(v.sizeValue.toString());
  const num = Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
  return `${num}${UNIT_LABEL[v.unit]}`;
}

/** True for ml and L: the product page then says "Net volume" instead of "Net weight". */
export const isLiquid = (v: Pick<VariantLike, 'unit'>) => v.unit === 'ML' || v.unit === 'L';

/** Distinct sizes in stored order, e.g. ["400g", "650g"]. */
export function uniqueSizes(variants: VariantLike[]): string[] {
  return [...new Set(variants.map(formatSize))];
}

/** Value used in `?brand=` for products that belong to a Tastino line instead of a brand. */
export const TASTINO_FILTER = 'tastino';

/** WhatsApp link with a prefilled, URL-encoded message (works for Arabic too). Null without a valid base link. */
export function whatsappWithText(base: string | null, text: string): string | null {
  return base ? `${base}?text=${encodeURIComponent(text)}` : null;
}
