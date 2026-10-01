import { describe, expect, it } from 'vitest';

import { detectLocale, matchLocale } from './detect';

describe('matchLocale', () => {
  it.each([
    ['es', 'es'],
    ['es-MX', 'es'],
    ['EN-gb', 'en'],
    ['fr-FR', undefined],
    [null, undefined],
    // A saved value is not trusted to be a string: it comes from storage.
    ['', undefined],
    [123, undefined],
    [{ v: 'es' }, undefined],
  ])('maps %j to %j', (tag, expected) => {
    expect(matchLocale(tag)).toBe(expected);
  });
});

describe('detectLocale', () => {
  it('prefers the saved choice, then the browser languages, then the default', () => {
    expect(detectLocale({ saved: 'es', browser: ['en-US'], fallback: 'en' })).toBe('es');
    expect(detectLocale({ saved: null, browser: ['fr-FR', 'es-ES'], fallback: 'en' })).toBe('es');
    expect(detectLocale({ saved: 'de', browser: ['fr'], fallback: 'en' })).toBe('en');
  });

  it('ignores a saved value that is not a string', () => {
    expect(detectLocale({ saved: { v: 'es' }, browser: ['en-US'], fallback: 'es' })).toBe('en');
  });
});
