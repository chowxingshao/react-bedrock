import type { ReactNode } from 'react';

import type { Permission } from '@/config/permissions';

import { useAuth } from './use-auth';

interface CanProps {
  permission: Permission;
  children: ReactNode;
  /** Rendered when the permission is missing (default: nothing). */
  fallback?: ReactNode;
}

/** Conditional rendering by permission: <Can permission="items.create"><CreateButton /></Can> (spec §7.9). */
export function Can({ permission, children, fallback = null }: CanProps) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? children : fallback;
}
