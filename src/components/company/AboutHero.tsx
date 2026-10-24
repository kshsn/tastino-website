import { getTranslations } from 'next-intl/server';
import { Picture } from '@/components/ui/Picture';
import type { PictureData } from '@/lib/media/types';

interface AboutHeroProps {
  first: string;
  second: string;
  intro?: string;
  collage: PictureData[];
}

const SLOTS = ['c1', 'c2', 'c3'] as const;

export async function AboutHero({ first, second, intro, collage }: AboutHeroProps) {
  const t = await getTranslations('company');
  return (
    <div className="ahero">
      <div>
        <div className="eyebrow">{t('about.eyebrow')}</div>
        <h1 className="mt-3">
          {first}
          {second && (
            <>
              <br />
              <span className="tint">{second}</span>
            </>
          )}
        </h1>
        {intro && <p>{intro}</p>}
      </div>
      {collage.length === 3 && (
        <div className="collage" aria-hidden="true">
          <div className="disc" />
          {collage.map((pic, i) => (
            <Picture key={SLOTS[i]} image={pic} sizes="(max-width: 960px) 40vw, 220px" placeholder={t('imageSoon')} className={SLOTS[i]} priority={i === 1} decorative />
          ))}
        </div>
      )}
    </div>
  );
}
