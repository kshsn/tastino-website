'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatCount } from '@/lib/text';

const DURATION_MS = 1400;

interface CountUpProps {
  value: number;
  locale: string;
}

/**
 * Shows the final number in the server HTML, then counts up from 0 the first time it scrolls into view.
 * It ends exactly on `value`, runs once, and is skipped entirely for reduced motion.
 */
export function CountUp({ value, locale }: CountUpProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const finalText = formatCount(value, locale);

  useEffect(() => {
    const el = ref.current;
    const node = el?.firstChild;
    if (!el || !node || reduced || typeof IntersectionObserver === 'undefined') return;

    let raf = 0;
    let started = false;
    const run = () => {
      started = true;
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / DURATION_MS);
        node.nodeValue = p < 1 ? formatCount(Math.round(value * (1 - Math.pow(1 - p, 3))), locale) : finalText;
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (!started && entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      node.nodeValue = finalText;
    };
  }, [value, locale, reduced, finalText]);

  return <b ref={ref}>{finalText}</b>;
}
