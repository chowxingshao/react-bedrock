import {
  type Locale as DateFnsLocale,
  format as formatPattern,
  formatDistance,
  isValid,
  parseISO,
} from 'date-fns';
import { enUS, es } from 'date-fns/locale';

import { isLocale, type Locale } from '@/config/constants';
import { env } from '@/config/env';

/** One entry per bundled locale. Add the matching date-fns locale when you add a language. */
const DATE_FNS_LOCALES = { en: enUS, es } satisfies Record<Locale, DateFnsLocale>;

let currentLocale: Locale = env.VITE_DEFAULT_LOCALE;

/** Called by core/i18n whenever the UI language changes. */
export function setFormatLocale(locale: string): void {
  const base = locale.toLowerCase().split('-')[0] ?? '';
  currentLocale = isLocale(base) ? base : env.VITE_DEFAULT_LOCALE;
}

export function getFormatLocale(): Locale {
  return currentLocale;
}

/** The date-fns locale for the current UI language (e.g. for the Calendar component). */
export function getDateFnsLocale(locale: Locale = currentLocale): DateFnsLocale {
  return DATE_FNS_LOCALES[locale];
}

/** A Date, a timestamp in ms, or an ISO-8601 string (the usual API format). */
export type DateInput = Date | number | string;

export interface FormatOptions {
  locale?: Locale;
}

const toDate = (value: DateInput): Date =>
  typeof value === 'string' ? parseISO(value) : new Date(value);

/** Localised medium date: "Jan 5, 2026" / "5 ene 2026". Returns '' for invalid input. */
export function formatDate(
  value: DateInput,
  { locale = currentLocale }: FormatOptions = {},
): string {
  const date = toDate(value);
  return isValid(date) ? formatPattern(date, 'PP', { locale: DATE_FNS_LOCALES[locale] }) : '';
}

/** Localised date and time: "Jan 5, 2026, 10:00 AM". Returns '' for invalid input. */
export function formatDateTime(
  value: DateInput,
  { locale = currentLocale }: FormatOptions = {},
): string {
  const date = toDate(value);
  return isValid(date) ? formatPattern(date, 'PPp', { locale: DATE_FNS_LOCALES[locale] }) : '';
}

/** "3 days ago" / "in 2 hours", relative to `base` (default: now). Returns '' for invalid input. */
export function formatRelative(
  value: DateInput,
  { locale = currentLocale, base = new Date() }: FormatOptions & { base?: Date } = {},
): string {
  const date = toDate(value);
  return isValid(date)
    ? formatDistance(date, base, { addSuffix: true, locale: DATE_FNS_LOCALES[locale] })
    : '';
}

/** "$1,234.50" in the UI locale; the currency defaults to VITE_DEFAULT_CURRENCY. */
export function formatCurrency(
  amount: number,
  {
    locale = currentLocale,
    currency = env.VITE_DEFAULT_CURRENCY,
  }: FormatOptions & { currency?: string } = {},
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

/** Locale-aware number formatting; accepts any Intl.NumberFormat option. */
export function formatNumber(
  value: number,
  { locale = currentLocale, ...options }: FormatOptions & Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/** A ratio as a percentage: 0.256 → "25.6%". */
export function formatPercent(
  ratio: number,
  {
    locale = currentLocale,
    maximumFractionDigits = 1,
  }: FormatOptions & { maximumFractionDigits?: number } = {},
): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits }).format(ratio);
}
