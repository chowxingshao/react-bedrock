import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import envExample from '/.env.example?raw';

import { ENV_KEYS, parseEnv } from './env';

const DEV = { dev: true, prod: false, test: false };
const PROD = { dev: false, prod: true, test: false };

describe('parseEnv', () => {
  it('starts with safe defaults when nothing is configured', () => {
    const result = parseEnv({ buildTime: {}, mode: DEV });

    expect(result.ok).toBe(true);
    expect(result.env).toMatchObject({
      VITE_APP_NAME: 'React Bedrock',
      VITE_API_BASE_URL: '/api',
      VITE_APP_ENV: 'development',
      VITE_DEFAULT_LOCALE: 'en',
      VITE_DEFAULT_CURRENCY: 'USD',
      VITE_ENABLE_MOCKS: true,
      VITE_LOG_LEVEL: 'debug',
      VITE_FEATURE_FLAGS: [],
      isDev: true,
      isProd: false,
    });
    expect(result.env.VITE_SENTRY_DSN).toBeUndefined();
  });

  it('lets runtime config override build-time values', () => {
    const result = parseEnv({
      buildTime: { VITE_API_BASE_URL: 'http://localhost:3000/api' },
      runtime: { VITE_API_BASE_URL: 'https://api.example.com' },
      mode: PROD,
    });

    expect(result.env.VITE_API_BASE_URL).toBe('https://api.example.com');
  });

  it('treats empty and blank strings as unset', () => {
    const result = parseEnv({
      buildTime: { VITE_SENTRY_DSN: '' },
      runtime: { VITE_APP_NAME: '   ' },
      mode: DEV,
    });

    expect(result.ok).toBe(true);
    expect(result.env.VITE_APP_NAME).toBe('React Bedrock');
    expect(result.env.VITE_SENTRY_DSN).toBeUndefined();
  });

  it('parses booleans and comma-separated feature flags', () => {
    const result = parseEnv({
      buildTime: { VITE_ENABLE_MOCKS: 'false', VITE_FEATURE_FLAGS: 'alpha, beta,,' },
      mode: DEV,
    });

    expect(result.env.VITE_ENABLE_MOCKS).toBe(false);
    expect(result.env.VITE_FEATURE_FLAGS).toEqual(['alpha', 'beta']);
  });

  it('derives the environment and log level from the build mode', () => {
    const result = parseEnv({ buildTime: {}, mode: PROD });

    expect(result.env.VITE_APP_ENV).toBe('production');
    expect(result.env.VITE_LOG_LEVEL).toBe('warn');
  });

  it('ignores keys it does not know', () => {
    const result = parseEnv({ buildTime: { VITE_UNKNOWN: 'x', PATH: '/usr/bin' }, mode: DEV });

    expect(result.ok).toBe(true);
    expect(result.env).not.toHaveProperty('VITE_UNKNOWN');
  });

  it('reports every invalid variable by name and falls back to defaults', () => {
    const result = parseEnv({
      buildTime: { VITE_DEFAULT_CURRENCY: 'dollars', VITE_API_BASE_URL: 'ftp://files.example.com' },
      mode: DEV,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toHaveLength(2);
    expect(result.issues.join('\n')).toMatch(/VITE_DEFAULT_CURRENCY/);
    expect(result.issues.join('\n')).toMatch(/VITE_API_BASE_URL/);
    expect(result.env.VITE_DEFAULT_CURRENCY).toBe('USD');
  });
});

describe('.env.example', () => {
  it('documents every supported variable', () => {
    const documented = [...envExample.matchAll(/^#?\s*(VITE_[A-Z_]+)=/gm)].map((match) => match[1]);

    expect(new Set(documented)).toEqual(new Set(ENV_KEYS));
  });
});

describe('Zod configuration', () => {
  it('keeps the JIT off, so a Content-Security-Policy without unsafe-eval is never reported', () => {
    // With the JIT on, Zod probes `new Function('')` when the first object schema is built, and the Docker
    // image's policy reports that as a violation on every page load (docs/security.md).
    expect(z.config().jitless).toBe(true);
  });
});
