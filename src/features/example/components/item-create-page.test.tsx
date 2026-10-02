import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { notify } from '@/core/notify';
import { mockDb } from '@/mocks/db';
import { render, screen } from '@/test/render';

import { ItemCreatePage } from './item-create-page';

const renderCreate = () =>
  render(<ItemCreatePage />, {
    auth: 'admin',
    path: '/items/new',
    route: '/items/new',
    routes: [{ path: '/items/:itemId', element: <p>Detail page</p> }],
  });

describe('ItemCreatePage', () => {
  it('creates the item, confirms it and opens it', async () => {
    const success = vi.spyOn(notify, 'success');
    const user = userEvent.setup();
    renderCreate();

    await user.type(await screen.findByLabelText('Name'), 'Desk fan');
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    expect(await screen.findByText('Detail page')).toBeInTheDocument();
    expect(success).toHaveBeenCalledWith('Created Desk fan');
    expect(mockDb.items.some((item) => item.name === 'Desk fan')).toBe(true);
  });

  it('shows the server field error for a duplicate name', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.type(await screen.findByLabelText('Name'), 'Desk lamp');
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    expect(await screen.findByText('This value is already in use')).toBeInTheDocument();
  });
});
