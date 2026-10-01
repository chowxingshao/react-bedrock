import { afterEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/config/env';
import { localStore, STORAGE_KEYS } from '@/core/storage';

/**
 * Loads a fresh copy of the i18n module, as a page load does, and returns the language it starts
 * in plus the locale of that copy's formatters. This lives in its own file because i18next is an
 * external singleton: every fresh copy re-initialises the instance the other i18n tests share.
 *
 * The formatters come from the same fresh load. `<html lang>` cannot show whether the start-up
 * sync ran: an earlier copy's `languageChanged` listener sets it when the new copy initialises.
 */
async function startLanguage({
  saved,
  browser,
  single,
}: {
  saved?: unknown;
  /** `navigator.languages`; `null` stands for an environment that does not define it. */
  browser: string[] | null;
  /** `navigator.language`, the older single-value form. */
  single?: string;
}) {
  if (saved !== undefined) localStore.set(STORAGE_KEYS.locale, saved);
  vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(
    browser ?? (undefined as unknown as string[]),
  );
  if (single !== undefined) vi.spyOn(window.navigator, 'language', 'get').mockReturnValue(single);
  vi.resetModules();
  const { i18n } = await import('./i18n');
  const { getFormatLocale } = await import('@/lib/format');
  return { language: i18n.language, formatLocale: getFormatLocale() };
}

describe('the language the app starts in', () => {
  afterEach(() => {
    // The fresh copies sync <html>; put it back for the next test.
    document.documentElement.lang = 'en';
  });

  it('is the saved choice, ahead of the browser language', async () => {
    expect(await startLanguage({ saved: 'es', browser: ['en-US'] })).toEqual({
      language: 'es',
      formatLocale: 'es',
    });
  });

  it('is the browser language when nothing is saved', async () => {
    expect(await startLanguage({ browser: ['fr-FR', 'es-MX'] })).toEqual({
      language: 'es',
      formatLocale: 'es',
    });
  });

  it('is the single browser language when navigator.languages is not defined', async () => {
    expect(await startLanguage({ browser: null, single: 'es-MX' })).toEqual({
      language: 'es',
      formatLocale: 'es',
    });
  });

  it('is VITE_DEFAULT_LOCALE when neither is bundled', async () => {
    expect(await startLanguage({ saved: 'de', browser: ['fr-FR'] })).toEqual({
      language: env.VITE_DEFAULT_LOCALE,
      formatLocale: env.VITE_DEFAULT_LOCALE,
    });
  });

  it('starts the formatters in the starting language, whatever VITE_DEFAULT_LOCALE is', async () => {
    const other = env.VITE_DEFAULT_LOCALE === 'es' ? 'en' : 'es';

    expect((await startLanguage({ saved: other, browser: ['fr-FR'] })).formatLocale).toBe(other);
  });

  it.each([123, { v: 'es' }, ['es']])(
    'ignores a saved value that is not a string (%j)',
    async (saved) => {
      expect((await startLanguage({ saved, browser: ['en-US'] })).language).toBe('en');
    },
  );
});
