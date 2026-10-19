import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { NAV_ITEMS } from './nav-items';
import { StickyHeader } from './StickyHeader';

export async function SiteHeader() {
  const t = await getTranslations();
  return (
    <StickyHeader>
      <div className="mx-auto flex h-[84px] max-w-[1200px] items-center justify-between gap-5 px-6">
        <Link href="/" aria-label={t('header.logoLabel')} className="shrink-0">
          <Logo label={t('meta.siteName')} />
        </Link>
        <nav aria-label={t('header.mainNav')} className="hidden lg:block">
          <ul className="flex gap-4 text-[15px] font-semibold xl:gap-6">
            {NAV_ITEMS.slice(1).map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="relative py-2 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-center after:scale-x-0 after:bg-blue after:transition-transform hover:after:scale-x-100"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <LanguageSwitch />
          </Suspense>
          <Link
            href="/distributors"
            className="hidden whitespace-nowrap rounded-full bg-blue px-5 py-3.5 text-[15px] font-bold text-white xl:px-6 shadow-[0_10px_24px_-10px_var(--color-blue)] transition-transform hover:-translate-y-0.5 md:inline-flex"
          >
            {t('nav.cta')}
          </Link>
          <MobileMenu />
        </div>
      </div>
    </StickyHeader>
  );
}
