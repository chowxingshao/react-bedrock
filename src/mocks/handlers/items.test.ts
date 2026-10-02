import { describe, expect, it } from 'vitest';

import { queryItems } from './items';
import { createItemFixtures } from '../fixtures/items';

const items = createItemFixtures();

describe('queryItems (mock backend logic)', () => {
  it('paginates', () => {
    const page = queryItems(items, { page: 3, pageSize: 10 });
    expect(page).toMatchObject({ total: 25, page: 3, pageSize: 10 });
    expect(page.items).toHaveLength(5);
  });

  it('searches name and description case-insensitively and filters by status', () => {
    expect(
      queryItems(items, { page: 1, pageSize: 50, q: 'DESK' }).items.map((item) => item.name),
    ).toEqual(['Desk lamp', 'Standing desk', 'Desk mat']);
    expect(
      queryItems(items, { page: 1, pageSize: 50, status: 'archived' }).items.every(
        (item) => item.status === 'archived',
      ),
    ).toBe(true);
  });

  it('sorts in either direction', () => {
    const byPrice = queryItems(items, {
      page: 1,
      pageSize: 50,
      sort: 'price',
      order: 'desc',
    }).items;
    expect(byPrice[0]?.price).toBeGreaterThanOrEqual(byPrice[1]?.price ?? 0);
    expect(
      queryItems(items, { page: 1, pageSize: 1, sort: 'name', order: 'asc' }).items[0]?.name,
    ).toBe('Backpack');
  });
});
