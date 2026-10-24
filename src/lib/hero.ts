// Timing and gesture rules of the homepage slider (same pace as the old website: the video slide stays 15 seconds,
// every other slide 8 seconds).

export const FIRST_SLIDE_MS = 15_000;
export const OTHER_SLIDE_MS = 8_000;

/** How long a slide stays before the slider moves on by itself (the 15 s only applies to a first slide that is the video). */
export const slideDuration = (index: number, firstIsVideo = true): number => (index === 0 && firstIsVideo ? FIRST_SLIDE_MS : OTHER_SLIDE_MS);

/** Keeps an index inside 0..count-1, wrapping both ways. */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

/**
 * Which way a horizontal swipe moves the slider: +1 next, -1 previous, 0 too short to count.
 * `dx` is end minus start; in right-to-left pages the slides sit mirrored, so the direction flips.
 */
export function swipeStep(dx: number, rtl: boolean, threshold = 50): -1 | 0 | 1 {
  if (Math.abs(dx) < threshold) return 0;
  const towardsNext = rtl ? dx > 0 : dx < 0;
  return towardsNext ? 1 : -1;
}
