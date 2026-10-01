import { afterEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/config/env';
import { localStore, STORAGE_KEYS } from '@/core/storage';

/**
 * Loads a fresh copy of the i18n module, as a page load does, and returns the language it starts
 * in. This lives in its own file because i18next is an external singleton: every fresh copy
 * re-initialises the instance the other i18n tests share.
 */
async function startLanguage({ saved, browser }: { saved?: unknown; browser: string[] }) {
  if (saved !== undefined) localStore.set(STORAGE_KEYS.locale, saved);
  vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(browser);
  vi.resetModules();
  return (await import('./i18n')).i18n.language;
}

describe('the language the app starts in', () => {
  afterEach(() => {
    // The fresh copies sync <html>; put it back for the next test.
    document.documentElement.lang = 'en';
  });

  it('is the saved choice, ahead of the browser language', async () => {
    expect(await startLanguage({ saved: 'es', browser: ['en-US'] })).toBe('es');
  });

  it('is the browser language when nothing is saved', async () => {
    expect(await startLanguage({ browser: ['fr-FR', 'es-MX'] })).toBe('es');
  });

  it('is VITE_DEFAULT_LOCALE when neither is bundled', async () => {
    expect(await startLanguage({ saved: 'de', browser: ['fr-FR'] })).toBe(env.VITE_DEFAULT_LOCALE);
  });

  it.each([123, { v: 'es' }, ['es']])(
    'ignores a saved value that is not a string (%j)',
    async (saved) => {
      expect(await startLanguage({ saved, browser: ['en-US'] })).toBe('en');
    },
  );
});
