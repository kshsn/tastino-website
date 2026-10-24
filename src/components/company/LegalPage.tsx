import { getTranslations } from 'next-intl/server';
import type { LocalBlock } from '@/lib/content/blocks';
import { formatLongDate } from '@/lib/date';
import { LegalBody } from './LegalBody';

interface LegalPageProps {
  locale: string;
  block: LocalBlock;
  updated: string;
  approved: boolean;
}

/** Privacy or Terms: shows the version date, and a clear notice while the text is still an unapproved draft. */
export async function LegalPage({ locale, block, updated, approved }: LegalPageProps) {
  const t = await getTranslations('company.legal');
  const date = formatLongDate(updated, locale);
  return (
    <article className="legal">
      <h1>{block.title}</h1>
      {date && <p className="updated">{t('updated', { date })}</p>}
      {!approved && (
        <div className="draft" role="note">
          <b>{t('draftTitle')}</b>
          {t('draftBody')}
        </div>
      )}
      <LegalBody paragraphs={block.paragraphs} />
    </article>
  );
}
