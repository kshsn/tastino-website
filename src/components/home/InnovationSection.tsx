import { getTranslations } from 'next-intl/server';
import { Picture } from '@/components/ui/Picture';
import { Link } from '@/i18n/navigation';
import type { HomeData } from '@/lib/content/home';
import { Paragraphs } from './Paragraphs';

interface InnovationSectionProps {
  data: HomeData;
}

const FAN_CLASSES = ['f1', 'f2', 'f3'] as const;

export async function InnovationSection({ data }: InnovationSectionProps) {
  const t = await getTranslations('home');
  const block = data.blocks.innovation;
  if (!block) return null;

  return (
    <section id="innovation" className="flush-top">
      <div className="wrap split">
        {data.fan.length === 3 && (
          <div className="fan" data-reveal aria-hidden="true">
            <span className="halo" />
            {data.fan.map((pic, i) => (
              <Picture key={FAN_CLASSES[i]} image={pic} sizes="(max-width: 960px) 40vw, 220px" placeholder={t('imageSoon')} className={FAN_CLASSES[i]} decorative />
            ))}
          </div>
        )}
        <div data-reveal>
          <div className="eyebrow">{t('innovation.eyebrow')}</div>
          <h2>{block.title}</h2>
          <div className="copy">
            <Paragraphs items={block.paragraphs} bigIndex={2} />
          </div>
          <Link href="/innovation" className="more-link">
            {t('innovation.more')} <span className="arr flip-rtl" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
