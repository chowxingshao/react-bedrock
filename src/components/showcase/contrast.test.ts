import { describe, expect, it } from 'vitest';

import { contrastRatio, relativeLuminance } from './contrast';

describe('relativeLuminance', () => {
  it('is 0 for black', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });
  it('is 1 for white', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(ratio).toBeCloseTo(21, 1);
  });
  it('is 1:1 for identical colours', () => {
    expect(contrastRatio({ r: 18, g: 18, b: 18 }, { r: 18, g: 18, b: 18 })).toBeCloseTo(1, 5);
  });
  it('is symmetric', () => {
    const a = { r: 10, g: 80, b: 200 };
    const b = { r: 240, g: 240, b: 240 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 5);
  });
});
