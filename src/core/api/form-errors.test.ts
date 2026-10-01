import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { i18n } from '@/core/i18n';

import { AppError } from './errors';
import { applyServerErrors } from './form-errors';

describe('applyServerErrors', () => {
  it('maps server field errors onto the form and reports whether any applied', () => {
    const { result } = renderHook(() => useForm<{ name: string; email: string }>());
    const error = new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Invalid',
      status: 422,
      details: { fields: { name: 'Already taken' } },
    });

    let applied = false;
    act(() => {
      applied = applyServerErrors(result.current, error);
    });

    expect(applied).toBe(true);
    expect(result.current.getFieldState('name').error).toMatchObject({
      type: 'server',
      message: 'Already taken',
    });
    expect(applyServerErrors(result.current, new Error('boom'))).toBe(false);
  });

  describe('with the validation:server namespace', () => {
    const applyFields = (fields: Record<string, string>) => {
      const { result } = renderHook(() => useForm<Record<string, string>>());
      const error = new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        status: 422,
        details: { fields },
      });
      act(() => {
        applyServerErrors(result.current, error);
      });
      return (name: string) => result.current.getFieldState(name).error?.message;
    };

    it('translates a known UPPER_SNAKE_CASE code and shows any other message as sent', () => {
      const messageOf = applyFields({
        name: 'ALREADY_EXISTS',
        email: 'constructor',
        nick: 'Too short',
        unknown: 'NOT_A_KNOWN_CODE',
      });

      expect(messageOf('name')).toBe('This value is already in use');
      expect(messageOf('email')).toBe('constructor');
      expect(messageOf('nick')).toBe('Too short');
      expect(messageOf('unknown')).toBe('NOT_A_KNOWN_CODE');
    });

    it('translates into the current language', async () => {
      await i18n.changeLanguage('es');

      expect(applyFields({ name: 'ALREADY_EXISTS' })('name')).toBe('Este valor ya está en uso');
    });
  });
});
