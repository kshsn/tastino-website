import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { Picture } from '@/components/ui/Picture';
import { Link } from '@/i18n/navigation';
import { uniqueSizes } from '@/lib/catalogue/format';
import { accentVars, safeAccent } from '@/lib/color';
import type { CatalogueProduct } from '@/lib/content/catalogue';
import { toPictureData } from '@/lib/media/picture';
import { pick } from '@/lib/text';

/** Color for products that belong to a Tastino line instead of a brand. */
export const LINE_ACCENT = '#0F6B3E';

interface ProductCardProps {
  product: CatalogueProduct;
  locale: string;
}

/** One product as a single link: packshot (or placeholder), brand tag, name and sizes. */
export async function ProductCard({ product: p, locale }: ProductCardProps) {
  const t = await getTranslations('catalogue');
  const name = pick(locale, p.nameEn, p.nameAr);
  const brandName = p.brand ? pick(locale, p.brand.nameEn, p.brand.nameAr) : t('tastino');
  const accent = p.brand ? safeAccent(p.brand.accentColor) : LINE_ACCENT;
  const picture = toPictureData(p.image, locale, name);
  const sizes = uniqueSizes(p.variants);
  // The accent comes from the database, so it reaches the CSS only through validated variables.
  const style = { ...accentVars(accent), '--c': accent } as CSSProperties;

  return (
    <Link href={`/products/${p.slug}`} className="pcard" style={style}>
      <span className="tag">{brandName}</span>
      <div className="ph">
        {picture ? (
          <Picture image={picture} sizes="(max-width: 960px) 45vw, 240px" placeholder={t('imageSoon')} decorative />
        ) : (
          <div className="none">
            <b aria-hidden="true">{brandName.charAt(0)}</b>
            {t('imageSoon')}
          </div>
        )}
      </div>
      <h3>{name}</h3>
      <p className="meta">{sizes.length ? <bdi dir="ltr">{sizes.join(' · ')}</bdi> : t('sizesOnRequest')}</p>
      <span className="go" aria-hidden="true">
        <span />
        <span className="arr">→</span>
      </span>
    </Link>
  );
}
