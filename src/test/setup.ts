import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import { i18n } from '@/core/i18n';
import { server } from '@/mocks/server';

// jsdom gaps that Radix primitives and the theme code rely on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: ResizeObserverStub,
});
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }),
});
for (const method of [
  'hasPointerCapture',
  'setPointerCapture',
  'releasePointerCapture',
  'scrollIntoView',
] as const) {
  Object.defineProperty(Element.prototype, method, {
    configurable: true,
    writable: true,
    value: () => false,
  });
}

// Every request in a test must be mocked: an unhandled one fails the test.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

// The i18n instance starts in VITE_DEFAULT_LOCALE, which a developer's .env.local may set. Reset it
// BEFORE each test, so even the first test of a file starts in English whatever the config says.
beforeEach(async () => {
  if (i18n.language !== 'en') await i18n.changeLanguage('en');
});

afterEach(() => {
  // Vitest globals are off, so Testing Library's auto-cleanup is not registered: do it here.
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterAll(() => {
  server.close();
});
