/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_DEFAULT_LOCALE?: string;
  readonly VITE_DEFAULT_CURRENCY?: string;
  readonly VITE_ENABLE_MOCKS?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_LOG_LEVEL?: string;
  readonly VITE_FEATURE_FLAGS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by `define` in vite.config.ts. */
declare const __APP_VERSION__: string;
declare const __GIT_SHA__: string;
