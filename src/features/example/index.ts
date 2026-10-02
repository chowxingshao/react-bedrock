/**
 * Public API of the reference feature. Other code imports ONLY from '@/features/example'
 * (ESLint forbids '@/features/example/*').
 */
export {
  ITEM_FORM_DEFAULTS,
  itemFormSchema,
  itemListSchema,
  itemSchema,
  type ItemFormValues,
} from './schemas/item';
export {
  ITEM_SORT_FIELDS,
  ITEM_STATUSES,
  type Item,
  type ItemList,
  type ItemListParams,
  type ItemSortField,
  type ItemStatus,
} from './types/item';

export { itemKeys } from './api/item-keys';
export { itemDetailQuery, itemListQuery } from './api/item-queries';
export { itemsApi } from './api/items-api';
export { useItem } from './hooks/use-item';
export { useCreateItem, useDeleteItem, useUpdateItem } from './hooks/use-item-mutations';
export { useItems } from './hooks/use-items';
