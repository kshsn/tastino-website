import { getTranslations } from 'next-intl/server';
import type { HomeData } from '@/lib/content/home';
import { splitTagline } from '@/lib/text';
import { Paragraphs } from './Paragraphs';

interface AboutSectionProps {
  data: HomeData;
}

export async function AboutSection({ data }: AboutSectionProps) {
  const t = await getTranslations('home');
  const about = data.blocks.about;
  if (!about) return null; // no published block in this language: leave the section out

  const tagline = splitTagline(data.blocks.tagline?.paragraphs[0] ?? `${t('titleA')} ${t('titleB')}`);
  return (
    <section id="about">
      <div className="wrap about">
        <div data-reveal>
          <div className="eyebrow">{t('about.eyebrow')}</div>
          <h2>
            {tagline.first}
            {tagline.second && (
              <>
                <br />
                <span className="tint">{tagline.second}</span>
              </>
            )}
          </h2>
          <ul className="pillars">
            {(['pillar1', 'pillar2', 'pillar3'] as const).map((k) => (
              <li key={k} className="pill">
                {t(`about.${k}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="copy" data-reveal>
          <Paragraphs items={about.paragraphs} bigIndex={0} />
        </div>
      </div>
    </section>
  );
}
