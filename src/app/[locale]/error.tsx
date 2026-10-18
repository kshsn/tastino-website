'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// No stack trace or internal detail is ever shown; `error` is only logged by Next on the server.
export default function ErrorPage({ reset }: ErrorPageProps) {
  const t = useTranslations('error');
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <h1 className="headline text-[clamp(36px,5vw,60px)] font-extrabold">{t('title')}</h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{t('body')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={() => reset()} className="rounded-full bg-blue px-6 py-3.5 font-bold text-white">
          {t('retry')}
        </button>
        <Link href="/" className="rounded-full border-2 border-ink px-6 py-3 font-bold">{t('home')}</Link>
      </div>
    </section>
  );
}
