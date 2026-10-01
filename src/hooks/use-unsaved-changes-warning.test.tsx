import userEvent from '@testing-library/user-event';
import { Link } from 'react-router';
import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { useUnsavedChangesWarning } from './use-unsaved-changes-warning';

function EditPage({ dirty }: { dirty: boolean }) {
  useUnsavedChangesWarning(dirty);
  return (
    <>
      <Link to="/elsewhere">Go elsewhere</Link>
      <Link to="?tab=notes">Notes tab</Link>
    </>
  );
}

const routes = [{ path: '/elsewhere', element: <p>Elsewhere</p> }];

describe('useUnsavedChangesWarning', () => {
  it('asks before leaving; Stay keeps the page, Leave navigates', async () => {
    const user = userEvent.setup();
    render(<EditPage dirty />, { path: '/edit', route: '/edit', routes });

    await user.click(screen.getByRole('link', { name: 'Go elsewhere' }));
    expect(
      await screen.findByRole('alertdialog', { name: 'Leave this page?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.queryByText('Elsewhere')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Go elsewhere' }));
    await user.click(await screen.findByRole('button', { name: 'Leave' }));
    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
  });

  it('does nothing without unsaved changes', async () => {
    const user = userEvent.setup();
    render(<EditPage dirty={false} />, { path: '/edit', route: '/edit', routes });

    await user.click(screen.getByRole('link', { name: 'Go elsewhere' }));

    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
  });

  it('lets a change that keeps the same path through, such as a tab in the query string', async () => {
    const user = userEvent.setup();
    const { router } = render(<EditPage dirty />, { path: '/edit', route: '/edit', routes });

    await user.click(screen.getByRole('link', { name: 'Notes tab' }));

    expect(router.state.location.search).toBe('?tab=notes');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks the browser to confirm closing or reloading the tab only while there are changes', () => {
    const { rerender } = render(<EditPage dirty />, { path: '/edit', route: '/edit', routes });

    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);

    rerender(<EditPage dirty={false} />);

    const cleanEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);
  });
});
