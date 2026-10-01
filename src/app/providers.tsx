import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';

import { queryClient } from '@/core/api';
import { AuthProvider } from '@/core/auth';
import { ConfirmProvider, Toaster } from '@/core/notify';
import { useThemeSync } from '@/stores/theme-store';

function ThemeSync() {
  useThemeSync();
  return null;
}

interface AppProvidersProps {
  children: ReactNode;
  /** Tests pass a fresh client; the app uses its singleton. */
  client?: QueryClient;
}

/** Every app-wide provider, composed in one place (spec §3). */
export function AppProviders({ children, client = queryClient }: AppProvidersProps) {
  return (
    <QueryClientProvider client={client}>
      <ConfirmProvider>
        <ThemeSync />
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </ConfirmProvider>
      {/* Renders nothing outside development builds. */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
