'use client';

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Link } from '@/i18n/navigation';
import { safeAccent } from '@/lib/color';

interface TiltCardProps {
  href: string;
  /** Brand accent color (CSS color) used for the card tint and shadow. */
  accent: string;
  children: ReactNode;
}

/**
 * A brand card that is one single link. With a mouse it tilts toward the pointer; touch and keyboard users
 * get the same lift from CSS :focus-visible and need no hover to navigate.
 */
export function TiltCard({ href, accent, children }: TiltCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = useReducedMotion();

  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el || reduced || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-8px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  // The accent comes from the database (per-brand color), so it is passed as a CSS variable.
  const style = { '--c': safeAccent(accent) } as CSSProperties;
  return (
    <Link ref={ref} href={href} className="bcard" style={style} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </Link>
  );
}
