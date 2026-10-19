'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useSearchParams } from 'next/navigation';
import { swapLocale } from '@/lib/locale-path';

/** A plain link to the same page in the other language; works without hydration. */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const t = useTranslations('header');
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const other = locale === 'ar' ? 'en' : 'ar';
  const href = swapLocale(pathname, other) + (search ? `?${search}` : '');
  return (
    <a
      href={href}
      hrefLang={other}
      lang={other}
      aria-label={t('switchToLabel')}
      className={`rounded-full border-[1.5px] border-line bg-white px-4 py-2 text-sm font-bold transition-colors hover:border-ink ${className}`}
    >
      <span className={other === 'ar' ? 'font-arabic' : 'font-sans'}>{t('switchTo')}</span>
    </a>
  );
}
