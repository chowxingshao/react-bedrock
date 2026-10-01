/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-side only, never exposed to the browser: forwards /api to a real backend when set.
  const apiProxyTarget = loadEnv(mode, process.cwd(), '').API_PROXY_TARGET;
  const proxy = apiProxyTarget
    ? { '/api': { target: apiProxyTarget, changeOrigin: true } }
    : undefined;

  // env.test.ts reads `.env.example` through Vite (`?raw`), and Vite's default `server.fs.deny` blocks
  // `.env.*`. Relax that for the test run only: the dev and preview servers keep the secure defaults.
  const fs = mode === 'test' ? { deny: ['*.{crt,pem}', '**/.git/**'] } : undefined;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.APP_VERSION ?? pkg.version),
      __GIT_SHA__: JSON.stringify(process.env.GIT_SHA ?? 'local'),
    },
    server: { proxy, fs },
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
      },
    },
  };
});
