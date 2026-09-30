import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('joins class names and drops empty values', () => {
    expect(cn('px-2', null, undefined, { 'font-bold': true, italic: false })).toBe(
      'px-2 font-bold',
    );
  });

  it('lets later utilities win conflicts', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('bg-primary', 'bg-destructive')).toBe('bg-destructive');
  });

  it('understands the token layer and duration utilities', () => {
    expect(cn('z-dropdown', 'z-modal')).toBe('z-modal');
    expect(cn('duration-fast', 'duration-slow')).toBe('duration-slow');
  });
});
