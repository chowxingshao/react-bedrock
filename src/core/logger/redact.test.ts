import { describe, expect, it } from 'vitest';

import { HOSTILE_CAUSES, throwingGetterCause } from '@/test/hostile-values';

import { createRedactor } from './redact';

describe('createRedactor', () => {
  const redact = createRedactor();

  it('redacts sensitive keys at any depth, case- and separator-insensitively', () => {
    expect(
      redact({
        user: { id: 'u1', password: 'hunter2' },
        headers: { Authorization: 'Bearer x', 'x-api-key': 'k', 'Set-Cookie': 'a=b' },
        accessToken: 't',
        items: [{ secret: 's', name: 'ok' }],
      }),
    ).toEqual({
      user: { id: 'u1', password: '[REDACTED]' },
      headers: {
        Authorization: '[REDACTED]',
        'x-api-key': '[REDACTED]',
        'Set-Cookie': '[REDACTED]',
      },
      accessToken: '[REDACTED]',
      items: [{ secret: '[REDACTED]', name: 'ok' }],
    });
  });

  it('serialises errors and dates, and survives circular references', () => {
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;

    const result = redact({ error: new Error('Boom'), at: new Date(0), circular }) as Record<
      string,
      Record<string, unknown>
    >;

    expect(result.error).toMatchObject({ name: 'Error', message: 'Boom' });
    expect(result.at).toBe('1970-01-01T00:00:00.000Z');
    expect(result.circular).toEqual({ name: 'loop', self: '[Circular]' });
  });

  it('accepts a custom key list', () => {
    expect(createRedactor(['ssn'])({ ssn: '1', password: 'kept' })).toEqual({
      ssn: '[REDACTED]',
      password: 'kept',
    });
  });

  it('keeps only the name, message, code and status of an error cause', () => {
    const cause = Object.assign(new Error('Request failed with status code 401'), {
      name: 'AxiosError',
      code: 'ERR_BAD_REQUEST',
      status: 401,
      config: {
        url: '/auth/login?token=abc',
        data: '{"email":"a@b.c","password":"hunter2"}',
        headers: { Authorization: 'Bearer t', Accept: 'json' },
      },
      response: { data: { user: 'a@b.c' } },
    });

    const result = redact({ error: new Error('Wrapped', { cause }) }) as {
      error: { cause: unknown };
    };

    expect(result.error.cause).toEqual({
      name: 'AxiosError',
      message: 'Request failed with status code 401',
      code: 'ERR_BAD_REQUEST',
      status: 401,
    });
    for (const secret of ['hunter2', 'Bearer', 'token=abc', 'a@b.c']) {
      expect(JSON.stringify(result)).not.toContain(secret);
    }
  });

  it('summarises a cause that is an own enumerable property, and keeps a non-object cause', () => {
    const cause = Object.assign(new Error('Request failed'), {
      config: { data: '{"password":"hunter2"}' },
    });

    const result = redact({
      error: Object.assign(new Error('Wrapped'), { cause }),
      other: new Error('Also wrapped', { cause: 'socket closed' }),
    }) as { error: { cause: unknown }; other: { cause: unknown } };

    expect(result.error.cause).toEqual({ name: 'Error', message: 'Request failed' });
    expect(JSON.stringify(result)).not.toContain('hunter2');
    expect(result.other.cause).toBe('socket closed');
  });
});

describe('createRedactor with a hostile cause', () => {
  const redact = createRedactor();

  it.each(HOSTILE_CAUSES)('does not throw when the cause is %s', (_name, make) => {
    const wrapped = redact({ error: new Error('Wrapped', { cause: make() }) }) as {
      error: { message: string; cause: unknown };
    };
    const assigned = redact({ error: Object.assign(new Error('Wrapped'), { cause: make() }) }) as {
      error: { message: string; cause: unknown };
    };

    expect(wrapped.error).toMatchObject({
      message: 'Wrapped',
      cause: expect.any(Object) as unknown,
    });
    expect(assigned.error).toMatchObject({
      message: 'Wrapped',
      cause: expect.any(Object) as unknown,
    });
  });

  it('keeps the fields of a cause that can be read when another one throws', () => {
    const result = redact({ error: new Error('Wrapped', { cause: throwingGetterCause() }) }) as {
      error: { cause: unknown };
    };

    expect(result.error.cause).toEqual({ name: 'FlakyError' });
  });
});
