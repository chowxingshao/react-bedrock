import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';

import { i18n } from './i18n';

describe('i18n', () => {
  it('is initialised synchronously, starting from the configured default locale', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.options.lng).toBe(env.VITE_DEFAULT_LOCALE);
  });

  it('translates into English, the language every test starts in', () => {
    expect(i18n.t('actions.close')).toBe('Close');
  });

  it('translates into Spanish', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('actions.close')).toBe('Cerrar');
  });

  it('accepts namespace-prefixed keys', () => {
    expect(i18n.t('common:theme.dark')).toBe('Dark');
  });

  it('rejects unknown keys at compile time', () => {
    // @ts-expect-error -- 'actions.doesNotExist' is not a key in en/common.json (typed keys, spec §7.6)
    expect(i18n.t('actions.doesNotExist')).toBe('actions.doesNotExist');
  });
});
