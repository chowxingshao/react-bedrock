import type { ReactNode } from 'react';

import { useThemeSync } from '@/stores/theme-store';

function ThemeSync() {
  useThemeSync();
  return null;
}

/** Every app-wide provider, composed in one place (spec §3). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeSync />
      {children}
    </>
  );
}
