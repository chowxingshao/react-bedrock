import { type QueryKey, useMutation } from '@tanstack/react-query';

import { itemKeys } from '../api/item-keys';
import { itemsApi } from '../api/items-api';
import type { ItemFormValues } from '../schemas/item';
import type { ItemList } from '../types/item';

export function useCreateItem() {
  return useMutation({
    mutationFn: (input: ItemFormValues) => itemsApi.create(input),
    meta: { silent: true }, // the form shows field errors, or its own toast
    onSuccess: (item, _input, _result, context) => {
      context.client.setQueryData(itemKeys.detail(item.id), item);
      return context.client.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

export function useUpdateItem(id: string) {
  return useMutation({
    mutationFn: (input: ItemFormValues) => itemsApi.update(id, input),
    meta: { silent: true },
    onSuccess: (item, _input, _result, context) => {
      context.client.setQueryData(itemKeys.detail(item.id), item);
      return context.client.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

interface DeleteSnapshot {
  lists: [QueryKey, ItemList | undefined][];
}

/**
 * Optimistic delete (spec §8): the item disappears from every cached list at once and comes back if
 * the server refuses. The global mutation toast explains why (e.g. errors:codes.ITEM_LOCKED).
 */
export function useDeleteItem() {
  return useMutation({
    mutationFn: (id: string) => itemsApi.remove(id),
    onMutate: async (id, context): Promise<DeleteSnapshot> => {
      await context.client.cancelQueries({ queryKey: itemKeys.lists() });
      const lists = context.client.getQueriesData<ItemList>({ queryKey: itemKeys.lists() });
      context.client.setQueriesData<ItemList>({ queryKey: itemKeys.lists() }, (list) =>
        list
          ? {
              ...list,
              items: list.items.filter((item) => item.id !== id),
              total: Math.max(0, list.total - 1),
            }
          : list,
      );
      return { lists };
    },
    onError: (_error, _id, snapshot, context) => {
      for (const [key, data] of snapshot?.lists ?? []) context.client.setQueryData(key, data);
    },
    onSuccess: (_data, id, _snapshot, context) => {
      // A detail page that is open right now (delete from its header) must not refetch the item it just
      // deleted: that is a 404 and a flash of "not found" before it navigates away. So an observed query
      // is only marked stale (a later visit refetches); one nobody watches is dropped.
      context.client.removeQueries({ queryKey: itemKeys.detail(id), type: 'inactive' });
      return context.client.invalidateQueries({
        queryKey: itemKeys.detail(id),
        refetchType: 'none',
      });
    },
    onSettled: (_data, _error, _id, _snapshot, context) =>
      context.client.invalidateQueries({ queryKey: itemKeys.lists() }),
  });
}
