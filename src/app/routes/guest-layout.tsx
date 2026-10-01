import { Outlet } from 'react-router';

import { AuthLayout } from '@/components/layout';
import { RequireGuest } from '@/core/auth';

/** Pages for signed-out users (login and similar), in the centred auth layout. */
export function Component() {
  return (
    <RequireGuest>
      <AuthLayout>
        <Outlet />
      </AuthLayout>
    </RequireGuest>
  );
}
