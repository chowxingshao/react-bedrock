import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const baseURL = `http://localhost:${String(PORT)}`;

/**
 * The app is configured at build time too, and Vite reads the developer's `.env.local` into the build. Pin every
 * variable the app reads (to its default), so the same tests pass on every machine: a variable set in the
 * environment wins over the `.env*` files. The mock API stays on.
 */
const BUILD_ENV = {
  VITE_APP_NAME: 'React Bedrock',
  VITE_API_BASE_URL: '/api',
  VITE_APP_ENV: '',
  VITE_DEFAULT_LOCALE: 'en',
  VITE_DEFAULT_CURRENCY: 'USD',
  VITE_ENABLE_MOCKS: 'true',
  VITE_SENTRY_DSN: '',
  VITE_LOG_LEVEL: '',
  VITE_FEATURE_FLAGS: '',
  API_PROXY_TARGET: '',
};

/** E2E against the production build (`vite preview`) with the mock API on (spec §10.2). */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  // Reduced motion: no animation to wait for, so axe never samples a half-faded colour or a closing menu.
  use: { baseURL, trace: 'on-first-retry', locale: 'en-US', reducedMotion: 'reduce' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Builds first (also for `pnpm test:e2e:ui`), then serves that build.
    command: `pnpm build && pnpm preview --port ${String(PORT)} --strictPort`,
    env: BUILD_ENV,
    url: baseURL,
    // Never reuse a server: a preview started earlier serves the files of an older build.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
