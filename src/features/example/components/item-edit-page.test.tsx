import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { mockDb } from '@/mocks/db';
import { MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { act, createTestQueryClient, render, screen, waitFor } from '@/test/render';

import { ItemEditPage } from './item-edit-page';
import { itemKeys } from '../api/item-keys';
import { itemsApi } from '../api/items-api';

describe('ItemEditPage', () => {
  it('loads the item, saves changes and returns to it', async () => {
    const user = userEvent.setup();
    render(<ItemEditPage />, {
      auth: 'admin',
      path: '/items/:itemId/edit',
      route: '/items/item-001/edit',
      routes: [{ path: '/items/:itemId', element: <p>Detail page</p> }],
    });

    const name = await screen.findByLabelText('Name');
    expect(name).toHaveValue('Desk lamp');
    await user.clear(name);
    await user.type(name, 'Desk lamp XL');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Detail page')).toBeInTheDocument();
    expect(mockDb.items.find((item) => item.id === 'item-001')?.name).toBe('Desk lamp XL');
  });

  it('starts the form again when the route changes to another item', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(itemKeys.detail('item-002'), await itemsApi.get('item-002'));
    const { router } = render(<ItemEditPage />, {
      auth: 'admin',
      queryClient,
      path: '/items/:itemId/edit',
      route: '/items/item-001/edit',
    });
    expect(await screen.findByLabelText('Name')).toHaveValue('Desk lamp');

    await act(() => router.navigate('/items/item-002/edit'));

    // The page header and the form both come from item-002; a form that kept its state would still
    // hold the first item's values, and saving would write them to the second item.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit Notebook A5' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Name')).toHaveValue('Notebook A5');
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
    });
  });

  it('shows the not-found state for an item that does not exist', async () => {
    render(<ItemEditPage />, {
      auth: 'admin',
      path: '/items/:itemId/edit',
      route: '/items/nope/edit',
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Item not found' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });
});
