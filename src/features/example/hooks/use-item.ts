import { useQuery } from '@tanstack/react-query';

import { itemDetailQuery } from '../api/item-queries';

export function useItem(id: string) {
  return useQuery(itemDetailQuery(id));
}
