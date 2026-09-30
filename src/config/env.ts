import { z } from 'zod';

import { SUPPORTED_LOCALES } from './constants';

export const APP_ENVIRONMENTS = ['development', 'staging', 'production'] as const;
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];
export type LogLevel = (typeof LOG_LEVELS)[number];

function isHttpUrlOrAbsolutePath(value: string): boolean {
  if (value.startsWith('/')) return true;
  try {
    return new URL(value).protocol.startsWith('http');
  } catch {
    return false;
  }
}

/** Every configuration value, each with a safe default so the app starts with no .env at all. */
export const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default('React Bedrock'),
  VITE_API_BASE_URL: z
    .string()
    .refine(isHttpUrlOrAbsolutePath, {
      error: 'Must be an http(s) URL or a path starting with "/"',
    })
    .default('/api'),
  VITE_APP_ENV: z.enum(APP_ENVIRONMENTS).optional(),
  VITE_DEFAULT_LOCALE: z.enum(SUPPORTED_LOCALES).default('en'),
  VITE_DEFAULT_CURRENCY: z
    .string()
    .regex(/^[A-Z]{3}$/, { error: 'Must be a 3-letter ISO 4217 code, e.g. USD' })
    .default('USD'),
  VITE_ENABLE_MOCKS: z.stringbool().default(true),
  VITE_SENTRY_DSN: z.url().optional(),
  VITE_LOG_LEVEL: z.enum(LOG_LEVELS).optional(),
  VITE_FEATURE_FLAGS: z
    .string()
    .default('')
    .transform((csv) =>
      csv
        .split(',')
        .map((flag) => flag.trim())
        .filter(Boolean),
    ),
});

export type EnvKey = keyof z.input<typeof envSchema>;

/** Names of every supported variable (used by guard tests, docs and the Docker entrypoint whitelist). */
export const ENV_KEYS: readonly EnvKey[] = envSchema.keyof().options;

export interface AppEnv extends Omit<
  z.output<typeof envSchema>,
  'VITE_APP_ENV' | 'VITE_LOG_LEVEL'
> {
  VITE_APP_ENV: AppEnvironment;
  VITE_LOG_LEVEL: LogLevel;
  /** Vite dev server or Vitest (`import.meta.env.DEV`). */
  isDev: boolean;
  /** Production bundle (`import.meta.env.PROD`). */
  isProd: boolean;
  /** Running under Vitest. */
  isTest: boolean;
}

export interface BuildMode {
  dev: boolean;
  prod: boolean;
  test: boolean;
}

export interface EnvSources {
  /** Build-time values (`import.meta.env`). */
  buildTime: Readonly<Record<string, unknown>>;
  /** Runtime values (`window.__APP_CONFIG__` from /config.js). These win over build-time values. */
  runtime?: Readonly<Record<string, unknown>> | undefined;
  mode: BuildMode;
}

export type EnvResult =
  | { ok: true; env: AppEnv; issues: readonly string[] }
  | { ok: false; env: AppEnv; issues: readonly string[] };

/** Keeps only known keys that have a non-blank scalar value, as trimmed strings. */
function pickDefined(
  source: Readonly<Record<string, unknown>> | undefined,
): Partial<Record<EnvKey, string>> {
  const picked: Partial<Record<EnvKey, string>> = {};
  if (!source) return picked;
  for (const key of ENV_KEYS) {
    const value = source[key];
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      continue;
    }
    const text = String(value).trim();
    if (text !== '') picked[key] = text;
  }
  return picked;
}

function finalize(values: z.output<typeof envSchema>, mode: BuildMode): AppEnv {
  return {
    ...values,
    VITE_APP_ENV: values.VITE_APP_ENV ?? (mode.prod ? 'production' : 'development'),
    VITE_LOG_LEVEL: values.VITE_LOG_LEVEL ?? (mode.prod ? 'warn' : 'debug'),
    isDev: mode.dev,
    isProd: mode.prod,
    isTest: mode.test,
  };
}

/** Merges build-time and runtime config (runtime wins) and validates the result. Never throws. */
export function parseEnv({ buildTime, runtime, mode }: EnvSources): EnvResult {
  const merged = { ...pickDefined(buildTime), ...pickDefined(runtime) };
  const result = envSchema.safeParse(merged);
  if (result.success) return { ok: true, env: finalize(result.data, mode), issues: [] };
  return {
    ok: false,
    env: finalize(envSchema.parse({}), mode),
    issues: result.error.issues.map(
      (issue) => `${issue.path.map(String).join('.')}: ${issue.message}`,
    ),
  };
}

const result = parseEnv({
  buildTime: import.meta.env,
  runtime: window.__APP_CONFIG__,
  mode: {
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    test: import.meta.env.MODE === 'test',
  },
});

if (!result.ok && import.meta.env.PROD) {
  // Spec §4: production builds refuse to start with invalid configuration.
  throw new Error(`Invalid app configuration:\n${result.issues.join('\n')}`);
}

/**
 * Validated, typed configuration.
 * This module is the only place allowed to read import.meta.env or window.__APP_CONFIG__.
 */
export const env: AppEnv = result.env;

/** Validation problems (development only). main.tsx renders ConfigErrorScreen when non-empty. */
export const envIssues: readonly string[] = result.issues;
