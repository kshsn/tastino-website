import { getTranslations } from 'next-intl/server';

const KEYS = ['v1', 'v2', 'v3'] as const;

/** Three short statements taken from the official About copy (ingredients, machinery, training). */
export async function ValueCards() {
  const t = await getTranslations('company.about');
  return (
    <ul className="vals" aria-label={t('valuesLabel')}>
      {KEYS.map((k, i) => (
        <li key={k} className="val">
          <i aria-hidden="true">{`0${i + 1}`}</i>
          <b>{t(`${k}.title`)}</b>
          <span>{t(`${k}.text`)}</span>
        </li>
      ))}
    </ul>
  );
}
