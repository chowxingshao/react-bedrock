import { describe, expect, it } from 'vitest';

import { SUPPORTED_LOCALES } from '@/config/constants';

import { namespaces, resources } from './resources';

/** Flattens nested translations into [dotted.key, value] pairs. */
function flatten(value: unknown, prefix = ''): [string, unknown][] {
  if (typeof value !== 'object' || value === null) return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

const keysOf = (value: unknown) =>
  flatten(value)
    .map(([key]) => key)
    .sort((a, b) => a.localeCompare(b));

describe('translation resources', () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const ns of namespaces) {
      it(`${locale}/${ns} has exactly the keys of en/${ns}`, () => {
        expect(keysOf(resources[locale][ns])).toEqual(keysOf(resources.en[ns]));
      });

      it(`${locale}/${ns} has no empty or non-string values`, () => {
        for (const [key, text] of flatten(resources[locale][ns])) {
          expect(typeof text === 'string' && text.trim() !== '', `${locale}/${ns}:${key}`).toBe(
            true,
          );
        }
      });
    }
  }
});
