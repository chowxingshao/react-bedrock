import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';

import { ForbiddenState } from '@/components/feedback';
import { paths } from '@/config/paths';
import type { Permission } from '@/config/permissions';

import { safeReturnTo } from './return-to';
import { useAuth } from './use-auth';

/** Sends signed-out users to login, and back here afterwards (spec §7.1). */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={paths.login(returnTo)} replace />;
  }
  return children ?? <Outlet />;
}

/** Sends signed-in users away from login and similar pages. */
export function RequireGuest({ children }: { children?: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  if (isAuthenticated) return <Navigate to={safeReturnTo(searchParams.get('returnTo'))} replace />;
  return children ?? <Outlet />;
}

/**
 * Renders a 403 view when the user lacks `permission`. The view takes the place of the whole page, so its
 * title is the page's h1.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children?: ReactNode;
}) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <ForbiddenState headingLevel={1} />;
  return children ?? <Outlet />;
}
