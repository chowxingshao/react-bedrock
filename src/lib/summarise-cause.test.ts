import { describe, expect, it } from 'vitest';

import { HOSTILE_CAUSES, throwingGetterCause } from '@/test/hostile-values';

import { summariseCause } from './summarise-cause';

describe('summariseCause', () => {
  it('keeps the name, message, code and status, and nothing else', () => {
    const cause = Object.assign(new Error('Request failed with status code 401'), {
      name: 'AxiosError',
      code: 'ERR_BAD_REQUEST',
      status: 401,
      config: { url: '/x?token=abc', data: '{"password":"hunter2"}' },
    });

    expect(summariseCause(cause)).toEqual({
      name: 'AxiosError',
      message: 'Request failed with status code 401',
      code: 'ERR_BAD_REQUEST',
      status: 401,
    });
  });

  it('keeps only strings and numbers', () => {
    expect(
      summariseCause({ name: 'E', message: { secret: 1 }, code: ['x'], status: true }),
    ).toEqual({ name: 'E' });
  });

  it('gives an empty summary for an object that has none of the fields', () => {
    expect(summariseCause({ config: { data: 'x' } })).toEqual({});
  });

  it.each(HOSTILE_CAUSES)('never throws: %s', (_name, make) => {
    expect(typeof summariseCause(make())).toBe('object');
  });

  it('keeps the fields that can be read when another one throws', () => {
    expect(summariseCause(throwingGetterCause())).toEqual({ name: 'FlakyError' });
  });
});
