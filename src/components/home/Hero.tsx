import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { accentVars } from '@/lib/color';
import type { HomeData } from '@/lib/content/home';
import { CountUp } from './CountUp';
import { HeroShowcase } from './HeroShowcase';

interface HeroProps {
  data: HomeData;
  locale: string;
}

export async function Hero({ data, locale }: HeroProps) {
  const t = await getTranslations('home');
  const first = data.slides[0];
  // The first slide's color is known on the server, so the first paint already uses it. HeroShowcase
  // updates the same variable as the slides change.
  const style = first ? (accentVars(first.accent) as CSSProperties) : undefined;
  const stats = [
    { key: 'brands', value: data.stats.brands },
    { key: 'products', value: data.stats.products },
    { key: 'formats', value: data.stats.formats },
  ].filter((s) => s.value > 0);

  return (
    <header className="hero" data-hero style={style}>
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <div className="eyebrow">{t('eyebrow')}</div>
          <h1 className="mt-[18px]">
            <span>{t('titleA')}</span>
            <br />
            <span className="hl">
              <span>{t('titleB')}</span>
              <svg viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 10 Q 80 2 150 8 T 298 6" fill="none" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="lead">{t('lead')}</p>
          <div className="cta-row">
            <Link className="btn btn-primary" href="/brands">
              <span>{t('explore')}</span> <span className="arr" aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn-ghost" href="/distributors?reason=catalogue">
              {t('catalogue')}
            </Link>
          </div>
          {stats.length > 0 && (
            <div className="trust">
              {stats.map((s) => (
                <div key={s.key}>
                  <CountUp value={s.value} locale={locale} />
                  <span>{t(`stats.${s.key}`)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <HeroShowcase
          slides={data.slides}
          fallback={data.fallbackPicture}
          labels={{
            group: t('hero.group'),
            placeholder: t('imageSoon'),
            madeIn: t('chip.title'),
            madeInNote: t('chip.note'),
          }}
        />
      </div>
    </header>
  );
}
