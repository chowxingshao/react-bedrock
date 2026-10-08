/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv, type PluginOption } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

/** Build metadata from the environment. Docker passes build args that were not provided as empty strings. */
function buildArg(name: 'APP_VERSION' | 'GIT_SHA'): string | undefined {
  const value = process.env[name];
  return value === '' ? undefined : value;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-side settings, never exposed to the browser (read from .env files and the shell).
  const serverEnv = loadEnv(mode, process.cwd(), '');
  // Forwards /api to a real backend when set.
  const apiProxyTarget = serverEnv.API_PROXY_TARGET;
  const proxy = apiProxyTarget
    ? { '/api': { target: apiProxyTarget, changeOrigin: true } }
    : undefined;
  // Docker on Windows/WSL: bind-mounted files emit no change events, so poll instead.
  const watch =
    serverEnv.CHOKIDAR_USEPOLLING === 'true' ? { usePolling: true, interval: 300 } : undefined;

  // env.test.ts reads `.env.example` through Vite (`?raw`), and Vite's default `server.fs.deny` blocks
  // `.env.*`. Relax that for the test run only: the dev and preview servers keep the secure defaults.
  const fs = mode === 'test' ? { deny: ['*.{crt,pem}', '**/.git/**'] } : undefined;

  return {
    plugins: [
      react(),
      tailwindcss(),
      // `pnpm analyze`: a treemap of everything in the bundle, with gzip and brotli sizes. It opens in the
      // browser, except in CI, where there is none.
      mode === 'analyze' &&
        (visualizer({
          filename: 'stats.html',
          template: 'treemap',
          gzipSize: true,
          brotliSize: true,
          open: !process.env.CI,
        }) as PluginOption),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(buildArg('APP_VERSION') ?? pkg.version),
      __GIT_SHA__: JSON.stringify(buildArg('GIT_SHA') ?? 'local'),
    },
    server: { proxy, watch, fs },
    preview: { proxy },
    test: {
      environment: 'jsdom',
      environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      env: {
        // Tests must not depend on a developer's VITE_API_BASE_URL: an absolute one makes every request
        // cross-origin, and jsdom then sends CORS preflights that the MSW handlers do not answer.
        VITE_API_BASE_URL: '/api',
        // Nor on their VITE_LOG_LEVEL: above `debug` the logger drops entries before it de-duplicates
        // them, so a test of the de-duplication would pass without testing anything.
        VITE_LOG_LEVEL: 'debug',
        // Dates in tests are written in UTC: do not depend on the developer's or CI's time zone.
        TZ: 'UTC',
      },
      // Vitest blanks every `.css` module by default, `?raw` imports included; tokens.test.ts reads the source.
      css: { include: [/tokens\.css\?raw/] },
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/**/*.stories.tsx',
          'src/**/*.d.ts',
          'src/test/**',
          'src/mocks/**',
          'src/api/generated/**',
          'src/main.tsx',
        ],
        reporter: ['text', 'html', 'lcov'],
        // Spec §10.2: at least ~70% on the infrastructure and utility layers. Raise these as coverage grows.
        thresholds: {
          'src/core/**': { lines: 70, functions: 70, branches: 70, statements: 70 },
          'src/lib/**': { lines: 70, functions: 70, branches: 70, statements: 70 },
        },
      },
    },
  };
});
