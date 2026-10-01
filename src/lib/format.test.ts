import { afterEach, describe, expect, it } from 'vitest';

import { env } from '@/config/env';

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelative,
  getDateFnsLocale,
  getFormatLocale,
  setFormatLocale,
} from './format';

const ISO = '2026-01-05T10:00:00Z';

describe('format helpers', () => {
  afterEach(() => {
    setFormatLocale('en');
  });

  it('formats dates and date-times for the requested locale', () => {
    expect(formatDate(ISO, { locale: 'en' })).toBe('Jan 5, 2026');
    expect(formatDate(ISO, { locale: 'es' })).toBe('5 ene 2026');
    expect(formatDateTime(ISO, { locale: 'en' })).toBe('Jan 5, 2026, 10:00 AM');
  });

  it('formats relative time', () => {
    const base = new Date('2026-01-08T10:00:00Z');
    expect(formatRelative(ISO, { base, locale: 'en' })).toBe('3 days ago');
    expect(formatRelative(ISO, { base, locale: 'es' })).toBe('hace 3 días');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatDate('not a date')).toBe('');
    expect(formatRelative(Number.NaN)).toBe('');
  });

  it('formats currency with the configured default currency', () => {
    expect(formatCurrency(1234.5, { locale: 'en', currency: 'USD' })).toBe('$1,234.50');
    expect(formatCurrency(1234.5, { locale: 'es', currency: 'USD' })).toMatch(/1234,50/);
    // No currency given: VITE_DEFAULT_CURRENCY, whatever a developer's .env.local sets.
    expect(formatCurrency(1234.5, { locale: 'en' })).toBe(
      formatCurrency(1234.5, { locale: 'en', currency: env.VITE_DEFAULT_CURRENCY }),
    );
    expect(formatCurrency(10, { locale: 'en', currency: 'EUR' })).toBe('€10.00');
  });

  it('formats numbers and percentages', () => {
    expect(formatNumber(1234567.891, { locale: 'en', maximumFractionDigits: 1 })).toBe(
      '1,234,567.9',
    );
    expect(formatPercent(0.256, { locale: 'en' })).toBe('25.6%');
  });

  it('follows the current UI locale when none is given', () => {
    setFormatLocale('es');
    expect(getFormatLocale()).toBe('es');
    expect(formatDate(ISO)).toBe('5 ene 2026');
    expect(getDateFnsLocale().code).toBe('es');

    setFormatLocale('xx-unsupported');
    expect(getFormatLocale()).toBe(env.VITE_DEFAULT_LOCALE);
  });
});
