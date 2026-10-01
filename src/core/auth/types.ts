import type { HttpAuthAdapter } from '@/core/api';
import type { SessionUser } from '@/stores/session-store';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * How the app authenticates (spec §7.2). Switching (e.g. to bearer tokens) means writing a new
 * implementation and changing the single export in strategy.ts. Nothing else changes.
 */
export interface AuthStrategy {
  /** Signs in and returns the user. Rejects with an AppError (401 = wrong credentials). */
  login: (credentials: LoginCredentials) => Promise<SessionUser>;
  logout: () => Promise<void>;
  /** The current user, or null when nobody is signed in. */
  fetchCurrentUser: () => Promise<SessionUser | null>;
  /** Renews the session after a 401 (called by the HTTP layer, once for concurrent requests). */
  refresh: () => Promise<void>;
  /** Adds credentials to every API request. */
  prepareRequest: HttpAuthAdapter['prepareRequest'];
}
