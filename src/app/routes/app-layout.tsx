import { Outlet, useLocation } from 'react-router';

import { AsyncBoundary } from '@/components/feedback';
import { AppShell } from '@/components/layout';
import { RequireAuth } from '@/core/auth';

import { navigation } from '../navigation';

/** Signed-in pages, inside the app shell. The boundary catches suspense queries and resets on navigation. */
export function Component() {
  const { pathname } = useLocation();
  return (
    <RequireAuth>
      <AppShell navItems={navigation}>
        <AsyncBoundary resetKeys={[pathname]}>
          <Outlet />
        </AsyncBoundary>
      </AppShell>
    </RequireAuth>
  );
}
