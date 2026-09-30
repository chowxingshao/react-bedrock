import { useEffect } from 'react';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { env } from '@/config/env';
import { createZustandStorage, localStore, STORAGE_KEYS } from '@/core/storage';

export const THEME_MODES = ['light', 'dark', 'system'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

type PersistedTheme = Pick<ThemeState, 'mode'>;

/**
 * UI state only (spec §6.4): the user's theme preference.
 * The persisted format is read before first paint by the inline script in index.html.
 */
export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set) => ({
        mode: 'system',
        setMode: (mode) => {
          set({ mode }, undefined, 'theme/setMode');
        },
      }),
      {
        name: STORAGE_KEYS.theme,
        storage: createZustandStorage<PersistedTheme>(localStore),
        partialize: (state): PersistedTheme => ({ mode: state.mode }),
      },
    ),
    { name: 'theme-store', enabled: env.isDev && !env.isTest },
  ),
);

export const useThemeMode = () => useThemeStore((state) => state.mode);
export const useSetThemeMode = () => useThemeStore((state) => state.setMode);

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}

/** Puts exactly one of `light` / `dark` on <html>. Mirrors the bootstrap script in index.html. */
export function applyResolvedTheme(
  theme: ResolvedTheme,
  root: HTMLElement = document.documentElement,
): void {
  root.classList.remove(theme === 'dark' ? 'light' : 'dark');
  root.classList.add(theme);
}

const PREFERS_DARK = '(prefers-color-scheme: dark)';

/** Keeps <html> in sync with the chosen mode (and with the OS setting in `system` mode). Mount once. */
export function useThemeSync(): void {
  const mode = useThemeMode();

  useEffect(() => {
    const media = window.matchMedia(PREFERS_DARK);
    const apply = () => {
      applyResolvedTheme(resolveTheme(mode, media.matches));
    };
    apply();
    if (mode !== 'system') return;
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
    };
  }, [mode]);
}
