import { getTranslations } from 'next-intl/server';
import { Picture } from '@/components/ui/Picture';
import { Link } from '@/i18n/navigation';
import type { PictureData } from '@/lib/media/types';

interface BrandHeroProps {
  name: string;
  category: string;
  intro: string;
  slug: string;
  productCount: number | null;
  packCount: number;
  /** Up to three packshots, shown fanned out behind the brand color. */
  pictures: PictureData[];
}

const SLOTS = ['s0', 's1', 's2'] as const;

export async function BrandHero({ name, category, intro, slug, productCount, packCount, pictures }: BrandHeroProps) {
  const t = await getTranslations('catalogue');
  // Middle packshot in front, the others angled out to each side (as in the approved mockup).
  const ordered = pictures.length === 3 ? [pictures[1], pictures[0], pictures[2]] : pictures;
  const slotFor = (i: number) => (pictures.length === 1 ? 's1' : SLOTS[Math.min(i, 2)]);

  return (
    <div className="bhero">
      <div className="txt">
        <div className="eyebrow">{category}</div>
        <h1>{name}</h1>
        <p>{intro}</p>
        {productCount !== null && (
          <div className="stats">
            <div><b>{new Intl.NumberFormat('en-US').format(productCount)}</b><span>{t('brandPage.products')}</span></div>
            {packCount > 0 && <div><b>{packCount}</b><span>{t('brandPage.packTypes')}</span></div>}
          </div>
        )}
        <div className="cta">
          {productCount !== null && productCount > 0 && (
            <a className="btn btn-primary" href="#range">
              <span>{t('brandPage.seeRange')}</span> <span className="arr" aria-hidden="true">→</span>
            </a>
          )}
          <Link className="btn btn-ghost" href={`/distributors?brand=${slug}`}>
            {t('brandPage.distribute')}
          </Link>
        </div>
      </div>
      <div className="bstage" aria-hidden="true">
        <div className="blob" />
        {ordered.length > 0 ? (
          ordered.map((pic, i) => (
            <Picture key={i} image={pic} sizes="(max-width: 960px) 40vw, 220px" placeholder={t('imageSoon')} className={slotFor(i)} priority={i === 0} decorative />
          ))
        ) : (
          <span className="lone">{name.charAt(0)}</span>
        )}
      </div>
    </div>
  );
}
