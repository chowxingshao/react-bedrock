import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  type RenderHookOptions,
  type RenderOptions,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { createQueryClient } from '@/core/api';
import { ConfirmProvider } from '@/core/notify';

export {
  act,
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';

/** The app's QueryClient configuration, with retries off and no garbage collection during a test. */
export function createTestQueryClient(): QueryClient {
  const client = createQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    queries: { ...defaults.queries, retry: false, gcTime: Infinity },
    mutations: { ...defaults.mutations, retry: false },
  });
  return client;
}

function createWrapper(queryClient: QueryClient) {
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </QueryClientProvider>
    );
  };
}

export interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/** Renders `ui` inside the app providers (spec §10.2). Routing and auth options come in Phase 7. */
export function render(
  ui: ReactElement,
  { queryClient = createTestQueryClient(), ...options }: ProviderOptions = {},
) {
  return { queryClient, ...rtlRender(ui, { wrapper: createWrapper(queryClient), ...options }) };
}

export function renderHook<Result, Props>(
  callback: (props: Props) => Result,
  {
    queryClient = createTestQueryClient(),
    ...options
  }: Omit<RenderHookOptions<Props>, 'wrapper'> & { queryClient?: QueryClient } = {},
) {
  return {
    queryClient,
    ...rtlRenderHook(callback, { wrapper: createWrapper(queryClient), ...options }),
  };
}
