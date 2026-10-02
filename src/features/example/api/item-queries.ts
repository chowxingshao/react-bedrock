import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { itemKeys } from './item-keys';
import { itemsApi } from './items-api';
import type { ItemListParams } from '../types/item';

export const itemListQuery = (params: ItemListParams) =>
  queryOptions({
    queryKey: itemKeys.list(params),
    queryFn: ({ signal }) => itemsApi.list(params, signal),
    placeholderData: keepPreviousData, // keep the current page on screen while the next one loads
  });

export const itemDetailQuery = (id: string) =>
  queryOptions({
    queryKey: itemKeys.detail(id),
    queryFn: ({ signal }) => itemsApi.get(id, signal),
  });
