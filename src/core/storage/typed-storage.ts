import type { z } from 'zod';

export interface StorageGetOptions<T> {
  /** Validates the stored shape. A mismatch reads as `null`. */
  schema?: z.ZodType<T>;
}

export interface StorageSetOptions {
  /** Time to live in milliseconds. Once expired, the value reads as `null` and is removed. */
  ttlMs?: number;
}

export interface TypedStorage<K extends string = string> {
  get<T>(key: K, options?: StorageGetOptions<T>): T | null;
  set<T>(key: K, value: T, options?: StorageSetOptions): boolean;
  remove(key: K): void;
  /** Removes only this app's (prefixed) keys. */
  clear(): void;
}

/** What is actually written to storage: `v` = value, `e` = expiry timestamp (ms). */
interface Envelope {
  v: unknown;
  e?: number;
}

function isEnvelope(value: unknown): value is Envelope {
  return typeof value === 'object' && value !== null && 'v' in value;
}

/**
 * JSON storage with namespacing, optional TTL and optional Zod validation.
 * Never throws: an unavailable storage (private mode, disabled, quota) reads as `null` / writes return `false`.
 */
export function createTypedStorage<K extends string>(
  getBackend: () => Storage | undefined,
  prefix: string,
  now: () => number = Date.now,
): TypedStorage<K> {
  const backend = (): Storage | undefined => {
    try {
      return getBackend();
    } catch {
      return undefined;
    }
  };

  const remove = (key: K): void => {
    try {
      backend()?.removeItem(prefix + key);
    } catch {
      // Storage unavailable: nothing to remove.
    }
  };

  return {
    get<T>(key: K, options?: StorageGetOptions<T>): T | null {
      let raw: string | null;
      try {
        raw = backend()?.getItem(prefix + key) ?? null;
      } catch {
        return null;
      }
      if (raw === null) return null;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return null;
      }
      if (!isEnvelope(parsed)) return null;

      if (parsed.e !== undefined && parsed.e <= now()) {
        remove(key);
        return null;
      }
      if (options?.schema) {
        const result = options.schema.safeParse(parsed.v);
        return result.success ? result.data : null;
      }
      return parsed.v as T;
    },

    set<T>(key: K, value: T, options?: StorageSetOptions): boolean {
      const envelope: Envelope = { v: value };
      if (options?.ttlMs !== undefined) envelope.e = now() + options.ttlMs;
      try {
        const store = backend();
        if (!store) return false;
        store.setItem(prefix + key, JSON.stringify(envelope));
        return true;
      } catch {
        return false;
      }
    },

    remove,

    clear(): void {
      try {
        const store = backend();
        if (!store) return;
        const ours: string[] = [];
        for (let index = 0; index < store.length; index += 1) {
          const name = store.key(index);
          if (name?.startsWith(prefix)) ours.push(name);
        }
        for (const name of ours) store.removeItem(name);
      } catch {
        // Storage unavailable: nothing to clear.
      }
    },
  };
}
