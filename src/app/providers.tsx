import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';

import { queryClient } from '@/core/api';
import { ConfirmProvider, Toaster } from '@/core/notify';
import { useThemeSync } from '@/stores/theme-store';

function ThemeSync() {
  useThemeSync();
  return null;
}

/** Every app-wide provider, composed in one place (spec §3). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <ThemeSync />
        {children}
        <Toaster />
      </ConfirmProvider>
      {/* Renders nothing outside development builds. */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
