import { describe, expect, it } from 'vitest';

import { createTypedStorage } from './typed-storage';
import { createZustandStorage } from './zustand-storage';

describe('createZustandStorage', () => {
  it('persists zustand state through the typed storage without double encoding', () => {
    const store = createTypedStorage<'demo'>(() => window.localStorage, 'test:');
    const persistStorage = createZustandStorage<{ count: number }>(store);

    void persistStorage.setItem('demo', { state: { count: 3 }, version: 0 });

    expect(window.localStorage.getItem('test:demo')).toBe(
      '{"v":{"state":{"count":3},"version":0}}',
    );
    expect(persistStorage.getItem('demo')).toEqual({ state: { count: 3 }, version: 0 });

    void persistStorage.removeItem('demo');
    expect(window.localStorage.getItem('test:demo')).toBeNull();
  });
});
