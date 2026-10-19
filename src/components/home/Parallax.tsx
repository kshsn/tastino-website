'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const MAX_SHIFT_PX = 40;
const SPEED = 0.06;

interface ParallaxProps {
  children: ReactNode;
}

/** Shifts its content slightly as the page scrolls (never more than 40px). Static for reduced motion. */
export function Parallax({ children }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || typeof IntersectionObserver === 'undefined') return;
    let raf = 0;
    let visible = false;

    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const shift = (r.top + r.height / 2 - window.innerHeight / 2) * -SPEED;
      el.style.setProperty('--py', `${Math.max(-MAX_SHIFT_PX, Math.min(MAX_SHIFT_PX, shift)).toFixed(1)}px`);
    };
    const schedule = () => {
      if (visible && !raf) raf = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    io.observe(el);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div ref={ref} className="par">
      {children}
    </div>
  );
}
