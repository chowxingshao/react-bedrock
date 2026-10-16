import { describe, expect, it } from 'vitest';

/**
 * Phase-5 motion enforcement: `gsap` / `@gsap/react` stay out of the shipped bundle.
 * The only non-test, non-story importer is the reduced-motion-safe hook (src/hooks/use-gsap.ts),
 * so projects that don't animate pay nothing. The ESLint `no-restricted-imports` rule enforces the
 * full ban (including story/test homes); this test is the fast, CI-visible bundle invariant.
 */
const sources = import.meta.glob<string>(
  ['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/**/*.stories.tsx'],
  { query: '?raw', import: 'default', eager: true },
);

const importers = Object.entries(sources)
  .filter(([, source]) => /from ['"](?:gsap(?:\/[^'"]*)?|@gsap\/[^'"]+)['"]/.test(source))
  .map(([file]) => file);

describe('gsap confinement (spec §5 Phase 5)', () => {
  it('actually scans the source tree', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(5);
  });

  it('imports gsap outside tests/stories in exactly one file: the useGsap hook', () => {
    expect(importers).toEqual(['/src/hooks/use-gsap.ts']);
  });
});
