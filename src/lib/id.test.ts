import { describe, expect, it } from 'vitest';

import { createRequestId } from './id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('createRequestId', () => {
  it('creates unique RFC 4122 v4 ids', () => {
    const id = createRequestId();
    expect(id).toMatch(UUID_V4);
    expect(createRequestId()).not.toBe(id);
  });

  it('falls back to getRandomValues where randomUUID is unavailable (plain http)', () => {
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
    try {
      expect(createRequestId()).toMatch(UUID_V4);
    } finally {
      Reflect.deleteProperty(crypto, 'randomUUID');
    }
  });
});
