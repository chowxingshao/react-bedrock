import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import indexHtml from '/index.html?raw';

import { useThemeStore } from './theme-store';

function runThemeBootstrap(): void {
  const match = /<script id="theme-bootstrap">([\s\S]*?)<\/script>/.exec(indexHtml);
  if (!match?.[1]) throw new Error('<script id="theme-bootstrap"> not found in index.html');
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- running the real inline script is the point of this test
  new Function(match[1])();
}

describe('index.html theme bootstrap', () => {
  afterEach(() => {
    act(() => {
      useThemeStore.setState({ mode: 'system' });
    });
    document.documentElement.className = '';
  });

  it('applies the theme the store persisted, before React runs', () => {
    act(() => {
      useThemeStore.getState().setMode('dark');
    });
    document.documentElement.className = '';

    runThemeBootstrap();

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
