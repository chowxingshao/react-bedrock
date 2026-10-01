import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { type Locale, SUPPORTED_LOCALES } from '@/config/constants';
import { env } from '@/config/env';
import { logger } from '@/core/logger';
import { localStore, STORAGE_KEYS } from '@/core/storage';
import { setFormatLocale } from '@/lib/format';

import { detectLocale } from './detect';
import { defaultNS, namespaces, resources } from './resources';

/** Keys already reported: i18next asks for a missing key on every render; one warning is enough. */
const reportedMissing = new Set<string>();

const initialLocale = detectLocale({
  saved: localStore.get<unknown>(STORAGE_KEYS.locale),
  browser: navigator.languages,
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

/** Switches the UI language and remembers the choice (spec §7.6). */
export async function changeLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  localStore.set(STORAGE_KEYS.locale, locale);
}

export { i18n };
