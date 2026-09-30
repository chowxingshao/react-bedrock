import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it } from 'vitest';

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

  describe('with a validation:server namespace', () => {
    afterEach(() => {
      i18n.removeResourceBundle('en', 'validation');
    });

    it('translates a known UPPER_SNAKE_CASE key and shows any other message as sent', () => {
      i18n.addResourceBundle('en', 'validation', {
        server: { ALREADY_EXISTS: 'That value is already in use' },
      });
      const { result } = renderHook(() => useForm<{ name: string; email: string; nick: string }>());
      const error = new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        status: 422,
        details: { fields: { name: 'ALREADY_EXISTS', email: 'constructor', nick: 'Too short' } },
      });

      act(() => {
        applyServerErrors(result.current, error);
      });

      expect(result.current.getFieldState('name').error?.message).toBe(
        'That value is already in use',
      );
      expect(result.current.getFieldState('email').error?.message).toBe('constructor');
      expect(result.current.getFieldState('nick').error?.message).toBe('Too short');
    });
  });
});
