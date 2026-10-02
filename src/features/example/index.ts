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
