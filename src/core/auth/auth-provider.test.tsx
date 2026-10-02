import userEvent from '@testing-library/user-event';
import { http as mock, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { http } from '@/core/api';
import { i18n } from '@/core/i18n';
import { logger } from '@/core/logger';
import { notify } from '@/core/notify';
import { sessionStore, STORAGE_KEYS } from '@/core/storage';
import { apiUrl } from '@/mocks/api-url';
import { DEMO_EMAILS, DEMO_PASSWORD } from '@/mocks/fixtures/users';
import { server } from '@/mocks/server';
import { render, screen } from '@/test/render';

import { useAuth } from './use-auth';

function Probe() {
  const { user, isAuthenticated, hasPermission, login, logout } = useAuth();
  return (
    <div>
      <p>{isAuthenticated ? `Signed in as ${user?.name ?? ''}` : 'Signed out'}</p>
      <p>{hasPermission('items.create') ? 'can create' : 'cannot create'}</p>
      <button
        type="button"
        onClick={() => {
          void login({ email: DEMO_EMAILS.viewer, password: DEMO_PASSWORD });
        }}
      >
        Log in as viewer
      </button>
      <button
        type="button"
        onClick={() => {
          void logout();
        }}
      >
        Log out
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('restores the session from /auth/me', async () => {
    render(<Probe />, { auth: 'admin' });
    expect(await screen.findByText('Signed in as Alex Admin')).toBeInTheDocument();
    expect(screen.getByText('can create')).toBeInTheDocument();
  });

  it('logs in and out, clearing cached data and session storage', async () => {
    const user = userEvent.setup();
    const { queryClient } = render(<Probe />, { auth: 'anonymous' });

    await user.click(await screen.findByRole('button', { name: 'Log in as viewer' }));
    expect(await screen.findByText('Signed in as Vic Viewer')).toBeInTheDocument();
    expect(screen.getByText('cannot create')).toBeInTheDocument();

    queryClient.setQueryData(['private'], 'secret');
    sessionStore.set(STORAGE_KEYS.ui, 'draft');
    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(queryClient.getQueryData(['private'])).toBeUndefined();
    expect(sessionStore.get(STORAGE_KEYS.ui)).toBeNull();
  });

  it('ends the session when a refresh after a 401 fails', async () => {
    render(<Probe />, { auth: 'admin' });
    await screen.findByText('Signed in as Alex Admin');
    server.use(
      mock.get(apiUrl('/secure'), () => new HttpResponse(null, { status: 401 })),
      mock.post(apiUrl('/auth/refresh'), () => new HttpResponse(null, { status: 401 })),
    );

    await expect(http.get('/secure')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
  });

  it('ends the session once when several concurrent requests are refused together', async () => {
    const { queryClient } = render(<Probe />, { auth: 'admin' });
    await screen.findByText('Signed in as Alex Admin');
    const clear = vi.spyOn(queryClient, 'clear');
    const setUser = vi.spyOn(logger, 'setUser');
    server.use(
      mock.get(apiUrl('/one'), () => new HttpResponse(null, { status: 401 })),
      mock.get(apiUrl('/two'), () => new HttpResponse(null, { status: 401 })),
      mock.get(apiUrl('/three'), () => new HttpResponse(null, { status: 401 })),
      mock.post(apiUrl('/auth/refresh'), () => new HttpResponse(null, { status: 401 })),
    );

    await Promise.allSettled([http.get('/one'), http.get('/two'), http.get('/three')]);

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(clear).toHaveBeenCalledTimes(1);
    expect(setUser).toHaveBeenCalledTimes(1);
    expect(setUser).toHaveBeenCalledWith(null);
  });

  it('keeps the session when the refresh fails for a reason that says nothing about it', async () => {
    render(<Probe />, { auth: 'admin' });
    await screen.findByText('Signed in as Alex Admin');
    server.use(
      mock.get(apiUrl('/secure'), () => new HttpResponse(null, { status: 401 })),
      mock.post(apiUrl('/auth/refresh'), () => new HttpResponse(null, { status: 503 })),
    );

    await expect(http.get('/secure')).rejects.toMatchObject({ status: 503 });

    expect(screen.getByText('Signed in as Alex Admin')).toBeInTheDocument();
  });

  it('still signs out locally when the logout request fails, and says the server was not reached', async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(logger, 'warn');
    const notice = vi.spyOn(notify, 'warning');
    server.use(
      mock.post(apiUrl('/auth/logout'), () =>
        HttpResponse.json({ code: 'SERVER' }, { status: 500 }),
      ),
    );
    render(<Probe />, { auth: 'admin' });

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    // The entry carries the normalised error, never the raw Axios error (it holds the request).
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Sign-out request failed; the local session was cleared anyway',
      { error: expect.objectContaining({ name: 'AppError', status: 500 }) as unknown },
    );
    // The session cookie is still valid on the server, so the user has to be told.
    expect(notice).toHaveBeenCalledExactlyOnceWith(
      "You're signed out here, but we couldn't reach the server. Close the browser to end the session on this computer.",
    );
  });

  it('tells the user in their language', async () => {
    const user = userEvent.setup();
    const notice = vi.spyOn(notify, 'warning');
    await i18n.changeLanguage('es');
    server.use(
      mock.post(apiUrl('/auth/logout'), () =>
        HttpResponse.json({ code: 'SERVER' }, { status: 500 }),
      ),
    );
    render(<Probe />, { auth: 'admin' });

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(notice).toHaveBeenCalledExactlyOnceWith(
      'Has cerrado la sesión aquí, pero no pudimos comunicarnos con el servidor. Cierra el navegador para terminar la sesión en este equipo.',
    );
  });

  it('shows no notice when the logout request succeeds', async () => {
    const user = userEvent.setup();
    const notice = vi.spyOn(notify, 'warning');
    render(<Probe />, { auth: 'admin' });

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(notice).not.toHaveBeenCalled();
  });
});
