import { useQuery } from '@tanstack/react-query';

import { itemListQuery } from '../api/item-queries';
import type { ItemListParams } from '../types/item';

export function useItems(params: ItemListParams) {
  return useQuery(itemListQuery(params));
}
