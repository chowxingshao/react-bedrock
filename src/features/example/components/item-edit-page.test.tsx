import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { mockDb } from '@/mocks/db';
import { render, screen } from '@/test/render';

import { ItemEditPage } from './item-edit-page';

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
