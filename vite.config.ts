/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
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
});
