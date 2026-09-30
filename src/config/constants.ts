/** App-wide constants. Environment-specific values belong in `env` (./env.ts), not here. */

/** Version and git SHA of this build, injected by `define` in vite.config.ts. */
export const APP_VERSION = __APP_VERSION__;
export const GIT_SHA = __GIT_SHA__;

/** Locales with bundled translations in src/locales/<locale>/. */
export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Loading indicators wait this long before appearing, so fast responses never flash a skeleton. */
export const SKELETON_DELAY_MS = 200;

/** DataTable pagination defaults (`DEFAULT_PAGE_SIZE` must be one of `PAGE_SIZE_OPTIONS`). */
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
