import { describe, expect, it } from 'vitest';

import globals from './globals.css?raw';

/**
 * Phase-1 border mechanism (see docs/design-system.md): the bare `border`
 * utility reads --border-width only because globals.css wires Tailwind's
 * --default-border-width to it. Phase-2 variants (tone="outline", Card
 * elevation) depend on this, so guard it against silent removal.
 */
describe('globals.css border-width wiring', () => {
  it('maps the default border width to the --border-width token', () => {
    expect(globals).toMatch(/--default-border-width:\s*var\(--border-width\)/);
  });
});

describe('globals.css motion utilities (Phase 4)', () => {
  it('defines token-driven interaction + enter/exit + stagger utilities', () => {
    expect(globals).toMatch(/@utility interactive\b/);
    expect(globals).toMatch(/@utility press\b/);
    expect(globals).toMatch(/@utility hover-lift\b/);
    expect(globals).toMatch(/@utility enter\b/);
    expect(globals).toMatch(/@utility exit\b/);
    expect(globals).toMatch(/@utility stagger\b/);
  });

  it('wires enter/exit to duration + easing tokens', () => {
    expect(globals).toMatch(
      /animation:\s*enter-rise var\(--duration-normal\) var\(--ease-entrance\)/,
    );
    expect(globals).toMatch(/animation:\s*exit-rise var\(--duration-fast\) var\(--ease-exit\)/);
  });

  it('zeroes animation-delay under reduced motion so stagger children are not held invisible', () => {
    expect(globals).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-delay:\s*0s !important/,
    );
  });

  it('wires hover-lift distance to the --move token', () => {
    expect(globals).toMatch(/hover-lift[\s\S]*var\(--move-sm\)/);
  });
});
