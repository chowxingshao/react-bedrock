import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  type RenderHookOptions,
  type RenderOptions,
} from '@testing-library/react';
import { createContext, type ReactElement, type ReactNode, use } from 'react';
import { createMemoryRouter, type RouteObject, RouterProvider } from 'react-router';

import { createQueryClient } from '@/core/api';
import { AuthProvider } from '@/core/auth';
import { ConfirmProvider } from '@/core/notify';
import { mockDb } from '@/mocks/db';
import { MOCK_USER_IDS, type MockUserKey } from '@/mocks/fixtures/users';

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

export interface TestOptions {
  queryClient?: QueryClient;
  /** Initial URL (default '/'). */
  route?: string;
  /** Route pattern the UI is mounted at, so `useParams` works (default '*'). */
  path?: string;
  /** Extra routes, e.g. a login page to assert a redirect. */
  routes?: RouteObject[];
  /**
   * Wraps the UI in AuthProvider. 'admin' / 'viewer' sign a mock user in first; 'anonymous' starts
   * signed out. The first frame is then the bootstrap loader, so use `findBy…` queries.
   */
  auth?: MockUserKey | 'anonymous';
}

export type ProviderOptions = TestOptions & Omit<RenderOptions, 'wrapper'>;

// The rendered UI travels through context, so RTL's rerender(newUi) keeps the same router.
const UiContext = createContext<ReactNode>(null);
function UiOutlet() {
  return use(UiContext);
}

function setup({
  queryClient = createTestQueryClient(),
  route = '/',
  path = '*',
  routes = [],
  auth,
}: TestOptions) {
  if (auth && auth !== 'anonymous') mockDb.sessionUserId = MOCK_USER_IDS[auth];
  const router = createMemoryRouter([{ path, element: <UiOutlet /> }, ...routes], {
    initialEntries: [route],
  });

  function Providers({ children }: { children: ReactNode }) {
    const app = (
      <UiContext value={children}>
        <RouterProvider router={router} />
      </UiContext>
    );
    return (
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>{auth ? <AuthProvider>{app}</AuthProvider> : app}</ConfirmProvider>
      </QueryClientProvider>
    );
  }

  return { queryClient, router, Providers };
}

/** Renders `ui` inside the app providers and a memory data router (spec §10.2). */
export function render(
  ui: ReactElement,
  { queryClient, route, path, routes, auth, ...options }: ProviderOptions = {},
) {
  const context = setup({ queryClient, route, path, routes, auth });
  return {
    queryClient: context.queryClient,
    router: context.router,
    ...rtlRender(ui, { wrapper: context.Providers, ...options }),
  };
}

export function renderHook<Result, Props>(
  callback: (props: Props) => Result,
  {
    queryClient,
    route,
    path,
    routes,
    auth,
    ...options
  }: TestOptions & Omit<RenderHookOptions<Props>, 'wrapper'> = {},
) {
  const context = setup({ queryClient, route, path, routes, auth });
  return {
    queryClient: context.queryClient,
    router: context.router,
    ...rtlRenderHook(callback, { wrapper: context.Providers, ...options }),
  };
}
