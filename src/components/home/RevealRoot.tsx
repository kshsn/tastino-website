'use client';

import { useEffect } from 'react';

const STAGGER_MS = 80;
const MAX_STAGGER_STEPS = 6;

/**
 * Scroll reveal for every `[data-reveal]` element inside `.home`.
 * Content is visible in the server HTML. Only after this script runs, and only if motion is allowed and
 * IntersectionObserver exists, are below-the-fold elements hidden until they scroll into view (once).
 * If anything here fails, nothing stays hidden.
 */
export function RevealRoot() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = 'in';
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.15 },
    );

    for (const el of document.querySelectorAll<HTMLElement>('.home [data-reveal]')) {
      const siblings = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.hasAttribute('data-reveal')) : [el];
      el.style.transitionDelay = `${Math.min(siblings.indexOf(el), MAX_STAGGER_STEPS) * STAGGER_MS}ms`;
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        el.dataset.reveal = 'in';
      } else {
        el.dataset.reveal = 'pending';
        io.observe(el);
      }
    }
    return () => io.disconnect();
  }, []);

  return null;
}
