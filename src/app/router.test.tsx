import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { mockDb } from '@/mocks/db';
import { DEMO_PASSWORD, MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { createTestQueryClient } from '@/test/render';

import { AppProviders } from './providers';
import { routes } from './router';

function renderApp(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
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
