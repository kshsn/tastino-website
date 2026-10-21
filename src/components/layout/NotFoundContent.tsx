'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Text of the localized 404 page. It is a client component on purpose: a 404 can be raised while a page is being
 * built or revalidated, where reading request headers (as the server translation helpers do) is not allowed.
 */
export function NotFoundContent() {
  const t = useTranslations('notFound');
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <p className="eyebrow">{t('eyebrow')}</p>
      <h1 className="headline mt-4 text-[clamp(36px,5vw,60px)] font-extrabold">{t('title')}</h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{t('body')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="rounded-full bg-blue px-6 py-3.5 font-bold text-white">{t('home')}</Link>
        <Link href="/distributors" className="rounded-full border-2 border-ink px-6 py-3 font-bold">{t('contact')}</Link>
      </div>
    </section>
  );
}
