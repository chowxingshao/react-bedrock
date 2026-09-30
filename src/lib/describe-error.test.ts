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
