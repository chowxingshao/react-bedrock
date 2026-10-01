import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  it('shows the user and signs out to the login page', async () => {
    const user = userEvent.setup();
    render(<UserMenu />, {
      auth: 'admin',
      routes: [{ path: '/login', element: <p>Login page</p> }],
    });

    await user.click(await screen.findByRole('button', { name: 'Open user menu' }));
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
});
