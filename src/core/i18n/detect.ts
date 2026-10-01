import { isLocale, type Locale } from '@/config/constants';

/**
 * Maps a BCP 47 language tag ('es-MX') to a bundled locale ('es'), or undefined. The tag is not
 * trusted to be a string: the saved choice comes from storage, which anything can write to.
 */
export function matchLocale(tag: unknown): Locale | undefined {
  if (typeof tag !== 'string') return undefined;
  const base = tag.toLowerCase().split('-')[0];
  return isLocale(base) ? base : undefined;
}

export interface DetectLocaleInput {
  /** The user's saved choice (from storage). Not trusted to be a string. */
  saved: unknown;
  /** `navigator.languages`. */
  browser: readonly string[];
  /** `env.VITE_DEFAULT_LOCALE`. */
  fallback: Locale;
}

/** Detection order (spec §7.6): saved preference → browser languages → VITE_DEFAULT_LOCALE. */
export function detectLocale({ saved, browser, fallback }: DetectLocaleInput): Locale {
  return matchLocale(saved) ?? browser.map(matchLocale).find(Boolean) ?? fallback;
}
