import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { env } from '@/config/env';
import { createZustandStorage, localStore, STORAGE_KEYS } from '@/core/storage';

interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

type PersistedUi = Pick<UiState, 'sidebarCollapsed'>;

/** Layout UI state (spec §6.4). Only the sidebar preference survives reloads. */
export const useUiStore = create<UiState>()(
  devtools(
    persist(
      (set) => ({
        sidebarCollapsed: false,
        mobileNavOpen: false,
        toggleSidebar: () => {
          set(
            (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
            undefined,
            'ui/toggleSidebar',
          );
        },
        setMobileNavOpen: (open) => {
          set({ mobileNavOpen: open }, undefined, 'ui/setMobileNavOpen');
        },
      }),
      {
        name: STORAGE_KEYS.ui,
        storage: createZustandStorage<PersistedUi>(localStore),
        partialize: (state): PersistedUi => ({ sidebarCollapsed: state.sidebarCollapsed }),
        // Storage is user-editable and outlives releases: never trust a stored value blindly.
        merge: (persisted, current) => {
          const sidebarCollapsed = (persisted as Partial<PersistedUi> | undefined)
            ?.sidebarCollapsed;
          return typeof sidebarCollapsed === 'boolean' ? { ...current, sidebarCollapsed } : current;
        },
      },
    ),
    { name: 'ui-store', enabled: env.isDev && !env.isTest },
  ),
);

export const useSidebarCollapsed = () => useUiStore((state) => state.sidebarCollapsed);
export const useToggleSidebar = () => useUiStore((state) => state.toggleSidebar);
export const useMobileNavOpen = () => useUiStore((state) => state.mobileNavOpen);
export const useSetMobileNavOpen = () => useUiStore((state) => state.setMobileNavOpen);
