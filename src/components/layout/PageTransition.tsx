'use client';

import { useEffect, useState, type ReactNode } from 'react';

// Set after the first page has mounted, so the very first load is never delayed by an animation.
let hasNavigated = false;

interface PageTransitionProps {
  children: ReactNode;
}

/** Fades and slides each new page in (under 300ms) on client-side navigation. Reduced motion disables it in CSS. */
export function PageTransition({ children }: PageTransitionProps) {
  const [animate] = useState(() => hasNavigated);
  useEffect(() => {
    hasNavigated = true;
  }, []);
  return <div className={animate ? 'page-in' : undefined}>{children}</div>;
}
