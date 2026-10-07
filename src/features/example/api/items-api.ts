import { http } from '@/core/api';

import { itemListSchema, itemSchema, type ItemFormValues } from '../schemas/item';
import type { Item, ItemList, ItemListParams } from '../types/item';

/** Only parameters that are actually set go into the query string. */
function toQuery(params: ItemListParams): Record<string, number | string> {
  return Object.fromEntries(
    Object.entries(params).filter(
      (entry): entry is [string, number | string] => entry[1] !== undefined && entry[1] !== '',
    ),
  );
}

const segment = (id: string) => encodeURIComponent(id);

/**
 * Hand-written service: the pattern for backends without an OpenAPI spec (docs/api-codegen.md shows the
 * generated alternative). Every response is validated, so contract drift fails here, loudly.
 */
export const itemsApi = {
  async list(params: ItemListParams, signal?: AbortSignal): Promise<ItemList> {
    const { data } = await http.get<unknown>('/items', { params: toQuery(params), signal });
    return itemListSchema.parse(data);
  },
  async get(id: string, signal?: AbortSignal): Promise<Item> {
    const { data } = await http.get<unknown>(`/items/${segment(id)}`, { signal });
    return itemSchema.parse(data);
  },
  async create(input: ItemFormValues): Promise<Item> {
    const { data } = await http.post<unknown>('/items', input);
    return itemSchema.parse(data);
  },
  async update(id: string, input: ItemFormValues): Promise<Item> {
    const { data } = await http.patch<unknown>(`/items/${segment(id)}`, input);
    return itemSchema.parse(data);
  },
  async remove(id: string): Promise<void> {
    await http.delete(`/items/${segment(id)}`);
  },
};
