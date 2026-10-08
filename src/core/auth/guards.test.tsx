import { useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { Can } from './can';
import { RequireAuth, RequireGuest, RequirePermission } from './guards';

function LoginProbe() {
  const location = useLocation();
  return <p>Login page {location.search}</p>;
}

describe('guards', () => {
  it('RequireAuth sends signed-out users to login with a return path', async () => {
    render(
      <RequireAuth>
        <p>Secret</p>
      </RequireAuth>,
      {
        auth: 'anonymous',
        path: '/items',
        route: '/items?page=2',
        routes: [{ path: '/login', element: <LoginProbe /> }],
      },
    );
    expect(await screen.findByText('Login page ?returnTo=%2Fitems%3Fpage%3D2')).toBeInTheDocument();
  });

  it('RequireAuth renders its children for signed-in users', async () => {
    render(
      <RequireAuth>
        <p>Secret</p>
      </RequireAuth>,
      { auth: 'viewer' },
    );
    expect(await screen.findByText('Secret')).toBeInTheDocument();
  });

  it('RequireGuest sends signed-in users to their safe return path', async () => {
    render(
      <RequireGuest>
        <p>Login form</p>
      </RequireGuest>,
      {
        auth: 'admin',
        path: '/login',
        route: '/login?returnTo=%2Fitems',
        routes: [{ path: '/items', element: <p>Items page</p> }],
      },
    );
    expect(await screen.findByText('Items page')).toBeInTheDocument();
  });

  it.each([
    ['a protocol-relative URL', '%2F%2Fevil.example'],
    ['a path with a tab that browsers drop', '%2F%09%2Fevil.example'],
  ])(
    'RequireGuest never sends signed-in users off-site, even with %s as returnTo',
    async (_name, returnTo) => {
      render(
        <RequireGuest>
          <p>Login form</p>
        </RequireGuest>,
        {
          auth: 'admin',
          path: '/login',
          route: `/login?returnTo=${returnTo}`,
          routes: [{ path: '/dashboard', element: <p>Dashboard page</p> }],
        },
      );
      expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    },
  );

  it('RequirePermission shows the 403 state without the permission', async () => {
    render(
      <RequirePermission permission="items.create">
        <p>Create form</p>
      </RequirePermission>,
      { auth: 'viewer' },
    );
    // It stands in for the whole page, so its title is the page's h1.
    expect(
      await screen.findByRole('heading', { level: 1, name: "You don't have access to this page" }),
    ).toBeInTheDocument();
  });

  it('Can renders children or the fallback', async () => {
    render(
      <>
        <Can permission="items.read">
          <p>Visible</p>
        </Can>
        <Can permission="items.delete" fallback={<p>Hidden</p>}>
          <p>Delete button</p>
        </Can>
      </>,
      { auth: 'viewer' },
    );
    expect(await screen.findByText('Visible')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.queryByText('Delete button')).not.toBeInTheDocument();
  });
});
