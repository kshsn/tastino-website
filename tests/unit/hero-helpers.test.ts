import { describe, expect, it } from 'vitest';
import { FIRST_SLIDE_MS, OTHER_SLIDE_MS, slideDuration, swipeStep, wrapIndex } from '@/lib/hero';

describe('slideDuration', () => {
  it('keeps the video slide 15 seconds, like the old website', () => expect(slideDuration(0)).toBe(FIRST_SLIDE_MS));
  it('keeps every other slide 8 seconds', () => expect([slideDuration(1), slideDuration(2), slideDuration(3)]).toEqual([OTHER_SLIDE_MS, OTHER_SLIDE_MS, OTHER_SLIDE_MS]));
  it('gives every slide 8 seconds when the first slide is not the video', () => expect(slideDuration(0, false)).toBe(OTHER_SLIDE_MS));
  it('uses the documented values', () => expect([FIRST_SLIDE_MS, OTHER_SLIDE_MS]).toEqual([15000, 8000]));
});

describe('wrapIndex', () => {
  it('wraps past the last slide to the first', () => expect(wrapIndex(4, 4)).toBe(0));
  it('wraps before the first slide to the last', () => expect(wrapIndex(-1, 4)).toBe(3));
  it('leaves an index inside the range alone', () => expect(wrapIndex(2, 4)).toBe(2));
  it('returns 0 when there are no slides', () => expect(wrapIndex(3, 0)).toBe(0));
});

describe('swipeStep', () => {
  it('moves to the next slide on a leftward swipe in left-to-right pages', () => expect(swipeStep(-120, false)).toBe(1));
  it('moves to the previous slide on a rightward swipe in left-to-right pages', () => expect(swipeStep(120, false)).toBe(-1));
  it('mirrors in right-to-left pages', () => expect([swipeStep(120, true), swipeStep(-120, true)]).toEqual([1, -1]));
  it('ignores a short drag', () => expect(swipeStep(30, false)).toBe(0));
});
