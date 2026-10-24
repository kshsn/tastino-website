'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { slideDuration, swipeStep, wrapIndex } from '@/lib/hero';
import { HeroControls } from './HeroControls';
import { HeroProductSlide } from './HeroProductSlide';
import { HeroVideoSlide } from './HeroVideoSlide';
import type { HeroLabels, HeroSlideModel } from './hero-types';

interface HeroSliderProps {
  slides: HeroSlideModel[];
  labels: HeroLabels;
  rtl: boolean;
}

/**
 * The full-width homepage hero: the looping video first (15 s), then the product slides (8 s each).
 * It changes by itself, and stops while the visitor pauses it, while focus is inside it, and always under reduced
 * motion. Arrows, dots, keyboard arrows and swipes move it and restart the timer.
 */
export function HeroSlider({ slides, labels, rtl }: HeroSliderProps) {
  const count = slides.length;
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const swipeStart = useRef<number | null>(null);

  const paused = userPaused || focusPaused;
  const running = count > 1 && !reduced && !paused;

  const goTo = useCallback(
    (target: number) => {
      setIndex(wrapIndex(target, count));
      setCycle((n) => n + 1);
    },
    [count],
  );

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => {
      setIndex((i) => wrapIndex(i + 1, count));
      setCycle((n) => n + 1);
    }, slideDuration(index));
    return () => window.clearTimeout(id);
  }, [running, index, cycle, count]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    // Arrow keys only act inside the slider, and mirror in right-to-left pages.
    const towardsNext = (e.key === 'ArrowRight') !== rtl;
    goTo(index + (towardsNext ? 1 : -1));
  };

  const onPointerDown = (e: PointerEvent) => {
    swipeStart.current = e.pointerType === 'touch' ? e.clientX : null;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (swipeStart.current === null) return;
    const step = swipeStep(e.clientX - swipeStart.current, rtl);
    swipeStart.current = null;
    if (step !== 0) goTo(index + step);
  };

  const slideLabels = slides.map((_, k) => labels.slideOf.replace('{n}', String(k + 1)).replace('{total}', String(count)));

  return (
    <section
      className="hs"
      aria-roledescription="carousel"
      aria-label={labels.region}
      onKeyDown={onKeyDown}
      onFocus={() => setFocusPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusPaused(false);
      }}
    >
      <div className="hs-viewport" aria-live={running ? 'off' : 'polite'} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipeStart.current = null)}>
        {slides.map((slide, k) => (
          <div
            key={slide.id}
            className={`hs-slide${k === index ? ' active' : ''}`}
            role="group"
            aria-roledescription="slide"
            aria-label={slideLabels[k]}
            aria-hidden={k === index ? undefined : true}
            inert={k === index ? undefined : true}
          >
            {slide.kind === 'video' ? (
              <HeroVideoSlide slide={slide} active={k === index} playing={!reduced && !userPaused} />
            ) : (
              <HeroProductSlide slide={slide} labels={labels} />
            )}
          </div>
        ))}
      </div>
      {count > 1 && (
        <HeroControls
          count={count}
          index={index}
          paused={paused}
          still={reduced}
          durationMs={slideDuration(index)}
          cycle={cycle}
          labels={labels}
          slideLabels={slideLabels}
          onPick={goTo}
          onPrev={() => goTo(index - 1)}
          onNext={() => goTo(index + 1)}
          onToggle={() => setUserPaused((p) => !p)}
        />
      )}
    </section>
  );
}
