import { z } from 'zod';

import { ITEM_STATUSES } from '../types/item';

/** API response validation (spec Principle 6): the contract is checked where data enters the app. */
export const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(ITEM_STATUSES),
  price: z.number(),
  quantity: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const itemListSchema = z.object({
  items: z.array(itemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

/** The create/edit form. Messages come from the global Zod error map, translated. */
export const itemFormSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500),
  status: z.enum(ITEM_STATUSES),
  price: z.number().min(0).max(1_000_000),
  quantity: z.number().int().min(0).max(1_000_000),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;

export const ITEM_FORM_DEFAULTS: ItemFormValues = {
  name: '',
  description: '',
  status: 'draft',
  price: 0,
  quantity: 0,
};
