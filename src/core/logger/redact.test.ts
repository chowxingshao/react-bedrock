import { describe, expect, it } from 'vitest';

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
});
