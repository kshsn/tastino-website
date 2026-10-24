'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Picture } from '@/components/ui/Picture';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { accentVars } from '@/lib/color';
import type { HomeSlide } from '@/lib/content/home';
import type { PictureData } from '@/lib/media/types';

// Same pace as the old website's slider (8 seconds per slide), which is much calmer than the first 4-second version.
const CYCLE_MS = 8000;
const OUT_MS = 450;
const IN_MS = 700;

type Phase = 'idle' | 'out' | 'in';

interface HeroShowcaseProps {
  slides: HomeSlide[];
  /** Shown instead of the cycle when no slide is published. */
  fallback: PictureData | null;
  labels: { group: string; placeholder: string; madeIn: string; madeInNote: string };
}

/**
 * The animated product stage: one packshot bobs while brand color, chip and blob change every 8 seconds.
 * Auto-cycle pauses on hover and focus and is off for reduced motion. Dots and keyboard jump to a slide
 * and restart the timer; rapid input can never leave two packshots or two timers running.
 */
export function HeroShowcase({ slides, fallback, labels }: HeroShowcaseProps) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [paused, setPaused] = useState(false);
  const [restart, setRestart] = useState(0);
  const indexRef = useRef(0);
  const timers = useRef<number[]>([]);
  const count = slides.length;

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const go = useCallback(
    (target: number) => {
      if (target === indexRef.current) return;
      clearTimers();
      const commit = () => {
        indexRef.current = target;
        setIndex(target);
      };
      if (reduced) {
        commit();
        setPhase('idle');
        return;
      }
      setPhase('out');
      timers.current.push(
        window.setTimeout(() => {
          commit();
          setPhase('in');
          timers.current.push(window.setTimeout(() => setPhase('idle'), IN_MS));
        }, OUT_MS),
      );
    },
    [reduced],
  );

  // Brand color follows the slide: set on the hero root so the headline underline, CTA, blob and chip all change.
  useEffect(() => {
    if (index === 0 && phase === 'idle' && restart === 0) return;
    const hero = root.current?.closest<HTMLElement>('[data-hero]');
    const accent = slides[index]?.accent;
    if (hero && accent) for (const [name, value] of Object.entries(accentVars(accent))) hero.style.setProperty(name, value);
  }, [index, phase, restart, slides]);

  useEffect(() => {
    if (count < 2 || paused || reduced) return;
    const id = window.setInterval(() => go((indexRef.current + 1) % count), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [count, paused, reduced, restart, go]);

  useEffect(() => () => clearTimers(), []);

  const pick = (k: number) => {
    go(k);
    setRestart((n) => n + 1);
  };

  const current = slides[index];
  const phaseClass = phase === 'out' ? 'swap-out' : phase === 'in' ? 'swap-in' : '';

  return (
    <div
      ref={root}
      className="stage"
      role="group"
      aria-label={labels.group}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="ring" aria-hidden="true" />
      <div className="blob" aria-hidden="true" />
      <svg className="leaf leaf-a" viewBox="0 0 40 40" aria-hidden="true"><path d="M4 36C4 16 16 4 36 4 36 24 24 36 4 36z" /></svg>
      <svg className="leaf leaf-b" viewBox="0 0 40 40" aria-hidden="true"><path d="M4 36C4 16 16 4 36 4 36 24 24 36 4 36z" /></svg>

      <div className={`prod ${phaseClass}`}>
        {count > 0 ? (
          slides.map((s, k) => (
            <div key={s.id} className={`slide${k === index ? ' active' : ''}`} aria-hidden={k === index ? undefined : true}>
              <Picture image={s.picture} sizes="(max-width: 960px) 70vw, 340px" placeholder={labels.placeholder} priority={k === 0} />
            </div>
          ))
        ) : (
          <div className="slide active">
            <Picture image={fallback} sizes="(max-width: 960px) 70vw, 340px" placeholder={labels.placeholder} priority />
          </div>
        )}
      </div>

      {current && (
        <div className="chip c1" aria-hidden="true">
          <i>{current.brand.charAt(0)}</i>
          <span>
            <span>{current.brand}</span>
            <small>{current.label}</small>
          </span>
        </div>
      )}
      <div className="chip c2">
        <i aria-hidden="true">✓</i>
        <span>
          {labels.madeIn}
          <small>{labels.madeInNote}</small>
        </span>
      </div>

      {count > 1 && (
        <div className="dots">
          {slides.map((s, k) => (
            <button
              key={s.id}
              type="button"
              aria-label={`${s.brand} — ${s.label}`}
              aria-current={k === index}
              onClick={() => pick(k)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
