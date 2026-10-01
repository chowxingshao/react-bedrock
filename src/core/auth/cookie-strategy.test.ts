import { http as mock, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { http } from '@/core/api';
import { apiUrl } from '@/mocks/api-url';
import { mockDb } from '@/mocks/db';
import { DEMO_EMAILS, DEMO_PASSWORD, MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { MOCK_SESSION_COOKIE } from '@/mocks/handlers/auth';
import { server } from '@/mocks/server';

import { cookieSessionStrategy } from './cookie-strategy';

describe('cookieSessionStrategy', () => {
  it('logs in and returns the validated user', async () => {
    const user = await cookieSessionStrategy.login({
      email: 'admin@example.com',
      password: DEMO_PASSWORD,
    });
    expect(user).toMatchObject({
      id: 'user-admin',
      permissions: expect.arrayContaining(['items.create']) as unknown,
    });
  });

  it('rejects wrong credentials with a normalised AppError', async () => {
    await expect(
      cookieSessionStrategy.login({ email: 'admin@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
  });

  it('returns null from fetchCurrentUser when nobody is signed in', async () => {
    await expect(cookieSessionStrategy.fetchCurrentUser()).resolves.toBeNull();
  });

  it('returns the signed-in user', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.viewer;
    await expect(cookieSessionStrategy.fetchCurrentUser()).resolves.toMatchObject({
      id: 'user-viewer',
      permissions: ['items.read'],
    });
  });

  it('drops permissions the frontend does not know about', async () => {
    server.use(
      mock.get(apiUrl('/auth/me'), () =>
        HttpResponse.json({
          id: 'x',
          name: 'X',
          email: 'x@example.com',
          permissions: ['items.read', 'reports.export'],
        }),
      ),
    );
    await expect(cookieSessionStrategy.fetchCurrentUser()).resolves.toMatchObject({
      permissions: ['items.read'],
    });
  });

  it('asks the browser to send the session cookie with every request', () => {
    type Config = Parameters<typeof cookieSessionStrategy.prepareRequest>[0];
    const config = cookieSessionStrategy.prepareRequest({ headers: {} } as unknown as Config);
    expect(config.withCredentials).toBe(true);
  });
});

interface RecordedRequest {
  url: string | undefined;
  skipAuthRefresh: boolean | undefined;
  silent: boolean | undefined;
}

/** What `http` is asked to send while `run` is in progress (the request config, before the interceptors). */
async function recordRequests(run: () => Promise<unknown>): Promise<RecordedRequest[]> {
  const seen: RecordedRequest[] = [];
  const id = http.interceptors.request.use((config) => {
    seen.push({ url: config.url, skipAuthRefresh: config.skipAuthRefresh, silent: config.silent });
    return config;
  });
  try {
    await run();
  } finally {
    http.interceptors.request.eject(id);
  }
  return seen;
}

describe('cookieSessionStrategy: the session lifecycle', () => {
  it('expires the session cookie on logout, so nobody is signed in afterwards', async () => {
    await cookieSessionStrategy.login({ email: DEMO_EMAILS.admin, password: DEMO_PASSWORD });
    expect(document.cookie).toContain(`${MOCK_SESSION_COOKIE}=${MOCK_USER_IDS.admin}`);
    await expect(cookieSessionStrategy.fetchCurrentUser()).resolves.toMatchObject({
      id: MOCK_USER_IDS.admin,
    });

    await cookieSessionStrategy.logout();

    expect(document.cookie).not.toContain(MOCK_SESSION_COOKIE);
    await expect(cookieSessionStrategy.fetchCurrentUser()).resolves.toBeNull();
  });

  it('refreshes the session while somebody is signed in', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.viewer;
    await expect(cookieSessionStrategy.refresh()).resolves.toBeUndefined();
  });

  it('rejects the refresh with a 401 when nobody is signed in', async () => {
    await expect(cookieSessionStrategy.refresh()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });
});

describe('cookieSessionStrategy: calls that must not start a refresh of their own', () => {
  // A 401 on these would otherwise wait for the very refresh they belong to (see HttpAuthAdapter).
  it.each([
    [
      'login',
      '/auth/login',
      () => cookieSessionStrategy.login({ email: DEMO_EMAILS.viewer, password: DEMO_PASSWORD }),
    ],
    ['logout', '/auth/logout', () => cookieSessionStrategy.logout()],
    ['refresh', '/auth/refresh', () => cookieSessionStrategy.refresh()],
  ])('sends %s with skipAuthRefresh and silent', async (_name, url, run) => {
    mockDb.sessionUserId = MOCK_USER_IDS.viewer; // so that refresh succeeds

    const requests = await recordRequests(run);

    expect(requests).toMatchObject([{ url, skipAuthRefresh: true, silent: true }]);
  });
});
