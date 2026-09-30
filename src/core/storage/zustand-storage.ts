import type { PersistStorage, StorageValue } from 'zustand/middleware';

import type { TypedStorage } from './typed-storage';

/** Adapts a TypedStorage for Zustand's `persist` middleware (values are stored once, not double-encoded). */
export function createZustandStorage<S, K extends string = string>(
  store: TypedStorage<K>,
): PersistStorage<S> {
  return {
    getItem: (name) => store.get<StorageValue<S>>(name as K),
    setItem: (name, value) => {
      store.set(name as K, value);
    },
    removeItem: (name) => {
      store.remove(name as K);
    },
  };
}
