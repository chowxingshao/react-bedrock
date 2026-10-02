import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo } from 'react';

import { PageLoader } from '@/components/feedback';
import type { Permission } from '@/config/permissions';
import { registerHttpAuth, toAppError } from '@/core/api';
import { i18n } from '@/core/i18n';
import { logger } from '@/core/logger';
import { notify } from '@/core/notify';
import { sessionStore } from '@/core/storage';
import { useSessionStatus, useSessionStore, useSessionUser } from '@/stores/session-store';

import { AuthContext, type AuthContextValue } from './auth-context';
import { authStrategy } from './strategy';
import type { AuthStrategy, LoginCredentials } from './types';

interface AuthProviderProps {
  children: ReactNode;
  /** Defaults to the app's strategy; tests and stories can pass another. */
  strategy?: AuthStrategy;
}

/** Owns the session (spec §7.2): bootstraps it, wires the HTTP layer, logs in and out. */
export function AuthProvider({ children, strategy = authStrategy }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const user = useSessionUser();
  const status = useSessionStatus();

  // Everything tied to the signed-in user goes when the session ends. Concurrent requests that fail
  // together each report the expiry, so a second call finds the session already gone and does nothing.
  const endSession = useCallback(() => {
    if (useSessionStore.getState().status === 'anonymous') return;
    useSessionStore.getState().clear();
    queryClient.clear();
    sessionStore.clear();
    logger.setUser(null);
  }, [queryClient]);

  useEffect(
    () =>
      registerHttpAuth({
        prepareRequest: strategy.prepareRequest,
        refresh: strategy.refresh,
        onSessionExpired: endSession,
      }),
    [strategy, endSession],
  );

  // Bootstrap: is somebody already signed in (the session cookie survives reloads)?
  useEffect(() => {
    let cancelled = false;
    strategy
      .fetchCurrentUser()
      .then((current) => {
        if (cancelled) return;
        if (current) {
          useSessionStore.getState().setUser(current);
          logger.setUser(current.id);
        } else {
          useSessionStore.getState().clear();
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        logger.error('Could not restore the session', { error });
        useSessionStore.getState().clear();
      });
    return () => {
      cancelled = true;
    };
  }, [strategy]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const signedIn = await strategy.login(credentials);
      queryClient.clear(); // nothing cached from a previous user may leak into this session
      useSessionStore.getState().setUser(signedIn);
      logger.setUser(signedIn.id);
      return signedIn;
    },
    [strategy, queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await strategy.logout();
    } catch (error) {
      // The server could not be told, but this browser must still forget the user. `toAppError`, never
      // the raw error: an Axios error carries the request.
      logger.warn('Sign-out request failed; the local session was cleared anyway', {
        error: toAppError(error),
      });
      // The httpOnly session cookie is still valid on the server (only the app forgot the user), so a
      // reload would sign them back in: say so.
      notify.warning(i18n.t('auth.signOutIncomplete'));
    } finally {
      endSession();
    }
  }, [strategy, endSession]);

  const hasPermission = useCallback(
    (permission: Permission) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'unknown',
      login,
      logout,
      hasPermission,
    }),
    [user, status, login, logout, hasPermission],
  );

  if (status === 'unknown') return <PageLoader variant="page" />;
  return <AuthContext value={value}>{children}</AuthContext>;
}
