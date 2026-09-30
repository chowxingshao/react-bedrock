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
