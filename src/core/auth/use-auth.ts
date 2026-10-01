import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from './auth-context';

/** Current user, auth status and actions (spec §7.2). */
export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);
  if (!auth)
    throw new Error('useAuth must be used inside <AuthProvider> (see src/app/providers.tsx)');
  return auth;
}
