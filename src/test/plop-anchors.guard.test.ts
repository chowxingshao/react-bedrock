import { describe, expect, it } from 'vitest';

/**
 * The generators (plopfile.js, docs/generators.md) insert code at these anchors: a `// plop:…` comment
 * line, or the opening line of the `nav` and `pages` objects of common.json. Each must occur exactly
 * once, or the generator refuses to run (and a deleted anchor would otherwise go unnoticed until then).
 *
 * Languages are configuration, so the locale anchors follow the folders of src/locales: each locale
 * needs its own `// plop:resources-<code>` line inside its block of resources.ts, and a `"nav"` and a
 * `"pages"` object in its common.json.
 */

// import.meta.glob needs literal patterns, so the files are listed here once, not derived.
const sources = import.meta.glob<string>(
  [
    '/src/core/i18n/resources.ts',
    '/src/mocks/handlers.ts',
    '/src/config/paths.ts',
    '/src/app/router.tsx',
    '/src/app/navigation.ts',
    '/src/locales/*/*.json',
  ],
  { query: '?raw', import: 'default', eager: true },
);

/** The language folders of src/locales (a folder counts once it holds a JSON file), sorted. */
const locales = [
  ...new Set(
    Object.keys(sources).flatMap((file) => /^\/src\/locales\/([^/]+)\//.exec(file)?.[1] ?? []),
  ),
].sort();

const ANCHORS: Record<string, string[]> = {
  '/src/core/i18n/resources.ts': [
    '// plop:resources-imports',
    ...locales.map((code) => `// plop:resources-${code}`),
  ],
  '/src/mocks/handlers.ts': ['// plop:handlers-imports', '// plop:handlers'],
  '/src/config/paths.ts': ['// plop:paths'],
  '/src/app/router.tsx': ['// plop:routes'],
  '/src/app/navigation.ts': ['// plop:nav-imports', '// plop:nav'],
  ...Object.fromEntries(
    locales.map((code) => [`/src/locales/${code}/common.json`, ['"nav": {', '"pages": {']]),
  ),
};

describe('generator anchors (plopfile.js)', () => {
  it('finds the locale folders the generators write to', () => {
    expect(locales.length, 'no folder in src/locales').toBeGreaterThan(0);
  });

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
