import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import type { StoreApi } from 'zustand';

import { i18n } from '@/core/i18n';
import { server } from '@/mocks/server';
import { useSessionStore } from '@/stores/session-store';
import { useThemeStore } from '@/stores/theme-store';
import { useUiStore } from '@/stores/ui-store';

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

// Every request in a test must be mocked: MSW rejects an unhandled one and logs its URL. The test
// fails only if that rejection reaches it (a component that catches the error would still pass).
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

// A test may switch the language (changeLocale, i18n.changeLanguage), and the instance starts in the
// detected one (saved choice, then browser, then VITE_DEFAULT_LOCALE). Reset it BEFORE each test, so
// every test, the first of a file included, starts in English.
beforeEach(async () => {
  if (i18n.language !== 'en') await i18n.changeLanguage('en');
});

// Stores are module singletons, so state would leak from one test into the next. The helper is
// generic because the stores have different state types (a union of them cannot be called).
function resetStore<State>(store: StoreApi<State>): void {
  store.setState(store.getInitialState(), true);
}

afterEach(() => {
  // Reset every store BEFORE the storage clears below: persisted stores write on reset.
  resetStore(useSessionStore);
  resetStore(useThemeStore);
  resetStore(useUiStore);
  // Vitest globals are off, so Testing Library's auto-cleanup is not registered: do it here.
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterAll(() => {
  server.close();
});
