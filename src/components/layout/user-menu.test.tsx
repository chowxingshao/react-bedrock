import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useSessionStore } from '@/stores/session-store';
import { render, screen, within } from '@/test/render';

import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  it('shows the user and signs out to the login page', async () => {
    const user = userEvent.setup();
    const { router } = render(<UserMenu />, {
      auth: 'admin',
      routes: [{ path: '/login', element: <p>Login page</p> }],
    });

    await user.click(await screen.findByRole('button', { name: 'Open user menu for Alex Admin' }));
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(useSessionStore.getState().status).toBe('authenticated');
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    // The session is really gone, and the sign-out replaced the history entry (no way back to the app).
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('names the button after the visible user name (label in name)', async () => {
    render(<UserMenu />, { auth: 'admin' });

    const button = await screen.findByRole('button', { name: /^Open user menu/ });
    const visibleLabel = within(button).getByText('Alex Admin').textContent;

    expect(button).toHaveAccessibleName(expect.stringContaining(visibleLabel));
  });
});
