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
