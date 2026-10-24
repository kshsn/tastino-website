import { getTranslations } from 'next-intl/server';
import { Paragraphs } from '@/components/home/Paragraphs';

interface SafetyBandProps {
  title: string;
  paragraphs: string[];
}

const STEPS = ['s1', 's2', 's3'] as const;

/** The official food-safety copy around a three-step timeline: before, during and after manufacturing. */
export async function SafetyBand({ title, paragraphs }: SafetyBandProps) {
  const t = await getTranslations('company.quality');
  const [intro, ...rest] = paragraphs;
  return (
    <section id="food-safety" className="flush">
      <div className="safety">
        <div className="eyebrow">{t('eyebrow')}</div>
        <h2>{title}</h2>
        {intro && <p>{intro}</p>}
        <ol className="timeline" aria-label={t('timelineLabel')}>
          {STEPS.map((k, i) => (
            <li key={k} className="step">
              <div className="dot" aria-hidden="true">{i + 1}</div>
              <b>{t(`${k}.title`)}</b>
              <span>{t(`${k}.text`)}</span>
            </li>
          ))}
        </ol>
        <Paragraphs items={rest} />
      </div>
    </section>
  );
}
