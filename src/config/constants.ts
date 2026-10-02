/** App-wide constants. Environment-specific values belong in `env` (./env.ts), not here. */

/** Version and git SHA of this build, injected by `define` in vite.config.ts. */
export const APP_VERSION = __APP_VERSION__;
export const GIT_SHA = __GIT_SHA__;

/** Locales with bundled translations in src/locales/<locale>/. */
export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Narrows any value to a bundled locale code. */
export const isLocale = (value: unknown): value is Locale =>
  (SUPPORTED_LOCALES as readonly unknown[]).includes(value);

/** Loading indicators wait this long before appearing, so fast responses never flash a skeleton. */
export const SKELETON_DELAY_MS = 200;

/**
 * Suspense fallbacks wait this long. React holds a Suspense reveal ~300 ms after the fallback mounts,
 * so the delay must exceed that for fast responses never to flash a loader.
 */
export const SUSPENSE_FALLBACK_DELAY_MS = 350;

/** DataTable pagination defaults (`DEFAULT_PAGE_SIZE` must be one of `PAGE_SIZE_OPTIONS`). */
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

/** Identical toasts fired within this window are shown once (e.g. many parallel requests failing). */
export const TOAST_DEDUPE_WINDOW_MS = 2_000;

/** Default timeout for API requests. */
export const HTTP_TIMEOUT_MS = 30_000;

/** Default TanStack Query stale time: data younger than this is served without refetching. */
export const QUERY_STALE_TIME_MS = 30_000;

/** How long search inputs wait after the last keystroke before querying. */
export const SEARCH_DEBOUNCE_MS = 300;
