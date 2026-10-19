import { getTranslations } from 'next-intl/server';
import { Picture } from '@/components/ui/Picture';
import { Link } from '@/i18n/navigation';
import type { HomeProduct } from '@/lib/content/home';

interface ProductMarqueeProps {
  items: HomeProduct[];
}

const SIZES = '150px';

/**
 * Endless strip of packshots. The first set is real links (announced once, keyboard focus pauses the loop);
 * the second set only exists so the loop has no gap, so it is hidden from screen readers and the tab order.
 */
export async function ProductMarquee({ items }: ProductMarqueeProps) {
  const t = await getTranslations('home');
  if (items.length === 0) return null;

  return (
    <div className="marquee" role="region" aria-label={t('marquee.label')}>
      <div className="track">
        {items.map((p) => (
          <Link key={p.slug} href={`/products/${p.slug}`} aria-label={p.name}>
            <Picture image={p.picture} sizes={SIZES} placeholder={t('imageSoon')} decorative />
          </Link>
        ))}
        {items.map((p) => (
          <Link key={`dup-${p.slug}`} href={`/products/${p.slug}`} className="dup" aria-hidden="true" tabIndex={-1}>
            <Picture image={p.picture} sizes={SIZES} placeholder={t('imageSoon')} decorative />
          </Link>
        ))}
      </div>
    </div>
  );
}
