import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';

import { apiUrl } from '../api-url';
import { mockDb } from '../db';
import { MOCK_USERS, type MockUser } from '../fixtures/users';

/** The mock session cookie. Real backends use an httpOnly cookie that JavaScript can't read. */
export const MOCK_SESSION_COOKIE = 'mock_session';

const credentialsSchema = z.object({ email: z.string(), password: z.string() });

const publicUser = ({ id, name, email, permissions }: MockUser) => ({
  id,
  name,
  email,
  permissions,
});

/** The signed-in mock user, from the cookie (browser) or the in-memory session (jsdom). */
export function findSessionUser(cookies: Record<string, string>): MockUser | undefined {
  const id = cookies[MOCK_SESSION_COOKIE] ?? mockDb.sessionUserId;
  return MOCK_USERS.find((user) => user.id === id);
}

export const authHandlers = [
  http.post(apiUrl('/auth/login'), async ({ request }) => {
    await delay();
    const credentials = credentialsSchema.safeParse(await request.json());
    const user = credentials.success
      ? MOCK_USERS.find(
          (candidate) =>
            candidate.email === credentials.data.email.trim().toLowerCase() &&
            candidate.password === credentials.data.password,
        )
      : undefined;
    if (!user) return HttpResponse.json({ code: 'INVALID_CREDENTIALS' }, { status: 401 });

    mockDb.sessionUserId = user.id;
    return HttpResponse.json(publicUser(user), {
      headers: { 'Set-Cookie': `${MOCK_SESSION_COOKIE}=${user.id}; Path=/; SameSite=Lax` },
    });
  }),

  http.post(apiUrl('/auth/logout'), async () => {
    await delay();
    mockDb.sessionUserId = null;
    return new HttpResponse(null, {
      status: 204,
      headers: { 'Set-Cookie': `${MOCK_SESSION_COOKIE}=; Path=/; Max-Age=0` },
    });
  }),

  http.get(apiUrl('/auth/me'), async ({ cookies }) => {
    await delay();
    const user = findSessionUser(cookies);
    return user
      ? HttpResponse.json(publicUser(user))
      : HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }),

  http.post(apiUrl('/auth/refresh'), async ({ cookies }) => {
    await delay();
    return findSessionUser(cookies)
      ? new HttpResponse(null, { status: 204 })
      : HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }),
];
