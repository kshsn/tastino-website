import type { CSSProperties } from 'react';
import type { HeroLabels } from './hero-types';

interface HeroControlsProps {
  count: number;
  /** The slider holds a video, so a pause button is needed even with a single slide. */
  hasVideo: boolean;
  index: number;
  /** The visitor (or a focus pause) stopped the automatic change. */
  paused: boolean;
  /** Reduced motion: no progress animation, no automatic change. */
  still: boolean;
  /** Milliseconds the current slide stays; drives the fill of the active dot. */
  durationMs: number;
  /** Changes whenever the timer restarts, so the dot fill restarts too. */
  cycle: number;
  labels: HeroLabels;
  slideLabels: string[];
  onPick: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

/** Arrows at the sides, and one pill with the pause button and a progress dot per slide. */
export function HeroControls({ count, hasVideo, index, paused, still, durationMs, cycle, labels, slideLabels, onPick, onPrev, onNext, onToggle }: HeroControlsProps) {
  return (
    <>
      {count > 1 && (
        <>
          <button type="button" className="hs-arrow hs-arrow-prev" onClick={onPrev} aria-label={labels.prev}>
            <Chevron />
          </button>
          <button type="button" className="hs-arrow hs-arrow-next" onClick={onNext} aria-label={labels.next}>
            <Chevron />
          </button>
        </>
      )}
      <div className="hs-bar">
        {!still && (count > 1 || hasVideo) && (
          <button type="button" className="hs-toggle" onClick={onToggle} aria-label={paused ? labels.play : labels.pause}>
            {paused ? (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            )}
          </button>
        )}
        {count > 1 && (
        <ol className="hs-dots">
          {Array.from({ length: count }, (_, k) => (
            <li key={k}>
              <button
                type="button"
                className={k === index ? 'on' : undefined}
                onClick={() => onPick(k)}
                aria-label={slideLabels[k]}
                aria-current={k === index ? 'true' : undefined}
              >
                <span
                  key={k === index ? `fill-${cycle}` : 'idle'}
                  className={k === index && !still ? 'fill run' : 'fill'}
                  style={{ '--hs-dur': `${durationMs}ms`, animationPlayState: paused ? 'paused' : 'running' } as CSSProperties}
                />
              </button>
            </li>
          ))}
        </ol>
        )}
      </div>
    </>
  );
}
