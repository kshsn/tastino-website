import { getTranslations } from 'next-intl/server';
import { Logo } from '@/components/layout/Logo';

/**
 * The introduction from the old website: title and two paragraphs on one side, the official logo on the other.
 * The wording is the client's own choice, kept as supplied (see decisions.md, 2026-10-24).
 */
export async function AboutIntro() {
  const t = await getTranslations('company.about.intro');
  const logoLabel = (await getTranslations('meta'))('siteName');
  return (
    <section id="intro" className="flush" aria-labelledby="intro-h">
      <div className="intro">
        <div className="copy">
          <h2 id="intro-h">{t('title')}</h2>
          <p>{t('p1')}</p>
          <p>{t('p2')}</p>
        </div>
        <div className="logo-card">
          <Logo label={logoLabel} height={170} className="h-auto w-full max-w-[420px]" />
        </div>
      </div>
    </section>
  );
}
