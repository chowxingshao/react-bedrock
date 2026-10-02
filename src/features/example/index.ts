/**
 * Public API of the reference feature. Other code imports ONLY from '@/features/example'
 * (ESLint forbids '@/features/example/*'). The one exception is `src/mocks/**`, which reads the
 * feature's `schemas/` and `types/` files directly (the `featureInternals` override in
 * `eslint.config.js`): the test setup loads every mock handler, and this index also exports the
 * pages, which would then load the whole UI into every test file.
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
export { ItemCreatePage } from './components/item-create-page';
export { ItemDetailPage } from './components/item-detail-page';
export { ItemEditPage } from './components/item-edit-page';
export { ItemsListPage } from './components/items-list-page';
