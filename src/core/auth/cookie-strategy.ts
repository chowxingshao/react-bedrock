import { z } from 'zod';

import { type Permission, PERMISSIONS } from '@/config/permissions';
import { http, isAppError } from '@/core/api';
import type { SessionUser } from '@/stores/session-store';

import type { AuthStrategy } from './types';

const isPermission = (value: string): value is Permission =>
  (PERMISSIONS as readonly string[]).includes(value);

/** Validates the user at the boundary (spec Principle 6). Unknown permissions are ignored, not fatal. */
const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  permissions: z.array(z.string()).transform((list) => list.filter(isPermission)),
});

const toSessionUser = (data: unknown): SessionUser => sessionUserSchema.parse(data);

/**
 * httpOnly-cookie session (owner decision 1): the server sets the session cookie and the browser
 * attaches it. The frontend never sees a token.
 */
export const cookieSessionStrategy: AuthStrategy = {
  async login(credentials) {
    const { data } = await http.post<unknown>('/auth/login', credentials, {
      skipAuthRefresh: true,
      silent: true,
    });
    return toSessionUser(data);
  },

  async logout() {
    await http.post('/auth/logout', undefined, { skipAuthRefresh: true, silent: true });
  },

  async fetchCurrentUser() {
    try {
      const { data } = await http.get<unknown>('/auth/me', { silent: true });
      return toSessionUser(data);
    } catch (error) {
      if (isAppError(error) && error.status === 401) return null;
      throw error;
    }
  },

  async refresh() {
    await http.post('/auth/refresh', undefined, { skipAuthRefresh: true, silent: true });
  },

  prepareRequest(config) {
    // Needed for a cross-origin API; harmless on the same-origin /api proxy.
    config.withCredentials = true;
    return config;
  },
};
