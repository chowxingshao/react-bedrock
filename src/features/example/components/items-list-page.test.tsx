import userEvent from '@testing-library/user-event';
import { http as mock } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE_MS } from '@/config/constants';
import { createEnvFlagSource, getFeatureFlagSource, setFeatureFlagSource } from '@/config/features';
import { apiUrl } from '@/mocks/api-url';
import { mockDb } from '@/mocks/db';
import { server } from '@/mocks/server';
import { act, render, screen, waitFor, within } from '@/test/render';

import { ItemsListPage } from './items-list-page';

const renderList = (route = '/items', auth: 'admin' | 'viewer' = 'admin') =>
  render(<ItemsListPage />, { auth, path: '/items', route });

describe('ItemsListPage', () => {
  const originalFlags = getFeatureFlagSource();
  afterEach(() => {
    setFeatureFlagSource(originalFlags);
  });

  it('shows the first page with totals', async () => {
    renderList();
    expect(await screen.findByRole('link', { name: 'Desk lamp' })).toBeInTheDocument();
    expect(screen.getByText('25 total')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('searches once typing pauses, and keeps the search in the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderList();
    await screen.findByRole('link', { name: 'Desk lamp' });

    await user.type(screen.getByRole('searchbox', { name: 'Search items' }), 'desk');
    expect(router.state.location.search).toBe(''); // nothing is committed while typing

    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=desk');
    });
    expect(await screen.findByText('3 total')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    const { router } = renderList();
    await screen.findByRole('link', { name: 'Desk lamp' });

    await user.click(screen.getByRole('combobox', { name: 'Filter by status' }));
    await user.click(await screen.findByRole('option', { name: 'Archived' }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?status=archived');
    });
    expect(await screen.findByText('6 total')).toBeInTheDocument();
  });

  it('sorts on the server when a column header is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderList();
    await screen.findByRole('link', { name: 'Desk lamp' });

    await user.click(screen.getByRole('button', { name: /Price/ }));

    // A first click on a number column sorts descending (the TanStack default).
    await waitFor(() => {
      expect(router.state.location.search).toBe('?sort=price&order=desc');
    });
    // The previous page stays on screen until the sorted one arrives, so wait for the new first row.
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /Phone stand|Desk lamp/ })[0]).toHaveTextContent(
        'Phone stand',
      );
    });
  });

  it('pages through the results', async () => {
    const user = userEvent.setup();
    const { router } = renderList();
    await screen.findByRole('link', { name: 'Desk lamp' });

    await user.click(screen.getByRole('button', { name: 'Go to next page' }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?page=2');
    });
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('offers to clear the filters when nothing matches', async () => {
    const user = userEvent.setup();
    const { router } = renderList('/items?q=zzz');

    await user.click(await screen.findByRole('button', { name: 'Clear filters' }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(await screen.findByRole('link', { name: 'Desk lamp' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toHaveValue('');
  });

  it('cancels a pending search when the filters are cleared', async () => {
    const user = userEvent.setup();
    const { router } = renderList('/items?q=zzz');
    const clear = await screen.findByRole('button', { name: 'Clear filters' });

    await user.type(screen.getByRole('searchbox', { name: 'Search items' }), 'x');
    await user.click(clear);
    await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS + 100));

    expect(router.state.location.search).toBe('');
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toHaveValue('');
    await screen.findByText('25 total'); // finish with the requests done
  });

  it('shows a retryable error when loading fails', async () => {
    renderList('/items?q=error');
    expect(await screen.findByRole('alert')).toHaveTextContent('The server ran into a problem');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('hides the create action from read-only users', async () => {
    renderList('/items', 'viewer');
    await screen.findByRole('link', { name: 'Desk lamp' });
    expect(screen.queryByRole('link', { name: 'New item' })).not.toBeInTheDocument();
  });

  it('moves a page past the end to the last page', async () => {
    const { router } = renderList('/items?page=999');

    expect(await screen.findByText('Page 3 of 3')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=3');
    expect(await screen.findByRole('link', { name: 'Locked sample' })).toBeInTheDocument();
  });

  it('replaces a page past the end with the last page, with a skeleton (not "No items yet") meanwhile', async () => {
    let release = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = () => {
        resolve();
      };
    });
    let asked = () => undefined;
    const lastPageAsked = new Promise<void>((resolve) => {
      asked = () => {
        resolve();
      };
    });
    server.use(
      mock.get(apiUrl('/items'), async ({ request }) => {
        if (new URL(request.url).searchParams.get('page') !== '3') return;
        asked();
        await held; // falls through to the real handler once released
      }),
    );
    const { router } = renderList('/items?page=999');

    await lastPageAsked; // rendered with ?page=3 and the empty page-999 placeholder
    expect(router.state.location.search).toBe('?page=3');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.queryByText('No items yet')).not.toBeInTheDocument();
    release();
    expect(await screen.findByText('Page 3 of 3')).toBeInTheDocument();
  });

  it.each(['/items?page=0', '/items?page=abc', '/items?pageSize=7'])(
    'shows the first page for %s',
    async (route) => {
      renderList(route);
      expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
    },
  );

  it('goes back a page when the only row of the last page is deleted', async () => {
    mockDb.items = mockDb.items.slice(0, 11);
    const user = userEvent.setup();
    const { router } = renderList('/items?page=2');

    await user.click(await screen.findByRole('button', { name: 'Delete Headphones' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByText('Page 1 of 1')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('shows the search from the URL again when the browser goes back', async () => {
    const user = userEvent.setup();
    const { router } = renderList('/items?q=e');
    await user.click(await screen.findByRole('button', { name: 'Go to next page' }));
    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=e&page=2');
    });
    const box = screen.getByRole('searchbox', { name: 'Search items' });
    await user.clear(box);
    await user.type(box, 'desk');
    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=desk');
    });

    await act(() => router.navigate(-1));

    expect(router.state.location.search).toBe('?q=e');
    await waitFor(() => {
      expect(box).toHaveValue('e');
    });
  });

  it('exports the rows that are on screen', async () => {
    setFeatureFlagSource(createEnvFlagSource(['itemsExport']));
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:items');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderList('/items?page=3');
    await screen.findByText('Page 3 of 3');

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    const csv = await createObjectURL.mock.calls[0]?.[0].text();
    const names = csv?.split('\r\n').map((line) => line.split(',')[0]);
    expect(names).toEqual([
      'Name',
      'Bookshelf',
      'Filing cabinet',
      'Laptop sleeve',
      'Phone stand',
      'Locked sample',
    ]);
  });
});
