import userEvent from '@testing-library/user-event';
import { LayoutDashboardIcon, PackageIcon } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { useUiStore } from '@/stores/ui-store';
import { render, screen, within } from '@/test/render';

import { AppShell } from './app-shell';
import type { NavItem } from './nav-types';

const NAV: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboardIcon, to: '/dashboard', end: true },
  { labelKey: 'nav.items', icon: PackageIcon, to: '/items', permission: 'items.delete' },
];

const renderShell = (auth: 'admin' | 'viewer') =>
  render(
    <AppShell navItems={NAV}>
      <p>Page content</p>
    </AppShell>,
    { auth, route: '/dashboard' },
  );

describe('AppShell', () => {
  it('renders the page with a skip link, navigation and footer', async () => {
    renderShell('admin');

    expect(await screen.findByText('Page content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByText(/^Version /)).toBeInTheDocument();
  });

  it('hides links the user has no permission for', async () => {
    renderShell('viewer');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });

    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).queryByRole('link', { name: 'Items' })).not.toBeInTheDocument();
  });

  it('opens the mobile navigation sheet and collapses the desktop sidebar', async () => {
    const user = userEvent.setup();
    renderShell('admin');

    await user.click(await screen.findByRole('button', { name: 'Open navigation' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });
});
