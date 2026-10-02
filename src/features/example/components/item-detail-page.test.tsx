import userEvent from '@testing-library/user-event';
import { http as mock, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { formatCurrency } from '@/lib/format';
import { apiUrl } from '@/mocks/api-url';
import { server } from '@/mocks/server';
import { render, screen, waitFor, within } from '@/test/render';

import { ItemDetailPage } from './item-detail-page';
import { itemsApi } from '../api/items-api';

const renderDetail = (id: string) =>
  render(<ItemDetailPage />, {
    auth: 'admin',
    path: '/items/:itemId',
    route: `/items/${id}`,
    routes: [{ path: '/items', element: <p>Items list</p> }],
  });

describe('ItemDetailPage', () => {
  it('shows the item', async () => {
    renderDetail('item-001');
    expect(await screen.findByRole('heading', { level: 1, name: 'Desk lamp' })).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(9.5))).toBeInTheDocument();
  });

  it('handles unknown ids with a not-found state', async () => {
    renderDetail('does-not-exist');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Item not found' }),
    ).toBeInTheDocument();
    // The state's own heading says something else, so a screen reader does not hear the title twice.
    expect(
      screen.getByRole('heading', { level: 2, name: "We couldn't find that item" }),
    ).toBeInTheDocument();
  });

  it('retries after a failed load', async () => {
    server.use(
      mock.get(
        apiUrl('/items/:itemId'),
        () => HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 500 }),
        {
          once: true,
        },
      ),
    );
    const user = userEvent.setup();
    renderDetail('item-001');

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Desk lamp' })).toBeInTheDocument();
  });

  it('deletes the item and returns to the list', async () => {
    const user = userEvent.setup();
    renderDetail('item-001');

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByText('Items list')).toBeInTheDocument();
  });

  it('does not ask the server for the item it has just deleted', async () => {
    const get = vi.spyOn(itemsApi, 'get');
    const user = userEvent.setup();
    // The list is a lazy route in the app: the detail page stays on screen until its chunk has loaded.
    render(<ItemDetailPage />, {
      auth: 'admin',
      path: '/items/:itemId',
      route: '/items/item-001',
      routes: [
        {
          path: '/items',
          lazy: async () => {
            await new Promise((resolve) => setTimeout(resolve, 300));
            return { Component: () => <p>Items list</p> };
          },
        },
      ],
    });

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByText('Items list')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('disables Delete while the request runs, so a second click cannot ask again', async () => {
    let release = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = () => {
        resolve();
      };
    });
    server.use(
      mock.delete(apiUrl('/items/:itemId'), async () => {
        await held; // falls through to the real handler once released
      }),
    );
    const user = userEvent.setup();
    renderDetail('item-001');

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    });
    expect(
      within(screen.getByRole('button', { name: 'Delete' })).getByRole('status', { hidden: true }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    release();

    expect(await screen.findByText('Items list')).toBeInTheDocument();
  });
});
