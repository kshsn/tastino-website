'use client';

import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';

// Animation features load as a separate chunk after first paint, outside the critical bundle.
const loadFeatures = () => import('./motion-features').then((m) => m.default);

interface MotionProviderProps {
  children: ReactNode;
}

/** Wraps the site so every `m.*` component honours the visitor's reduced-motion setting. */
export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
