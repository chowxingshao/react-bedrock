import type { ItemListParams } from '../types/item';

/** Query keys for this feature (spec §6.2). Invalidate broadly with `itemKeys.lists()`. */
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (params: ItemListParams) => [...itemKeys.lists(), params] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};
