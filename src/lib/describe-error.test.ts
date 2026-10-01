import { describe, expect, it } from 'vitest';

import { HOSTILE_CAUSES, HOSTILE_VALUES, throwingGetterCause } from '@/test/hostile-values';

import { describeError } from './describe-error';

describe('describeError', () => {
  it('includes the message, stack and extra properties of errors', () => {
    const error = Object.assign(new Error('Boom'), { code: 'E_BOOM', status: 500 });
    const text = describeError(error);

    expect(text).toContain('Boom');
    expect(text).toContain('"code": "E_BOOM"');
    expect(text).toContain('"status": 500');
  });

  it('keeps the message when the stack has frame lines only (Firefox, Safari)', () => {
    const frames = '    at render (app.tsx:1:1)\n    at commit (app.tsx:2:2)';
    const error = new TypeError('Boom');
    error.stack = frames;

    expect(describeError(error)).toBe(`TypeError: Boom\n${frames}`);
  });

  it('does not repeat the message when the stack already includes it', () => {
    const stack = 'Error: Boom\n    at render (app.tsx:1:1)';
    const error = new Error('Boom');
    error.stack = stack;

    expect(describeError(error)).toBe(stack);
  });

  it('describes strings, objects and unserialisable values', () => {
    expect(describeError('plain text')).toBe('plain text');
    expect(describeError({ reason: 'x' })).toContain('"reason": "x"');

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(describeError(circular)).toBe('[object Object]');
  });
});

describe('describeError causes', () => {
  it('names the cause with its code and status, and nothing else', () => {
    const cause = Object.assign(new Error('Request failed with status code 401'), {
      name: 'AxiosError',
      code: 'ERR_BAD_REQUEST',
      status: 401,
      config: {
        url: '/auth/login?token=abc',
        data: '{"email":"a@b.c","password":"hunter2"}',
        headers: { Authorization: 'Bearer t' },
      },
    });

    const text = describeError(new Error('Wrapped', { cause }));

    expect(text).toContain(
      'Caused by: AxiosError: Request failed with status code 401 (code ERR_BAD_REQUEST, status 401)',
    );
    for (const secret of ['hunter2', 'Bearer', 'token=abc', 'a@b.c']) {
      expect(text).not.toContain(secret);
    }
  });

  it('summarises a cause that is an own enumerable property too', () => {
    const cause = Object.assign(new Error('Request failed'), {
      config: { data: '{"password":"hunter2"}' },
    });

    const text = describeError(Object.assign(new Error('Wrapped'), { cause }));

    expect(text).toContain('Caused by: Error: Request failed');
    expect(text).not.toContain('hunter2');
  });

  it('describes a non-error cause', () => {
    expect(describeError(new Error('Wrapped', { cause: 'socket closed' }))).toContain(
      'Caused by: socket closed',
    );
  });
});

describe('describeError with hostile values', () => {
  it.each(HOSTILE_VALUES)('does not throw for %s', (_name, make) => {
    expect(typeof describeError(make())).toBe('string');
  });

  it.each(HOSTILE_CAUSES)('still describes an error whose cause is %s', (_name, make) => {
    const text = describeError(new Error('Wrapped', { cause: make() }));

    expect(text).toContain('Wrapped');
    expect(text).toContain('Caused by:');
  });

  it('keeps what a cause with a throwing getter can tell', () => {
    expect(describeError(new Error('Wrapped', { cause: throwingGetterCause() }))).toContain(
      'Caused by: FlakyError',
    );
  });
});
