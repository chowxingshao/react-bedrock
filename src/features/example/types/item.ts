export const ITEM_STATUSES = ['draft', 'active', 'archived'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Fields the list can be sorted by (server-side). */
export const ITEM_SORT_FIELDS = ['name', 'price', 'quantity', 'updatedAt'] as const;
export type ItemSortField = (typeof ITEM_SORT_FIELDS)[number];

export interface Item {
  id: string;
  name: string;
  description: string;
  status: ItemStatus;
  /** In major units of VITE_DEFAULT_CURRENCY (e.g. 19.99). */
  price: number;
  quantity: number;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601. */
  updatedAt: string;
}

export interface ItemList {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ItemListParams {
  /** 1-based. */
  page: number;
  pageSize: number;
  q?: string;
  status?: ItemStatus;
  sort?: ItemSortField;
  order?: 'asc' | 'desc';
}
