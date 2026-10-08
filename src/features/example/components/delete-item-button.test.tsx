import userEvent from '@testing-library/user-event';
import { http as mock } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { notify } from '@/core/notify';
import { apiUrl } from '@/mocks/api-url';
import { mockDb } from '@/mocks/db';
import { MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { server } from '@/mocks/server';
import { act, render, screen, waitFor, within } from '@/test/render';

import { DeleteItemButton } from './delete-item-button';

describe('DeleteItemButton', () => {
  beforeEach(() => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
  });

  it('asks first, then deletes and reports success', async () => {
    const onDeleted = vi.fn();
    const success = vi.spyOn(notify, 'success');
    const user = userEvent.setup();
    render(<DeleteItemButton item={{ id: 'item-001', name: 'Desk lamp' }} onDeleted={onDeleted} />);

    await user.click(screen.getByRole('button', { name: 'Delete Desk lamp' }));
    expect(
      await screen.findByRole('alertdialog', { name: 'Delete Desk lamp?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });
    expect(success).toHaveBeenCalledWith('Deleted Desk lamp');
    expect(mockDb.items.some((item) => item.id === 'item-001')).toBe(false);
  });

  it('says so, and gives focus back to the button, when the server refuses the delete', async () => {
    // The server takes a moment: the dialog is gone, and the button disabled, before it refuses.
    let release = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = () => {
        resolve();
      };
    });
    server.use(
      mock.delete(apiUrl('/items/:itemId'), async () => {
        await held; // falls through to the real handler, which refuses item-locked
      }),
    );
    const onDeleted = vi.fn();
    const onRefused = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteItemButton
        item={{ id: 'item-locked', name: 'Locked sample' }}
        variant="button"
        onDeleted={onDeleted}
        onRefused={onRefused}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    });
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    // Radix gives focus back on a timer: wait past it.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    // A browser drops focus from a button that is disabled while it has it; jsdom keeps it there. Do what the
    // browser does: focus lands on the body.
    const stray = document.body.appendChild(document.createElement('button'));
    stray.focus();
    stray.remove();
    expect(document.body).toHaveFocus();
    release();

    await waitFor(() => {
      expect(onRefused).toHaveBeenCalledTimes(1);
    });
    expect(onDeleted).not.toHaveBeenCalled();
    // The button was disabled while the request ran, so the dialog could not give focus back to it.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
    });
  });

  it('does nothing when the user cancels', async () => {
    const user = userEvent.setup();
    render(<DeleteItemButton item={{ id: 'item-001', name: 'Desk lamp' }} />);

    await user.click(screen.getByRole('button', { name: 'Delete Desk lamp' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(mockDb.items.some((item) => item.id === 'item-001')).toBe(true);
  });
});
