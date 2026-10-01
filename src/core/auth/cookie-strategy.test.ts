import { http as mock, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl } from '@/mocks/api-url';
import { mockDb } from '@/mocks/db';
import { DEMO_PASSWORD, MOCK_USER_IDS } from '@/mocks/fixtures/users';
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
