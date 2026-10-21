import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { Picture } from '@/components/ui/Picture';
import { Link } from '@/i18n/navigation';
import { accentVars, safeAccent } from '@/lib/color';
import type { PictureData } from '@/lib/media/types';

interface BrandCardProps {
  slug: string;
  name: string;
  category: string;
  accent: string;
  picture: PictureData | null;
  /** Null for a coming-soon brand: it shows a badge and no product count. */
  productCount: number | null;
}

/** A brand as one link: name tag, category, packshot, and either a product count or a "Coming soon" badge. */
export async function BrandCard({ slug, name, category, accent, picture, productCount }: BrandCardProps) {
  const t = await getTranslations('catalogue');
  const safe = safeAccent(accent);
  const style = { ...accentVars(safe), '--c': safe } as CSSProperties;
  return (
    <Link href={`/brands/${slug}`} className="bcard" style={style}>
      <span className="name">{name}</span>
      {productCount === null && <span className="badge">{t('brandsIndex.comingSoon')}</span>}
      <p className="cat-label">{category}</p>
      <div className="img">
        <Picture image={picture} sizes="(max-width: 960px) 45vw, 260px" placeholder={t('imageSoon')} decorative />
      </div>
      <div className="more">
        <span>{productCount === null ? '' : t('productCount', { count: productCount })}</span>
        <span className="arr" aria-hidden="true">→</span>
      </div>
    </Link>
  );
}
