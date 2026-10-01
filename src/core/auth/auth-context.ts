import { createContext } from 'react';

import type { Permission } from '@/config/permissions';
import type { SessionUser } from '@/stores/session-store';

import type { LoginCredentials } from './types';

export interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  /** True until the bootstrap `/auth/me` call settles. */
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<SessionUser>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
