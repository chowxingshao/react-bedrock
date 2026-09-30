import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { localStore, STORAGE_KEYS } from '@/core/storage';

import { useUiStore } from './ui-store';

describe('ui store', () => {
  it('toggles the sidebar and persists only that preference', () => {
    act(() => {
      useUiStore.getState().toggleSidebar();
      useUiStore.getState().setMobileNavOpen(true);
    });

    expect(useUiStore.getState()).toMatchObject({ sidebarCollapsed: true, mobileNavOpen: true });
    expect(localStore.get(STORAGE_KEYS.ui)).toEqual({
      state: { sidebarCollapsed: true },
      version: 0,
    });
  });

  it('restores a saved sidebar preference from storage', async () => {
    localStore.set(STORAGE_KEYS.ui, { state: { sidebarCollapsed: true }, version: 0 });

    await useUiStore.persist.rehydrate();

    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it.each(['yes', 1, null, undefined])(
    'ignores a saved sidebar preference that is not a boolean (%s) and stays expanded',
    async (sidebarCollapsed) => {
      localStore.set(STORAGE_KEYS.ui, { state: { sidebarCollapsed }, version: 0 });

      await useUiStore.persist.rehydrate();

      expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    },
  );

  it('never restores anything but the sidebar preference', async () => {
    localStore.set(STORAGE_KEYS.ui, {
      state: { sidebarCollapsed: true, mobileNavOpen: true },
      version: 0,
    });

    await useUiStore.persist.rehydrate();

    expect(useUiStore.getState()).toMatchObject({ sidebarCollapsed: true, mobileNavOpen: false });
  });
});
