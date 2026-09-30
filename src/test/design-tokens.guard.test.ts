import { describe, expect, it } from 'vitest';

/**
 * Spec Principle 1: components use token-backed utilities only.
 * Scans source files (not tests, mocks or generated code) for hard-coded design values.
 * For a justified exception, put the comment `design-tokens-guard-ignore` on the same line.
 */
const sources = import.meta.glob<string>(
  [
    '/src/**/*.{ts,tsx}',
    '!/src/**/*.test.{ts,tsx}',
    '!/src/test/**',
    '!/src/mocks/**',
    '!/src/api/generated/**',
  ],
  { query: '?raw', import: 'default', eager: true },
);

const PALETTE =
  'black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe';
const COLOUR_UTILITIES =
  'bg|text|border|border-[trblxy]|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow';

const RULES = [
  {
    name: 'hex colour',
    pattern: /(?<![\w&/])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i,
    hint: 'Use a semantic colour utility backed by tokens.css (bg-primary, text-muted-foreground, …).',
  },
  {
    name: 'raw palette colour',
    pattern: new RegExp(`\\b(?:${COLOUR_UTILITIES})-(?:${PALETTE})(?:-\\d{2,3})?(?![\\w-])`),
    hint: 'Use a semantic colour utility backed by tokens.css instead of the Tailwind palette.',
  },
  {
    name: 'arbitrary pixel value',
    pattern: /\[[^\]\n]*\d(?:\.\d+)?px[^\]\n]*\]/,
    hint: 'Use the spacing / radius / ring scale (p-2, rounded-md, ring-3, --spacing(n), …).',
  },
  {
    name: 'raw z-index',
    pattern: /\bz-\d+\b/,
    hint: 'Use the layers from tokens.css: z-sticky, z-dropdown, z-modal, z-toast.',
  },
  {
    name: 'raw duration',
    pattern: /\bduration-\d+\b/,
    hint: 'Use the durations from tokens.css: duration-fast, duration-normal, duration-slow.',
  },
];

describe('design-token guard (spec Principle 1)', () => {
  it('actually scans the source tree', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(5);
  });

  it.each(RULES)('finds no $name in src/', ({ pattern, hint }) => {
    const offences: string[] = [];
    for (const [file, source] of Object.entries(sources)) {
      source.split('\n').forEach((line, index) => {
        if (!line.includes('design-tokens-guard-ignore') && pattern.test(line)) {
          offences.push(`${file}:${index + 1}  ${line.trim()}`);
        }
      });
    }
    expect(offences, hint).toEqual([]);
  });
});
