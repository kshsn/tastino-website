import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { pageMetadata } from '@/lib/metadata';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'home', '/');
}

// Minimal hero for Epic 1. Epic 3 builds the full animated homepage from the approved mockup.
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-14 pb-24">
      <p className="eyebrow">{t('eyebrow')}</p>
      <h1 className="headline mt-4 text-[clamp(42px,6vw,76px)] font-extrabold">
        {t('titleA')}
        <br />
        <span className="text-blue">{t('titleB')}</span>
      </h1>
      <p className="mt-6 max-w-[520px] text-lg leading-relaxed text-muted">{t('lead')}</p>
      <div className="mt-8 flex flex-wrap gap-3.5">
        <Link href="/brands" className="inline-flex items-center gap-2.5 rounded-full bg-blue px-6 py-3.5 font-bold text-white">
          {t('explore')} <span aria-hidden="true" className="flip-rtl inline-block">→</span>
        </Link>
        <Link href="/distributors?reason=catalogue" className="inline-flex rounded-full border-2 border-ink px-6 py-3 font-bold hover:bg-ink hover:text-white">
          {t('catalogue')}
        </Link>
      </div>
    </section>
  );
}
