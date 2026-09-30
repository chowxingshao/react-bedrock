import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createTypedStorage } from './typed-storage';

type Key = 'a' | 'b';

describe('createTypedStorage', () => {
  let now = 1_000;
  const store = createTypedStorage<Key>(
    () => window.localStorage,
    'test:',
    () => now,
  );

  beforeEach(() => {
    now = 1_000;
  });

  it('round-trips JSON values under the prefix', () => {
    expect(store.set('a', { count: 1 })).toBe(true);
    expect(window.localStorage.getItem('test:a')).toBe('{"v":{"count":1}}');
    expect(store.get('a')).toEqual({ count: 1 });
  });

  it('returns null for missing keys and malformed JSON', () => {
    expect(store.get('a')).toBeNull();
    window.localStorage.setItem('test:a', '{not json');
    expect(store.get('a')).toBeNull();
  });

  it('validates the stored shape when a schema is given', () => {
    const schema = z.object({ count: z.number() });
    store.set('a', { count: 'one' });
    store.set('b', { count: 2 });

    expect(store.get('a', { schema })).toBeNull();
    expect(store.get('b', { schema })).toEqual({ count: 2 });
  });

  it('expires values after their TTL and removes them', () => {
    store.set('a', 'soon gone', { ttlMs: 500 });
    now = 1_499;
    expect(store.get('a')).toBe('soon gone');
    now = 1_500;
    expect(store.get('a')).toBeNull();
    expect(window.localStorage.getItem('test:a')).toBeNull();
  });

  it('clears only its own prefixed keys', () => {
    store.set('a', 1);
    window.localStorage.setItem('other-app:a', 'keep');

    store.clear();

    expect(store.get('a')).toBeNull();
    expect(window.localStorage.getItem('other-app:a')).toBe('keep');
  });

  it('degrades gracefully when storage is unavailable', () => {
    const blocked = createTypedStorage<Key>(() => {
      throw new DOMException('Storage disabled', 'SecurityError');
    }, 'test:');

    expect(blocked.set('a', 1)).toBe(false);
    expect(blocked.get('a')).toBeNull();
    expect(() => {
      blocked.remove('a');
      blocked.clear();
    }).not.toThrow();
  });

  it('returns false when the quota is exceeded', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(store.set('a', 'x')).toBe(false);
  });
});
