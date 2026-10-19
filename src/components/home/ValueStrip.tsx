import { getTranslations } from 'next-intl/server';

const ITEMS = [
  { key: 'safety', paths: ['M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z', 'M9 12l2 2 4-4'] },
  { key: 'natural', paths: ['M5 21c0-9 5-15 15-16-1 10-7 15-15 16z', 'M5 21l8-8'] },
  { key: 'facility', paths: ['M3 21V9l6 4V9l6 4V5h6v16z'] },
  { key: 'partner', paths: ['M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18', 'M12 3a9 9 0 100 18 9 9 0 000-18z'] },
] as const;

export async function ValueStrip() {
  const t = await getTranslations('home.features');
  return (
    <div className="wrap features-wrap">
      <h2 className="sr-only">{t('heading')}</h2>
      <ul className="features">
        {ITEMS.map((item) => (
          <li key={item.key} className="feat" data-reveal>
            <div className="ic" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                {item.paths.map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
            </div>
            <h3>{t(`${item.key}.title`)}</h3>
            <p>{t(`${item.key}.text`)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
