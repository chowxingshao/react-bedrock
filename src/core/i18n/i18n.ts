import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { SUPPORTED_LOCALES } from '@/config/constants';
import { env } from '@/config/env';

import { defaultNS, namespaces, resources } from './resources';

// Resources are bundled, so init completes synchronously (initAsync: false makes that explicit).
void i18n.use(initReactI18next).init({
  resources,
  lng: env.VITE_DEFAULT_LOCALE,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LOCALES],
  nonExplicitSupportedLngs: true,
  ns: namespaces,
  defaultNS,
  initAsync: false,
  interpolation: { escapeValue: false }, // React already escapes output
});

export { i18n };
