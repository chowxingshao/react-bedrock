import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Dashboard, Package } from '@/components/ui/icons';
import { useUiStore } from '@/stores/ui-store';
import { act, render, screen, waitFor, within } from '@/test/render';

import { AppShell } from './app-shell';
import type { NavItem } from './nav-types';

const NAV: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: Dashboard, to: '/dashboard', end: true },
  { labelKey: 'nav.items', icon: Package, to: '/items', permission: 'items.delete' },
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

  it('keeps the desktop sidebar in view while the page scrolls', async () => {
    renderShell('admin');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });

    // A sticky column as tall as the viewport (and scrollable itself), so a long page never scrolls it away.
    expect(nav.closest('aside')).toHaveClass(
      'md:sticky',
      'md:top-0',
      'md:h-svh',
      'md:overflow-y-auto',
    );
  });

  it('collapses the desktop sidebar', async () => {
    const user = userEvent.setup();
    renderShell('admin');

    await user.click(await screen.findByRole('button', { name: 'Collapse sidebar' }));

    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });
});

describe('AppShell mobile navigation', () => {
  const closeWithEscape = (user: UserEvent) => user.keyboard('{Escape}');
  const closeWithButton = (user: UserEvent) =>
    user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));

  it.each([
    ['Escape', closeWithEscape],
    ['the close button', closeWithButton],
  ])('opens a named dialog and returns focus to the open button on %s', async (_name, close) => {
    const user = userEvent.setup();
    renderShell('admin');
    const openButton = await screen.findByRole('button', { name: 'Open navigation' });

    await user.click(openButton);
    expect(await screen.findByRole('dialog', { name: 'Main navigation' })).toBeInTheDocument();
    await close(user);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    // Radix restores focus on a timer.
    await waitFor(() => {
      expect(openButton).toHaveFocus();
    });
  });

  it.each([
    ['the current route', 'Dashboard'],
    ['another route', 'Items'],
  ])(
    'closes on a click on the link to %s and leaves focus for the new page',
    async (_name, linkName) => {
      const user = userEvent.setup();
      renderShell('admin');
      const openButton = await screen.findByRole('button', { name: 'Open navigation' });

      await user.click(openButton);
      const dialog = await screen.findByRole('dialog', { name: 'Main navigation' });
      await user.click(within(dialog).getByRole('link', { name: linkName }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      // Give Radix's focus-restore timer the chance to run: it must not take focus from the page.
      await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
      expect(openButton).not.toHaveFocus();
      expect(document.activeElement).toBe(document.body);
    },
  );

  it('stays open on a modified click, which opens the link in another tab', async () => {
    // The browser opens the link in a new tab; jsdom cannot, and would log "Not implemented: navigation".
    const modifiedClicks: boolean[] = [];
    const swallowDefault = (event: MouseEvent) => {
      modifiedClicks.push(event.ctrlKey);
      event.preventDefault();
    };
    document.addEventListener('click', swallowDefault);
    const user = userEvent.setup();
    renderShell('admin');

    await user.click(await screen.findByRole('button', { name: 'Open navigation' }));
    const dialog = await screen.findByRole('dialog', { name: 'Main navigation' });
    await user.keyboard('{Control>}');
    await user.click(within(dialog).getByRole('link', { name: 'Items' }));
    await user.keyboard('{/Control}');
    document.removeEventListener('click', swallowDefault);

    // Closing is asynchronous (Radix animates it): wait past that before asserting that nothing happened.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(modifiedClicks).toContain(true); // the Ctrl-click reached the link
    expect(screen.getByRole('dialog', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('closes when the viewport grows past the md breakpoint', async () => {
    let wide = false;
    const listeners = new Set<() => void>();
    const original = window.matchMedia.bind(window);
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      if (!query.includes('min-width')) return original(query);
      return {
        media: query,
        get matches() {
          return wide;
        },
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
      } as unknown as MediaQueryList;
    });
    const user = userEvent.setup();
    renderShell('admin');

    await user.click(await screen.findByRole('button', { name: 'Open navigation' }));
    expect(await screen.findByRole('dialog', { name: 'Main navigation' })).toBeInTheDocument();
    act(() => {
      wide = true;
      listeners.forEach((listener) => {
        listener();
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(useUiStore.getState().mobileNavOpen).toBe(false);
  });
});
