import { http as mock } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiUrl } from '@/mocks/api-url';
import { mockDb } from '@/mocks/db';
import { MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { server } from '@/mocks/server';
import { createTestQueryClient, renderHook, waitFor } from '@/test/render';

import { useItem } from './use-item';
import { useCreateItem, useDeleteItem } from './use-item-mutations';
import { itemKeys } from '../api/item-keys';
import { itemsApi } from '../api/items-api';
import type { ItemList } from '../types/item';

const params = { page: 1, pageSize: 50 };
const hasItem = (list: ItemList | undefined, id: string) =>
  list?.items.some((item) => item.id === id);

/**
 * Holds DELETE requests until the returned function is called. The mock API answers in about 25 ms,
 * faster than the 50 ms poll of `waitFor`, so the optimistic state could not be seen otherwise. The
 * held resolver then returns nothing, so the real handler answers.
 */
function holdDeletes(): () => void {
  let release = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = () => {
      resolve();
    };
  });
  server.use(
    mock.delete(apiUrl('/items/:itemId'), async () => {
      await held;
    }),
  );
  return release;
}

describe('item mutations', () => {
  beforeEach(() => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
  });

  it('delete removes the item optimistically and rolls back when the server refuses', async () => {
    const release = holdDeletes();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(itemKeys.list(params), await itemsApi.list(params));
    const { result } = renderHook(() => useDeleteItem(), { queryClient });

    const deletion = result.current.mutateAsync('item-locked');
    const refused = expect(deletion).rejects.toMatchObject({ code: 'ITEM_LOCKED', status: 409 });
    await waitFor(() => {
      expect(hasItem(queryClient.getQueryData(itemKeys.list(params)), 'item-locked')).toBe(false);
    });
    release();

    await refused;
    expect(hasItem(queryClient.getQueryData(itemKeys.list(params)), 'item-locked')).toBe(true);
  });

  it('delete updates and restores every cached list, not only the current one', async () => {
    const release = holdDeletes();
    const queryClient = createTestQueryClient();
    const filtered = { ...params, q: 'lock' };
    queryClient.setQueryData(itemKeys.list(params), await itemsApi.list(params));
    queryClient.setQueryData(itemKeys.list(filtered), await itemsApi.list(filtered));
    const { result } = renderHook(() => useDeleteItem(), { queryClient });

    const deletion = result.current.mutateAsync('item-locked');
    const refused = expect(deletion).rejects.toMatchObject({ code: 'ITEM_LOCKED' });
    await waitFor(() => {
      expect(hasItem(queryClient.getQueryData(itemKeys.list(params)), 'item-locked')).toBe(false);
      expect(hasItem(queryClient.getQueryData(itemKeys.list(filtered)), 'item-locked')).toBe(false);
    });
    release();

    await refused;
    expect(hasItem(queryClient.getQueryData(itemKeys.list(params)), 'item-locked')).toBe(true);
    expect(hasItem(queryClient.getQueryData(itemKeys.list(filtered)), 'item-locked')).toBe(true);
  });

  it('delete keeps the item removed when the server agrees', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(itemKeys.list(params), await itemsApi.list(params));
    const { result } = renderHook(() => useDeleteItem(), { queryClient });

    await result.current.mutateAsync('item-001');

    expect(hasItem(queryClient.getQueryData(itemKeys.list(params)), 'item-001')).toBe(false);
    expect(mockDb.items.some((item) => item.id === 'item-001')).toBe(false);
  });

  it('delete marks an observed detail query stale without refetching it, and drops an unobserved one', async () => {
    const get = vi.spyOn(itemsApi, 'get');
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(itemKeys.detail('item-002'), await itemsApi.get('item-002'));
    get.mockClear();
    const { result } = renderHook(
      () => ({ detail: useItem('item-001'), remove: useDeleteItem() }),
      {
        queryClient,
      },
    );
    await waitFor(() => {
      expect(result.current.detail.isSuccess).toBe(true);
    });

    await result.current.remove.mutateAsync('item-001');
    await result.current.remove.mutateAsync('item-002');

    await waitFor(() => {
      expect(result.current.remove.isSuccess).toBe(true);
    });
    expect(get).toHaveBeenCalledTimes(1); // the observer's own first load, and no refetch of a 404
    expect(result.current.detail.data).toMatchObject({ id: 'item-001' });
    expect(queryClient.getQueryState(itemKeys.detail('item-001'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(itemKeys.detail('item-002'))).toBeUndefined();
  });

  it('create seeds the detail cache with the new item', async () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useCreateItem(), { queryClient });

    const item = await result.current.mutateAsync({
      name: 'Fresh item',
      description: '',
      status: 'active',
      price: 3,
      quantity: 2,
    });

    expect(queryClient.getQueryData(itemKeys.detail(item.id))).toEqual(item);
  });
});
