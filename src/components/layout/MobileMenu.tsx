'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { NAV_ITEMS } from './nav-items';

export function MobileMenu() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t('header.closeMenu') : t('header.openMenu')}
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-full border-[1.5px] border-line bg-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {/* Portalled to <body>: the header's backdrop-filter would otherwise trap this fixed panel. */}
      {open && createPortal(
      <nav
        id={panelId}
        aria-label={t('header.mainNav')}
        className="fixed inset-x-0 top-[84px] bottom-0 z-40 overflow-y-auto bg-bg px-6 py-6 lg:hidden"
      >
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-3 text-lg font-semibold hover:bg-white"
              >
                {t(`nav.${item.key}`)}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/distributors"
          onClick={() => setOpen(false)}
          className="mt-6 flex justify-center rounded-full bg-blue px-6 py-4 font-bold text-white"
        >
          {t('nav.cta')}
        </Link>
      </nav>,
      document.body,
      )}
    </div>
  );
}
