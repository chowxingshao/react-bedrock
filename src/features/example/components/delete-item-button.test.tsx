import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { notify } from '@/core/notify';
import { mockDb } from '@/mocks/db';
import { MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { render, screen, waitFor } from '@/test/render';

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

  it('does nothing when the user cancels', async () => {
    const user = userEvent.setup();
    render(<DeleteItemButton item={{ id: 'item-001', name: 'Desk lamp' }} />);

    await user.click(screen.getByRole('button', { name: 'Delete Desk lamp' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(mockDb.items.some((item) => item.id === 'item-001')).toBe(true);
  });
});
