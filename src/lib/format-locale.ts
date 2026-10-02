import { isLocale, type Locale } from '@/config/constants';
import { env } from '@/config/env';

/**
 * The language the formatters use. It lives apart from `format.ts` so that the start-up code (core/i18n)
 * can set it without pulling date-fns into the entry graph: only the pages that format dates load it.
 */
let currentLocale: Locale = env.VITE_DEFAULT_LOCALE;

/** Called by core/i18n whenever the UI language changes. */
export function setFormatLocale(locale: string): void {
  const base = locale.toLowerCase().split('-')[0] ?? '';
  currentLocale = isLocale(base) ? base : env.VITE_DEFAULT_LOCALE;
}

export function getFormatLocale(): Locale {
  return currentLocale;
}
