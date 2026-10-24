import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { HomeData } from '@/lib/content/home';
import { Paragraphs } from './Paragraphs';

interface PortfolioSectionProps {
  data: HomeData;
}

const FORMATS = ['glass', 'pet', 'metal'] as const;
const CHANNELS = ['retail', 'wholesale', 'foodservice', 'catering'] as const;

export async function PortfolioSection({ data }: PortfolioSectionProps) {
  const t = await getTranslations('home');
  const block = data.blocks.portfolio;
  if (!block) return null;
  const [lead, ...rest] = block.paragraphs;

  return (
    <section id="products" className="flush-top">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div>
            <div className="eyebrow">{t('portfolio.eyebrow')}</div>
            <h2>{block.title}</h2>
          </div>
          {lead && <p>{lead}</p>}
        </div>

        <div className="formats" data-reveal>
          <div>
            <h3>{t('portfolio.formatsTitle')}</h3>
            <ul className="chips">
              {FORMATS.map((k) => (
                <li key={k}>{t(`portfolio.formats.${k}`)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>{t('portfolio.channelsTitle')}</h3>
            <ul className="chips">
              {CHANNELS.map((k) => (
                <li key={k}>{t(`portfolio.channels.${k}`)}</li>
              ))}
            </ul>
          </div>
        </div>

        {rest.length > 0 && (
          <div className="cols2" data-reveal>
            <Paragraphs items={rest} />
          </div>
        )}
        <Link href="/products" className="more-link">
          {t('portfolio.more')} <span className="arr flip-rtl" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
