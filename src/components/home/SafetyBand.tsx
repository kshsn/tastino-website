import { getTranslations } from 'next-intl/server';
import { Picture } from '@/components/ui/Picture';
import { Link } from '@/i18n/navigation';
import type { HomeData } from '@/lib/content/home';
import { Paragraphs } from './Paragraphs';
import { Parallax } from './Parallax';

interface SafetyBandProps {
  data: HomeData;
}

export async function SafetyBand({ data }: SafetyBandProps) {
  const t = await getTranslations('home');
  const block = data.blocks['food-safety'];
  if (!block) return null; // unpublished in this language: no empty band

  return (
    <section id="quality">
      <div className="wrap">
        <div className="band" data-reveal>
          <div className="txt">
            <div className="eyebrow">{t('quality.eyebrow')}</div>
            <h2>{block.title}</h2>
            <Paragraphs items={block.paragraphs} />
            <div className="steps" aria-label={t('quality.stepsLabel')}>
              <span>{t('quality.step1')}</span>
              <i aria-hidden="true" />
              <span>{t('quality.step2')}</span>
              <i aria-hidden="true" />
              <span>{t('quality.step3')}</span>
            </div>
            <Link href="/quality" className="more-link">
              {t('quality.more')} <span className="arr flip-rtl" aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="pic">
            <Parallax>
              <Picture image={data.bandPicture} sizes="(max-width: 960px) 90vw, 520px" placeholder={t('imageSoon')} decorative />
            </Parallax>
          </div>
        </div>
      </div>
    </section>
  );
}
