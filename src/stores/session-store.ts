import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { env } from '@/config/env';
import type { Permission } from '@/config/permissions';

/** The signed-in user as the auth layer knows it. Never persisted (it contains personal data). */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  permissions: readonly Permission[];
}

/** Starts `unknown`; the auth layer's bootstrap `/auth/me` call is meant to settle it. */
export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  setUser: (user: SessionUser) => void;
  clear: () => void;
}

/**
 * Session identity (spec §6.4): who is signed in and what they may do. Once the auth layer exists it
 * is meant to set this after `/auth/me` or login and clear it on logout or expiry. It lives in
 * memory only; on reload the httpOnly session cookie is meant to restore it through `/auth/me`.
 * This is session state, not cached query data.
 */
export const useSessionStore = create<SessionState>()(
  devtools(
    (set) => ({
      status: 'unknown',
      user: null,
      setUser: (user) => {
        set({ status: 'authenticated', user }, undefined, 'session/setUser');
      },
      clear: () => {
        set({ status: 'anonymous', user: null }, undefined, 'session/clear');
      },
    }),
    { name: 'session-store', enabled: env.isDev && !env.isTest },
  ),
);

const NO_PERMISSIONS: readonly Permission[] = [];

export const useSessionUser = () => useSessionStore((state) => state.user);
export const useSessionStatus = () => useSessionStore((state) => state.status);
export const usePermissions = () =>
  useSessionStore((state) => state.user?.permissions ?? NO_PERMISSIONS);
