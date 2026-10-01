import { describe, expect, it } from 'vitest';

import { HOSTILE_VALUES } from '@/test/hostile-values';

import { safeString } from './safe-string';

describe('safeString', () => {
  it('converts like String()', () => {
    expect(safeString('text')).toBe('text');
    expect(safeString(42)).toBe('42');
    expect(safeString(undefined)).toBe('undefined');
    expect(safeString(Symbol('s'))).toBe('Symbol(s)');
    expect(safeString(new TypeError('Boom'))).toBe('TypeError: Boom');
  });

  it.each(HOSTILE_VALUES)('never throws: %s', (_name, make) => {
    expect(typeof safeString(make())).toBe('string');
  });

  it('falls back to a placeholder, or to the one given', () => {
    const noPrototype = Object.create(null) as unknown;

    expect(safeString(noPrototype)).toBe('[unprintable value]');
    expect(safeString(noPrototype, '[none]')).toBe('[none]');
  });
});
