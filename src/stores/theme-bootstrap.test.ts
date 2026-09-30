import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import indexHtml from '/index.html?raw';

import { env } from '@/config/env';
import { createTypedStorage, STORAGE_KEYS, type StorageKey } from '@/core/storage';

import { useThemeStore } from './theme-store';

const PLACEHOLDER = '%VITE_APP_NAME%';

/**
 * Runs the real inline script from index.html in the current document.
 * `index.html?raw` is not transformed by Vite, so, like Vite does at build time, the
 * `%VITE_APP_NAME%` placeholder is substituted with the configured name, unless `substitute`
 * is false (the app-name variable was not defined at build time). The `application-name` meta
 * tag is mounted in <head> because the script reads it from the live document.
 */
function runThemeBootstrap({ substitute = true }: { substitute?: boolean } = {}): void {
  const html = substitute ? indexHtml.replace(PLACEHOLDER, () => env.VITE_APP_NAME) : indexHtml;
  const page = new DOMParser().parseFromString(html, 'text/html');
  const meta = page.querySelector('meta[name="application-name"]');
  const source = page.getElementById('theme-bootstrap')?.textContent;
  if (!meta || !source) throw new Error('application-name meta or theme-bootstrap script missing');
  document.head.append(document.importNode(meta, true));
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- running the real inline script is the point of this test
  new Function(source)();
}

describe('index.html theme bootstrap', () => {
  afterEach(() => {
    act(() => {
      useThemeStore.setState({ mode: 'system' });
    });
    document.documentElement.className = '';
    document.head.querySelector('meta[name="application-name"]')?.remove();
  });

  it('applies the theme the store persisted, before React runs', () => {
    act(() => {
      useThemeStore.getState().setMode('dark');
    });
    document.documentElement.className = '';

    runThemeBootstrap();

    expect(document.documentElement).toHaveClass('dark');
  });

  it('falls back to the default app name when the placeholder was never substituted', () => {
    // Explicit default-name storage, independent of the configured VITE_APP_NAME.
    const defaultNameStore = createTypedStorage<StorageKey>(
      () => window.localStorage,
      'react-bedrock:',
    );
    defaultNameStore.set(STORAGE_KEYS.theme, { state: { mode: 'dark' }, version: 0 });

    runThemeBootstrap({ substitute: false });

    expect(document.documentElement).toHaveClass('dark');
  });

  it('follows the OS preference in system mode', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);

    runThemeBootstrap();

    expect(document.documentElement).toHaveClass('dark');
  });

  it('uses light when nothing is saved and the OS prefers light', () => {
    runThemeBootstrap();
    expect(document.documentElement).toHaveClass('light');
  });
});
