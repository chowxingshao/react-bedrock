import { describe, expect, it, onTestFinished } from 'vitest';

import { type LogEntry, logger } from '@/core/logger';
import { localStore, STORAGE_KEYS } from '@/core/storage';
import { getFormatLocale } from '@/lib/format';

import { changeLocale, i18n } from './i18n';
import { translateKey } from './translate-key';

describe('i18n', () => {
  it('is initialised synchronously', () => {
    expect(i18n.isInitialized).toBe(true);
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

describe('language variants', () => {
  it('resolves a regional language to the bundled one', async () => {
    await i18n.changeLanguage('es-MX');
    expect(i18n.t('actions.close')).toBe('Cerrar');
  });
});

describe('changeLocale', () => {
  it('switches language, persists the choice and syncs the document and formatters', async () => {
    await changeLocale('es');

    expect(i18n.language).toBe('es');
    expect(localStore.get(STORAGE_KEYS.locale)).toBe('es');
    expect(document.documentElement.lang).toBe('es');
    expect(document.documentElement.dir).toBe('ltr');
    expect(getFormatLocale()).toBe('es');
  });
});

describe('missing translations', () => {
  // Keys built at runtime cannot be typed, so these tests look them up through an untyped `t`.
  const t = i18n.t.bind(i18n) as unknown as (key: string) => string;

  function captureLogs() {
    const entries: LogEntry[] = [];
    onTestFinished(logger.addTransport({ name: 'memory', log: (entry) => entries.push(entry) }));
    return entries;
  }

  it('warns once per missing key, however often it is rendered', () => {
    const logs = captureLogs();

    t('common:no.such.key');
    t('common:no.such.key');
    t('common:another.missing.key');

    expect(logs.map((entry) => [entry.level, entry.message])).toEqual([
      ['warn', 'Missing translation: common:no.such.key'],
      ['warn', 'Missing translation: common:another.missing.key'],
    ]);
  });

  it('does not warn when a key exists in another language only (the fallback answers)', async () => {
    i18n.addResourceBundle('en', 'extra', { onlyEnglish: 'Only in English' });
    onTestFinished(() => {
      i18n.removeResourceBundle('en', 'extra');
    });
    await i18n.changeLanguage('es');
    const logs = captureLogs();

    expect(t('extra:onlyEnglish')).toBe('Only in English');
    expect(logs).toEqual([]);
  });

  it('does not warn when a runtime key is probed with translateKey', () => {
    const logs = captureLogs();

    expect(translateKey('errors:codes.NOT_A_CODE')).toBeUndefined();
    expect(logs).toEqual([]);
  });
});
