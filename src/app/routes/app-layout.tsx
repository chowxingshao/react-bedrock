import { Outlet } from 'react-router';

import { AppShell } from '@/components/layout';
import { RequireAuth } from '@/core/auth';

import { navigation } from '../navigation';

/** Signed-in pages, inside the app shell. Page errors are caught below it (see PageBoundary). */
export function Component() {
  return (
    <RequireAuth>
      <AppShell navItems={navigation}>
        <Outlet />
      </AppShell>
    </RequireAuth>
  );
}
