import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ITEM_FORM_DEFAULTS, itemFormSchema, itemListSchema } from './item';

const valid = {
  name: 'Desk lamp',
  description: '',
  status: 'active',
  price: 19.99,
  quantity: 3,
} as const;

describe('itemFormSchema', () => {
  it('accepts a valid item and the empty defaults fail with translated messages', () => {
    expect(itemFormSchema.parse(valid)).toEqual(valid);

    const result = itemFormSchema.safeParse(ITEM_FORM_DEFAULTS);
    expect(result.success).toBe(false);
    expect(z.flattenError(result.error!).fieldErrors.name).toEqual(['Use at least 2 characters']);
  });

  it('rejects negative numbers and non-numbers', () => {
    const result = itemFormSchema.safeParse({ ...valid, price: -1, quantity: Number.NaN });
    expect(z.flattenError(result.error!).fieldErrors).toMatchObject({
      price: ['Must be at least 0'],
      quantity: ['Enter a valid value'],
    });
  });
});

describe('itemListSchema', () => {
  it('validates list responses at the API boundary', () => {
    expect(itemListSchema.safeParse({ items: [], total: 0, page: 1, pageSize: 10 }).success).toBe(
      true,
    );
    expect(itemListSchema.safeParse({ items: [{ id: 1 }], total: 'x' }).success).toBe(false);
  });
});
