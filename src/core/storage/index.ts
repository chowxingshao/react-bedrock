import { env } from '@/config/env';

import { toStoragePrefix } from './prefix';
import type { StorageKey } from './storage-keys';
import { createTypedStorage } from './typed-storage';

export { cookies, type CookieOptions } from './cookies';
export { toStoragePrefix } from './prefix';
export { STORAGE_KEYS, type StorageKey } from './storage-keys';
export {
  createTypedStorage,
  type StorageGetOptions,
  type StorageSetOptions,
  type TypedStorage,
} from './typed-storage';
export { createZustandStorage } from './zustand-storage';

/** Namespace for every key this app writes, derived from VITE_APP_NAME. */
export const storagePrefix = toStoragePrefix(env.VITE_APP_NAME);

export const localStore = createTypedStorage<StorageKey>(() => window.localStorage, storagePrefix);
export const sessionStore = createTypedStorage<StorageKey>(
  () => window.sessionStorage,
  storagePrefix,
);
