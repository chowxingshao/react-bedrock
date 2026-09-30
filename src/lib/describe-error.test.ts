import { describe, expect, it } from 'vitest';

import { describeError } from './describe-error';

describe('describeError', () => {
  it('includes the message, stack and extra properties of errors', () => {
    const error = Object.assign(new Error('Boom'), { code: 'E_BOOM', status: 500 });
    const text = describeError(error);

    expect(text).toContain('Boom');
    expect(text).toContain('"code": "E_BOOM"');
    expect(text).toContain('"status": 500');
  });

  it('describes strings, objects and unserialisable values', () => {
    expect(describeError('plain text')).toBe('plain text');
    expect(describeError({ reason: 'x' })).toContain('"reason": "x"');

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(describeError(circular)).toBe('[object Object]');
  });
});
