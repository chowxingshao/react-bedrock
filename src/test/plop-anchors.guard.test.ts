import { describe, expect, it } from 'vitest';

/**
 * The generators (plopfile.js, docs/generators.md) insert code at these anchors: a `// plop:…` comment
 * line, or the opening line of the `nav` and `pages` objects of common.json. Each must occur exactly
 * once, or the generator refuses to run (and a deleted anchor would otherwise go unnoticed until then).
 */
const ANCHORS: Record<string, string[]> = {
  '/src/core/i18n/resources.ts': [
    '// plop:resources-imports',
    '// plop:resources-en',
    '// plop:resources-es',
  ],
  '/src/mocks/handlers.ts': ['// plop:handlers-imports', '// plop:handlers'],
  '/src/config/paths.ts': ['// plop:paths'],
  '/src/app/router.tsx': ['// plop:routes'],
  '/src/app/navigation.ts': ['// plop:nav-imports', '// plop:nav'],
  '/src/locales/en/common.json': ['"nav": {', '"pages": {'],
  '/src/locales/es/common.json': ['"nav": {', '"pages": {'],
};

// import.meta.glob needs literal patterns, so the keys of ANCHORS are repeated here.
const sources = import.meta.glob<string>(
  [
    '/src/core/i18n/resources.ts',
    '/src/mocks/handlers.ts',
    '/src/config/paths.ts',
    '/src/app/router.tsx',
    '/src/app/navigation.ts',
    '/src/locales/*/common.json',
  ],
  { query: '?raw', import: 'default', eager: true },
);

describe('generator anchors (plopfile.js)', () => {
  it.each(Object.entries(ANCHORS))('%s carries every anchor exactly once', (file, anchors) => {
    const lines = (sources[file] ?? '').split(/\r?\n/).map((line) => line.trim());
    expect(lines.length, `${file} was not read`).toBeGreaterThan(1);
    for (const anchor of anchors) {
      expect(
        lines.filter((line) => line === anchor),
        anchor,
      ).toHaveLength(1);
    }
  });
});
