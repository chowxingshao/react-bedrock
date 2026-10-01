import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { i18n } from './i18n';

const schema = z.object({
  name: z.string().min(1),
  bio: z.string().min(10).max(20),
  email: z.email(),
  kind: z.enum(['a', 'b']),
  tags: z.array(z.string()).min(2),
});

const fieldErrors = (input: unknown) => {
  const result = schema.safeParse(input);
  if (result.success) throw new Error('expected validation to fail');
  return z.flattenError(result.error).fieldErrors;
};

const messageOf = (type: z.ZodType, input: unknown) =>
  type.safeParse(input).error?.issues[0]?.message;

describe('zod error map', () => {
  it('translates the common issues', () => {
    expect(fieldErrors({ name: '', bio: 'short', email: 'nope', kind: 'c', tags: [] })).toEqual({
      name: ['This field is required'],
      bio: ['Use at least 10 characters'],
      email: ['Enter a valid email address'],
      kind: ['Choose one of the available options'],
      tags: ['Select at least 2 items'],
    });
  });

  it('reports missing fields as required', () => {
    expect(fieldErrors({}).name).toEqual(['This field is required']);
  });

  it('follows the current language', async () => {
    await i18n.changeLanguage('es');
    expect(fieldErrors({}).name).toEqual(['Este campo es obligatorio']);
  });

  it('lets messages written in the schema win', () => {
    const result = z.string().min(1, { error: 'Give it a name' }).safeParse('');
    expect(result.error?.issues[0]?.message).toBe('Give it a name');
  });

  it('words exclusive bounds as greater than / less than, and shows dates formatted', async () => {
    expect(messageOf(z.number().positive(), 0)).toBe('Must be greater than 0');
    expect(messageOf(z.number().lt(5), 5)).toBe('Must be less than 5');
    expect(messageOf(z.number().min(3), 1)).toBe('Must be at least 3');
    expect(messageOf(z.number().max(3), 9)).toBe('Must be at most 3');
    expect(messageOf(z.date().min(new Date(2026, 0, 5)), new Date(2020, 0, 1))).toBe(
      'Must be at least Jan 5, 2026',
    );

    await i18n.changeLanguage('es');
    expect(messageOf(z.number().gt(5), 5)).toBe('Debe ser mayor que 5');
  });

  it('fails validation, rather than throwing, when a date bound is not a valid date', () => {
    const invalid = new Date('not a date');
    const early = new Date(2020, 0, 1);

    // Zod builds the issues lazily: the map runs when `.error` is read, not inside `safeParse`.
    const tooEarly = z.date().min(invalid).safeParse(early);
    expect(tooEarly.success).toBe(false);
    expect(tooEarly.error?.issues[0]?.message).toBe('Must be at least NaN');

    const tooLate = z.date().max(invalid).safeParse(early);
    expect(tooLate.success).toBe(false);
    expect(tooLate.error?.issues[0]?.message).toBe('Must be at most NaN');
  });
});
