import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { z } from 'zod';

import { type Locale, SUPPORTED_LOCALES } from '@/config/constants';
import { env } from '@/config/env';
import { logger } from '@/core/logger';
import { localStore, STORAGE_KEYS } from '@/core/storage';
import { setFormatLocale } from '@/lib/format';

import { detectLocale } from './detect';
import { defaultNS, namespaces, resources } from './resources';
import { zodErrorMap } from './zod-error-map';

/** Keys already reported: i18next asks for a missing key on every render; one warning is enough. */
const reportedMissing = new Set<string>();

// The DOM typings say `languages` is always there; an old or embedded browser may not define it, and
// a throw here is a blank page before any error handler exists.
const browserLanguages = navigator.languages as readonly string[] | undefined;

const initialLocale = detectLocale({
  saved: localStore.get<unknown>(STORAGE_KEYS.locale),
  browser: browserLanguages ?? [navigator.language],
  fallback: env.VITE_DEFAULT_LOCALE,
});

// Resources are bundled, so init completes synchronously (initAsync: false makes that explicit).
void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LOCALES],
  nonExplicitSupportedLngs: true,
  ns: namespaces,
  defaultNS,
  initAsync: false,
  interpolation: { escapeValue: false }, // React already escapes output
  // Fail loudly in development (spec §7.6): report keys that have no translation.
  saveMissing: env.isDev,
  missingKeyHandler: (_languages, namespace, key) => {
    const id = `${namespace}:${key}`;
    if (reportedMissing.has(id)) return;
    reportedMissing.add(id);
    logger.warn(`Missing translation: ${id}`);
  },
});

/** Keeps <html lang/dir> and the formatters in step with the UI language. */
function syncLocale(locale: string): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = i18n.dir(locale);
  setFormatLocale(locale);
}

syncLocale(i18n.language);
i18n.on('languageChanged', syncLocale);

// Every Zod schema in the app gets translated messages (schema-level messages still win).
z.config({ customError: zodErrorMap });

/** Switches the UI language and remembers the choice (spec §7.6). */
export async function changeLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  localStore.set(STORAGE_KEYS.locale, locale);
}

export { i18n };
