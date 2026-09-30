import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { localStore, STORAGE_KEYS } from '@/core/storage';

import { applyResolvedTheme, resolveTheme, useThemeStore, useThemeSync } from './theme-store';

describe('theme store', () => {
  afterEach(() => {
    act(() => {
      useThemeStore.setState({ mode: 'system' });
    });
    document.documentElement.className = '';
  });

  it('defaults to system mode', () => {
    expect(useThemeStore.getState().mode).toBe('system');
  });

  it('persists the chosen mode through the storage wrapper', () => {
    act(() => {
      useThemeStore.getState().setMode('dark');
    });
    expect(localStore.get(STORAGE_KEYS.theme)).toEqual({ state: { mode: 'dark' }, version: 0 });
  });

  it('resolves system mode from the OS preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('applies exactly one theme class to <html>', () => {
    applyResolvedTheme('dark');
    expect(document.documentElement).toHaveClass('dark');

    applyResolvedTheme('light');
    expect(document.documentElement).toHaveClass('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('keeps <html> in sync with the store', () => {
    renderHook(() => {
      useThemeSync();
    });
    act(() => {
      useThemeStore.getState().setMode('dark');
    });
    expect(document.documentElement).toHaveClass('dark');
  });
});
