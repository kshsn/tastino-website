import { describe, expect, it } from 'vitest';
import { PAGE_BG, accentSolid, accentText, accentVars, contrast, onAccent, safeAccent } from '@/lib/color';

describe('contrast', () => {
  it('is 21 for black on white', () => {
    expect(Math.round(contrast('#000000', '#ffffff'))).toBe(21);
  });
  it('is 1 for identical colors', () => {
    expect(contrast('#336699', '#336699')).toBeCloseTo(1, 5);
  });
  it('is symmetric', () => {
    expect(contrast('#f39200', '#fffbf5')).toBeCloseTo(contrast('#fffbf5', '#f39200'), 8);
  });
});

describe('onAccent', () => {
  it('uses dark text on the orange TAMA accent (white would fail 4.5:1)', () => {
    expect(contrast('#f39200', onAccent('#f39200'))).toBeGreaterThanOrEqual(4.5);
  });
  it('uses white text on the red Liora accent', () => {
    expect(onAccent('#c8102e')).toBe('#ffffff');
  });
});

describe('accentSolid', () => {
  it('keeps an accent that already works with its text color', () => {
    expect(accentSolid('#c8102e')).toBe('#c8102e');
  });
  it('gives every brand accent a solid background with 4.5:1 text (buttons and chips)', () => {
    for (const c of ['#F39200', '#C8102E', '#0F6B3E', '#E23B3B', '#2F8F3A', '#D62828', '#E8B100', '#1E6FD9']) {
      const solid = accentSolid(c);
      expect(contrast(solid, onAccent(solid))).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('falls back to the ink color for an invalid value', () => {
    expect(accentSolid('nope')).toBe('#14213d');
  });
});

describe('accentText', () => {
  it('darkens orange until it is readable as large text', () => {
    expect(contrast(accentText('#f39200'), PAGE_BG)).toBeGreaterThanOrEqual(3);
  });
  it('leaves an already readable color unchanged', () => {
    expect(accentText('#0f6b3e')).toBe('#0f6b3e');
  });
  it('falls back to the ink color for an invalid value', () => {
    expect(accentText('not-a-color')).toBe('#14213d');
  });
});

describe('safeAccent / accentVars (CSS injection guard)', () => {
  it('keeps a valid #rrggbb color', () => {
    expect(safeAccent(' #F39200 ')).toBe('#F39200');
  });
  it.each(['red;background:url(https://evil/x)', 'red', '#fff', '#12345g', 'rgb(1,2,3)', '', null, undefined, 42])(
    'replaces %j with the default accent',
    (bad) => {
      expect(safeAccent(bad)).toBe('#1E6FD9');
    },
  );
  it('never emits a semicolon or url() in any variable', () => {
    const vars = Object.values(accentVars('red;background:url(https://evil/x)')).join(' ');
    expect(vars).not.toMatch(/[;()]/);
  });
});
