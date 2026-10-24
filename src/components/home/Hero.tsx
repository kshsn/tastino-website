import { preload } from 'react-dom';
import { getTranslations } from 'next-intl/server';
import type { HomeData } from '@/lib/content/home';
import { HeroSlider } from './HeroSlider';
import { HeroStats } from './HeroStats';
import type { HeroLabels, HeroSlideModel } from './hero-types';

interface HeroProps {
  data: HomeData;
  locale: string;
}

const VIDEO_SRC = '/hero/tomato-vine.mp4';
const VIDEO_SRC_SMALL = '/hero/tomato-vine-sm.mp4';
const POSTER_SRC = '/hero/tomato-vine-poster.jpg';

/**
 * The homepage hero is only the old website's tomato-vine video, with the catalogue facts in a band under it;
 * the product slides were taken out. The poster photo is the first thing painted, so it is preloaded.
 */
export async function Hero({ data, locale }: HeroProps) {
  const t = await getTranslations('home');
  preload(POSTER_SRC, { as: 'image', fetchPriority: 'high' });

  const videoSlide: HeroSlideModel = {
    kind: 'video',
    id: 'video',
    src: VIDEO_SRC,
    srcSmall: VIDEO_SRC_SMALL,
    poster: POSTER_SRC,
    eyebrow: t('eyebrow'),
    titleA: t('titleA'),
    titleB: t('titleB'),
    lead: t('lead'),
    primary: { href: '/brands', label: t('explore') },
    secondary: { href: '/distributors?reason=catalogue', label: t('catalogue') },
  };
  const labels: HeroLabels = {
    region: t('hero.videoRegion'),
    prev: t('hero.prev'),
    next: t('hero.next'),
    pause: t('hero.pause'),
    play: t('hero.play'),
    slideOf: t('hero.slideOf', { n: '{n}', total: '{total}' }),
  };

  const rtl = locale === 'ar';
  return (
    <header data-hero>
        <HeroSlider slides={[videoSlide]} labels={labels} rtl={rtl} />
        <HeroStats stats={data.stats} locale={locale} />
    </header>
  );
}
