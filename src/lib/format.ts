import type { Locale as DateFnsLocale } from 'date-fns';
import { format as formatPattern } from 'date-fns/format';
import { formatDistance } from 'date-fns/formatDistance';
import { isValid } from 'date-fns/isValid';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { parseISO } from 'date-fns/parseISO';

import type { Locale } from '@/config/constants';
import { env } from '@/config/env';

import { getFormatLocale } from './format-locale';

export { getFormatLocale, setFormatLocale } from './format-locale';

/** One entry per bundled locale. Add the matching date-fns locale when you add a language. */
const DATE_FNS_LOCALES = { en: enUS, es } satisfies Record<Locale, DateFnsLocale>;

/** The date-fns locale for the current UI language (e.g. for the Calendar component). */
export function getDateFnsLocale(locale: Locale = getFormatLocale()): DateFnsLocale {
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
  { locale = getFormatLocale() }: FormatOptions = {},
): string {
  const date = toDate(value);
  return isValid(date) ? formatPattern(date, 'PP', { locale: DATE_FNS_LOCALES[locale] }) : '';
}

/** Localised date and time: "Jan 5, 2026, 10:00 AM". Returns '' for invalid input. */
export function formatDateTime(
  value: DateInput,
  { locale = getFormatLocale() }: FormatOptions = {},
): string {
  const date = toDate(value);
  return isValid(date) ? formatPattern(date, 'PPp', { locale: DATE_FNS_LOCALES[locale] }) : '';
}

/**
 * The calendar day as "2026-01-05" (yyyy-MM-dd), read from the local date parts and the same in
 * every UI language. Use it to send a date-only value, such as a DatePicker's, to an API:
 * `toISOString()` of a local-midnight Date gives the previous day east of UTC.
 * Returns '' for invalid input.
 */
export function formatISODate(value: DateInput): string {
  const date = toDate(value);
  return isValid(date) ? formatPattern(date, 'yyyy-MM-dd') : '';
}

/** "3 days ago" / "in 2 hours", relative to `base` (default: now). Returns '' for invalid input. */
export function formatRelative(
  value: DateInput,
  { locale = getFormatLocale(), base = new Date() }: FormatOptions & { base?: Date } = {},
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
    locale = getFormatLocale(),
    currency = env.VITE_DEFAULT_CURRENCY,
  }: FormatOptions & { currency?: string } = {},
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

/** Locale-aware number formatting; accepts any Intl.NumberFormat option. */
export function formatNumber(
  value: number,
  { locale = getFormatLocale(), ...options }: FormatOptions & Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/** A ratio as a percentage: 0.256 → "25.6%". */
export function formatPercent(
  ratio: number,
  {
    locale = getFormatLocale(),
    maximumFractionDigits = 1,
  }: FormatOptions & { maximumFractionDigits?: number } = {},
): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits }).format(ratio);
}
