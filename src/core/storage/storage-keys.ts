/**
 * Every browser-storage key the app uses (spec §6.5). Use these constants, never string literals.
 * Keys are namespaced with the app prefix automatically.
 * Never add auth tokens or personal data here: see docs/security.md.
 */
export const STORAGE_KEYS = {
  /** Theme preference (light / dark / system). Also read before first paint by index.html. */
  theme: 'theme',
  /** Preferred UI language. */
  locale: 'locale',
  /** Persisted UI layout preferences (sidebar collapsed, …). */
  ui: 'ui',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
