import { useSuspenseQuery } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as mock, HttpResponse } from 'msw';
import { createMemoryRouter, type RouteObject, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/config/env';
import { paths } from '@/config/paths';
import { http } from '@/core/api';
import { apiUrl } from '@/mocks/api-url';
import { mockDb } from '@/mocks/db';
import { DEMO_PASSWORD, MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { server } from '@/mocks/server';
import { createTestQueryClient } from '@/test/render';

import { AppProviders } from './providers';
import { routes } from './router';

function renderApp(url: string, tree: RouteObject[] = routes) {
  const router = createMemoryRouter(tree, { initialEntries: [url] });
  render(
    <AppProviders client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

describe('app routes', () => {
  it('sends visitors to login, then back to the page they asked for', async () => {
    const user = userEvent.setup();
    const router = renderApp('/dashboard');

    await user.type(await screen.findByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
    await waitFor(() => {
      expect(document.title).toBe(`Dashboard · ${env.VITE_APP_NAME}`);
    });
  });

  it.each([
    ['a protocol-relative URL', '/login?returnTo=%2F%2Fevil.example'],
    ['a path with a tab that browsers drop', '/login?returnTo=%2F%09%2Fevil.example'],
  ])(
    'keeps the user on this site after signing in, even with %s as returnTo',
    async (_name, url) => {
      const user = userEvent.setup();
      const router = renderApp(url);

      await user.type(await screen.findByLabelText('Email'), 'admin@example.com');
      await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD);
      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Dashboard' }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/dashboard');
    },
  );

  it('redirects / to the dashboard for signed-in users', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
    const router = renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
  });

  it('shows the 404 page inside the app shell', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.viewer;
    renderApp('/does-not-exist');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('shows the 403 page', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.viewer;
    renderApp('/403');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Access denied' }),
    ).toBeInTheDocument();
  });
});

describe('focus after navigation (WCAG 2.4.3)', () => {
  it('moves to the main content after a link click', async () => {
    const user = userEvent.setup();
    mockDb.sessionUserId = MOCK_USER_IDS.viewer;
    renderApp('/does-not-exist');

    await user.click(await screen.findByRole('link', { name: 'Back to dashboard' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('moves to the main content after a programmatic navigation', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
    const router = renderApp('/dashboard');
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();

    await act(() => router.navigate('/403'));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Access denied' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('leaves focus alone on the first load', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
    renderApp('/dashboard');
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(document.body).toHaveFocus();
  });

  it('leaves focus alone on a redirect, so "Skip to main content" stays the first Tab stop', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
    const router = renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
    expect(document.body).toHaveFocus();
  });

  it('leaves focus alone when signing in redirects to the page the user wanted', async () => {
    const user = userEvent.setup();
    renderApp('/dashboard');

    await user.type(await screen.findByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveFocus();
  });
});

/**
 * The real route tree plus extra pages, added next to the dashboard: the group that `plop:routes`
 * inserts generated pages into. The test fails loudly if that group moves.
 */
function routesWithPages(pages: RouteObject[]): RouteObject[] {
  let insertions = 0;
  const walk = (list: RouteObject[]): RouteObject[] =>
    list.map((route) => {
      const children = route.children;
      if (!children) return route;
      if (children.some((child) => child.path === paths.dashboard.pattern)) {
        insertions += 1;
        return { ...route, children: [...children, ...pages] };
      }
      return { ...route, children: walk(children) };
    });
  const tree = walk(routes);
  if (insertions !== 1)
    throw new Error('Expected exactly one route group to hold the dashboard route');
  return tree;
}

let healthy = false;

function QueryPage() {
  const { data } = useSuspenseQuery({
    queryKey: ['page-errors'],
    queryFn: async () => (await http.get<{ title: string }>('/page-errors')).data,
  });
  return <h1>{data.title}</h1>;
}

/** Throws while it renders, until `healthy` is set. */
function RecoveringPage() {
  if (!healthy) throw new Error('Not ready yet');
  return <h1>Recovered page</h1>;
}

const pages: RouteObject[] = [
  { path: '/page-errors/query', Component: QueryPage },
  { path: '/page-errors/render', Component: RecoveringPage },
  { path: '/page-errors/lazy', lazy: () => Promise.reject(new Error('Loading chunk failed')) },
  {
    path: '/page-errors/response',
    loader: () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router loaders throw a Response
      throw new Response('Nothing here', { status: 404, statusText: 'Not Found' });
    },
  },
];

describe('errors on a page inside the app shell', () => {
  beforeEach(() => {
    healthy = false;
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
    // React and React Router print every error a boundary catches.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  const renderPage = (url: string) => renderApp(url, routesWithPages(pages));
  const expectShell = () => {
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  };

  it('offers Try again for a failed suspense query, keeps the shell and recovers when the API answers', async () => {
    const user = userEvent.setup();
    server.use(
      mock.get(apiUrl('/page-errors'), () =>
        healthy
          ? HttpResponse.json({ title: 'Loaded page' })
          : HttpResponse.json({ code: 'SERVER' }, { status: 500 }),
      ),
    );
    renderPage('/page-errors/query');

    const retry = await screen.findByRole('button', { name: 'Try again' });
    expectShell();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();

    healthy = true;
    await user.click(retry);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Loaded page' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expectShell();
  });

  it('shows the same fallback for a plain render error, and Try again renders the page again', async () => {
    const user = userEvent.setup();
    renderPage('/page-errors/render');

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expectShell();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();

    healthy = true;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recovered page' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears the error when the user navigates to another page', async () => {
    const user = userEvent.setup();
    renderPage('/page-errors/render');
    await screen.findByRole('alert');

    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    await user.click(within(navigation).getByRole('link', { name: 'Dashboard' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('still moves focus to the main content when the page the user navigated to fails', async () => {
    const router = renderPage('/dashboard');
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();

    await act(() => router.navigate('/page-errors/render'));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('leaves what only the router sees to RouteError: a chunk that fails to load', async () => {
    renderPage('/page-errors/lazy');

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expectShell();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('leaves what only the router sees to RouteError: a thrown 404 response', async () => {
    renderPage('/page-errors/response');

    expect(
      await screen.findByRole('heading', { level: 2, name: "We couldn't find that page" }),
    ).toBeInTheDocument();
    expectShell();
  });
});
