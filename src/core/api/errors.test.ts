import { AxiosError, AxiosHeaders, CanceledError, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';

import { i18n } from '@/core/i18n';
import { createRedactor } from '@/core/logger';
import { describeError } from '@/lib/describe-error';
import { HOSTILE_CAUSES, HOSTILE_VALUES } from '@/test/hostile-values';

import { AppError, getErrorMessage, getFieldErrors, isAppError, toAppError } from './errors';

const config = (): InternalAxiosRequestConfig => ({
  headers: new AxiosHeaders({ 'X-Request-Id': 'req-1' }),
});

function responseError(status: number, data: unknown) {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config(), undefined, {
    status,
    statusText: '',
    data,
    headers: {},
    config: config(),
  });
}

describe('toAppError', () => {
  it('keeps AppErrors as they are', () => {
    const error = new AppError({ code: 'X', message: 'x', status: 400 });
    expect(toAppError(error)).toBe(error);
  });

  it('reads the backend error body', () => {
    const error = toAppError(
      responseError(422, {
        code: 'VALIDATION_ERROR',
        message: 'Check the form',
        details: { fields: { name: 'Taken' } },
      }),
    );
    expect(error).toMatchObject({
      name: 'AppError',
      code: 'VALIDATION_ERROR',
      status: 422,
      userMessage: 'Check the form',
      details: { fields: { name: 'Taken' } },
      requestId: 'req-1',
    });
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [400, 'VALIDATION_ERROR'],
    [429, 'RATE_LIMITED'],
    [503, 'SERVER_ERROR'],
    [418, 'UNKNOWN'],
  ])('derives a code from status %i when the body has none', (status, code) => {
    expect(toAppError(responseError(status, 'Oops')).code).toBe(code);
  });

  it('recognises network errors, timeouts and cancellation', () => {
    expect(toAppError(new AxiosError('Network Error', 'ERR_NETWORK', config())).code).toBe(
      'NETWORK_ERROR',
    );
    expect(toAppError(new AxiosError('timeout', 'ETIMEDOUT', config())).code).toBe('TIMEOUT');
    expect(toAppError(new CanceledError()).code).toBe('CANCELLED');
  });

  it('wraps anything else as UNKNOWN', () => {
    expect(toAppError(new Error('Parse failed'))).toMatchObject({ code: 'UNKNOWN', status: 0 });
    expect(isAppError(toAppError('weird'))).toBe(true);
  });

  it('keeps the request (body, query token, credentials) out of logs and technical details', () => {
    const secrets = ['hunter2', 'Bearer', 'token=abc', 'a@b.c'];
    const requestConfig: InternalAxiosRequestConfig = {
      url: '/x?token=abc',
      data: '{"email":"a@b.c","password":"hunter2"}',
      headers: new AxiosHeaders({ Authorization: 'Bearer secret-jwt' }),
    };
    const error = toAppError(
      new AxiosError(
        'Request failed with status code 401',
        'ERR_BAD_REQUEST',
        requestConfig,
        undefined,
        {
          status: 401,
          statusText: '',
          data: {},
          headers: {},
          config: requestConfig,
        },
      ),
    );

    const logged = JSON.stringify(createRedactor()({ error }));
    const shown = describeError(error);

    for (const secret of secrets) {
      expect(logged).not.toContain(secret);
      expect(shown).not.toContain(secret);
    }
    expect(logged).toContain('ERR_BAD_REQUEST');
    expect(shown).toContain('Caused by: AxiosError: Request failed with status code 401');
  });
});

describe('getErrorMessage', () => {
  it('translates known codes', async () => {
    expect(getErrorMessage(responseError(403, {}))).toBe("You don't have permission to do that.");
    await i18n.changeLanguage('es');
    expect(getErrorMessage(responseError(403, {}))).toBe('No tienes permiso para hacer eso.');
  });

  it('prefers a translation for backend-specific codes, then the server message for 4xx', () => {
    expect(
      getErrorMessage(responseError(409, { code: 'ITEM_LOCKED', message: 'Item is locked' })),
    ).toBe('Item is locked');
  });

  it('never shows raw server messages for 5xx', () => {
    expect(
      getErrorMessage(responseError(500, { code: 'DB_DOWN', message: 'pg: connection refused' })),
    ).toBe('The server ran into a problem. Please try again later.');
  });

  it.each(['constructor', 'toString', '__proto__'])(
    'does not treat the server code %s as a translation key',
    (code) => {
      expect(getErrorMessage(responseError(400, { code, message: 'Bad input' }))).toBe('Bad input');
    },
  );
});

describe('getFieldErrors', () => {
  it('flattens details.fields, taking the first message of arrays', () => {
    const error = toAppError(
      responseError(422, {
        details: { fields: { name: ['Taken', 'Too short'], email: 'Invalid', age: 3 } },
      }),
    );
    expect(getFieldErrors(error)).toEqual({ name: 'Taken', email: 'Invalid' });
    expect(getFieldErrors(new Error('x'))).toEqual({});
  });
});

describe('hostile thrown values', () => {
  it.each(HOSTILE_VALUES)('toAppError does not throw for %s', (_name, make) => {
    const value = make();
    const error = toAppError(value);

    expect(isAppError(error)).toBe(true);
    expect(error).toMatchObject({ name: 'AppError', code: 'UNKNOWN', status: 0 });
    expect(typeof error.message).toBe('string');
    expect(error.cause).toBe(value);
  });

  it.each(HOSTILE_VALUES)('getErrorMessage gives the generic message for %s', (_name, make) => {
    expect(getErrorMessage(make())).toBe('Something went wrong. Please try again.');
  });

  it.each(HOSTILE_VALUES)('isAppError and getFieldErrors do not throw for %s', (_name, make) => {
    const value = make();

    expect(isAppError(value)).toBe(false);
    expect(getFieldErrors(value)).toEqual({});
  });

  it.each(HOSTILE_CAUSES)(
    'an AppError with %s is still described and redacted safely',
    (_name, make) => {
      const error = new AppError({ code: 'X', message: 'Wrapped', status: 500, cause: make() });

      expect(toAppError(error)).toBe(error);
      expect(describeError(error)).toContain('Wrapped');
      expect(() => createRedactor()({ error })).not.toThrow();
    },
  );
});
