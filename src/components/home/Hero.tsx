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
 * The homepage hero: the old website's tomato-vine video first, then the published product slides, and the
 * catalogue facts in a band underneath. The poster photo is the first thing painted, so it is preloaded.
 */
export async function Hero({ data, locale }: HeroProps) {
  const t = await getTranslations('home');
  preload(POSTER_SRC, { as: 'image', fetchPriority: 'high' });

  const slides: HeroSlideModel[] = [
    {
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
    },
    ...data.slides.map(
      (s): HeroSlideModel => ({
        kind: 'product',
        id: s.id,
        accent: s.accent,
        brand: s.brand,
        label: s.label,
        picture: s.picture,
        cta: { href: s.href, label: t('hero.explore', { brand: s.brand }) },
      }),
    ),
  ];

  const labels: HeroLabels = {
    region: t('hero.group'),
    prev: t('hero.prev'),
    next: t('hero.next'),
    pause: t('hero.pause'),
    play: t('hero.play'),
    slideOf: t('hero.slideOf', { n: '{n}', total: '{total}' }),
    placeholder: t('imageSoon'),
    madeIn: t('chip.title'),
    madeInNote: t('chip.note'),
  };

  return (
    <header data-hero>
      <HeroSlider slides={slides} labels={labels} rtl={locale === 'ar'} />
      <HeroStats stats={data.stats} locale={locale} />
    </header>
  );
}
