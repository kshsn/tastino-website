import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

interface StubPageProps {
  /** Key under `meta.*` and `nav.*` (e.g. `about`). */
  pageKey: string;
}

/** Placeholder so every route exists in /en and /ar during Epic 1; later epics replace these. */
export async function StubPage({ pageKey }: StubPageProps) {
  const t = await getTranslations();
  const navKey = `nav.${pageKey}`;
  const title = t.has(navKey) ? t(navKey) : t(`meta.${pageKey}.title`);
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <h1 className="headline text-[clamp(36px,5vw,64px)] font-extrabold">{title}</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{t(`meta.${pageKey}.description`)}</p>
      <p className="mt-10 inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted ring-1 ring-line">{t('stub.note')}</p>
      <div className="mt-10">
        <Link href="/distributors" className="inline-flex rounded-full bg-blue px-6 py-3.5 font-bold text-white">
          {t('nav.cta')}
        </Link>
      </div>
    </section>
  );
}
