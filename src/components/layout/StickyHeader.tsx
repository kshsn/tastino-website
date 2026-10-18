'use client';

import { useEffect, useState, type ReactNode } from 'react';

/** Adds the bottom border once the page scrolls past 8px, as in the mockup. */
export function StickyHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header
      className={`sticky top-0 z-50 border-b bg-bg/90 backdrop-blur-md transition-colors ${scrolled ? 'border-line' : 'border-transparent'}`}
    >
      {children}
    </header>
  );
}
