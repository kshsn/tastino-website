import { getTranslations } from 'next-intl/server';
import type { HomeData } from '@/lib/content/home';
import { CountUp } from './CountUp';

interface HeroStatsProps {
  stats: HomeData['stats'];
  locale: string;
}

/** The three facts counted from the catalogue, in a band under the hero. A zero is never shown. */
export async function HeroStats({ stats, locale }: HeroStatsProps) {
  const t = await getTranslations('home');
  const items = [
    { key: 'brands', value: stats.brands },
    { key: 'products', value: stats.products },
    { key: 'formats', value: stats.formats },
  ].filter((s) => s.value > 0);
  if (items.length === 0) return null;
  return (
    <div className="hs-stats">
      <div className="wrap">
        <ul>
          {items.map((s) => (
            <li key={s.key}>
              <CountUp value={s.value} locale={locale} />
              <span>{t(`stats.${s.key}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
