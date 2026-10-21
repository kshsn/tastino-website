import { getTranslations } from 'next-intl/server';
import { formatSize } from '@/lib/catalogue/format';
import type { CatalogueProduct } from '@/lib/content/catalogue';

interface VariantTableProps {
  variants: CatalogueProduct['variants'];
}

const PACK_KEY = { GLASS: 'glass', PET: 'pet', CAN: 'can', TIN: 'tin' } as const;

/** Sizes and pack types for one product; the pack is "on request" when the catalogue does not state it. */
export async function VariantTable({ variants }: VariantTableProps) {
  const t = await getTranslations('catalogue');
  return (
    <table>
      <caption className="sr-only">{t('product.variantsTitle')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('product.colSize')}</th>
          <th scope="col">{t('product.colPack')}</th>
        </tr>
      </thead>
      <tbody>
        {variants.map((v) => (
          <tr key={v.id}>
            <td>
              <bdi dir="ltr">{formatSize(v)}</bdi>
            </td>
            <td>{v.packType ? t(`packs.${PACK_KEY[v.packType]}`) : t('product.packOnRequest')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
