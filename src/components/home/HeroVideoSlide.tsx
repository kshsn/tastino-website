'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { HeroVideoModel } from './hero-types';

interface HeroVideoSlideProps {
  slide: HeroVideoModel;
  /** This slide is the one on show. */
  active: boolean;
  /** Motion is allowed: not reduced motion, not paused by the visitor, not hovered into a pause. */
  playing: boolean;
}

/** True when the browser asks pages to save data: the poster photo is shown and the video never loads. */
const savesData = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

/** Runs `fn` once the page has finished loading and the browser is idle, so the video never competes with the first paint. */
function afterLoad(fn: () => void): () => void {
  let cancelled = false;
  const run = () => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(() => !cancelled && fn());
    else window.setTimeout(() => !cancelled && fn(), 300);
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', run);
  };
}

/**
 * The old website's tomato-vine video, full width, with the headline over it. The video starts over each time
 * the slide comes back, stops when the slide is hidden or the visitor pauses, and never plays with reduced motion
 * or data saver (the poster photo stays).
 */
export function HeroVideoSlide({ slide, active, playing }: HeroVideoSlideProps) {
  const video = useRef<HTMLVideoElement>(null);
  const wasActive = useRef(false);
  const [ready, setReady] = useState(false);

  // The poster photo is what the first paint shows; the video file is only requested after the page has loaded.
  useEffect(() => afterLoad(() => setReady(true)), []);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (active && playing && ready && !savesData()) {
      if (!el.getAttribute('src')) {
        el.src = window.matchMedia('(max-width: 767px)').matches ? slide.srcSmall : slide.src;
      }
      if (!wasActive.current) el.currentTime = 0;
      el.play().catch(() => {
        // Autoplay can be blocked; the poster photo simply stays.
      });
    } else {
      el.pause();
    }
    wasActive.current = active;
  }, [active, playing, ready, slide.src, slide.srcSmall]);

  return (
    <div className="hs-slide-inner hs-video-slide">
      <video ref={video} className="hs-video" muted loop playsInline preload="none" poster={slide.poster} aria-hidden="true" tabIndex={-1} />
      <div className="hs-scrim" aria-hidden="true" />
      <div className="wrap hs-copy-wrap">
        <div className="hs-copy hs-copy-video">
          <div className="hs-eyebrow">{slide.eyebrow}</div>
          <h1>
            <span>{slide.titleA}</span>
            <br />
            <span className="hl">
              <span>{slide.titleB}</span>
              <svg viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 10 Q 80 2 150 8 T 298 6" fill="none" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="hs-lead">{slide.lead}</p>
          <div className="hs-cta">
            <Link className="btn btn-primary" href={slide.primary.href}>
              <span>{slide.primary.label}</span> <span className="arr" aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn-light" href={slide.secondary.href}>
              {slide.secondary.label}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
