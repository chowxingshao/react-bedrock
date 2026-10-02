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
import { type SessionUser, useSessionStore } from '@/stores/session-store';
import { render, screen } from '@/test/render';

import { AuthProvider } from './auth-provider';
import type { AuthStrategy } from './types';
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

  it('ends the session when /auth/me fails, and logs why with a normalised error', async () => {
    const error = vi.spyOn(logger, 'error');
    server.use(
      mock.get(apiUrl('/auth/me'), () => HttpResponse.json({ code: 'SERVER' }, { status: 500 })),
    );
    render(<Probe />, { auth: 'admin' });

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument(); // the bootstrap loader is gone
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(error).toHaveBeenCalledWith('Could not restore the session', {
      error: expect.objectContaining({ name: 'AppError', status: 500 }) as unknown,
    });
  });

  it('logs a failure that did not come from http (a bad /auth/me body) as an AppError, not the raw error', async () => {
    const error = vi.spyOn(logger, 'error');
    server.use(mock.get(apiUrl('/auth/me'), () => HttpResponse.json({ unexpected: true })));
    render(<Probe />, { auth: 'admin' });

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(error).toHaveBeenCalledExactlyOnceWith('Could not restore the session', {
      error: expect.objectContaining({ name: 'AppError' }) as unknown,
    });
  });
});

describe('AuthProvider with a class-based strategy', () => {
  const classUser: SessionUser = {
    id: 'class-user',
    name: 'Class User',
    email: 'class@example.com',
    permissions: [],
  };

  /** Its methods read `this`, so they only work when they are called on the strategy. */
  class ClassStrategy implements AuthStrategy {
    readonly calls: string[] = [];

    login(): Promise<SessionUser> {
      return Promise.resolve(classUser);
    }

    logout(): Promise<void> {
      return Promise.resolve();
    }

    fetchCurrentUser(): Promise<SessionUser> {
      return Promise.resolve(classUser);
    }

    refresh(): Promise<void> {
      this.calls.push('refresh');
      return Promise.resolve();
    }

    prepareRequest(config: Parameters<AuthStrategy['prepareRequest']>[0]) {
      this.calls.push('prepareRequest');
      return config;
    }
  }

  it('calls prepareRequest and refresh on the strategy, so they keep their `this`', async () => {
    const strategy = new ClassStrategy();
    let answered = false;
    server.use(
      mock.get(apiUrl('/secure'), () => {
        if (answered) return HttpResponse.json({ ok: true });
        answered = true;
        return new HttpResponse(null, { status: 401 });
      }),
    );
    render(
      <AuthProvider strategy={strategy}>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText('Signed in as Class User')).toBeInTheDocument();

    await expect(http.get('/secure')).resolves.toMatchObject({ data: { ok: true } });

    // The retry is prepared again, like any other request.
    expect(strategy.calls).toEqual(['prepareRequest', 'refresh', 'prepareRequest']);
  });
});
