import { describe, expect, it } from 'vitest';

import { i18n } from './i18n';

describe('i18n', () => {
  it('is initialised synchronously in the default locale', () => {
    expect(i18n.isInitialized).toBe(true);
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
