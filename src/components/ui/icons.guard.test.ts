import { describe, expect, it } from 'vitest';

/**
 * Phase-3 icon system: `lucide-react` is imported in exactly one file — the barrel
 * (src/components/ui/icons.ts). The ESLint rule enforces this for new code; this test
 * is the fast, CI-visible invariant and documents the single swap point.
 */
const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/api/generated/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const importers = Object.entries(sources)
  .filter(([, source]) => /from ['"]lucide-react['"]/.test(source))
  .map(([file]) => file);

describe('icon barrel (spec §5 Phase 3)', () => {
  it('actually scans the source tree', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(5);
  });

  it('imports lucide-react in exactly one file: the barrel', () => {
    expect(importers).toEqual(['/src/components/ui/icons.ts']);
  });
});
