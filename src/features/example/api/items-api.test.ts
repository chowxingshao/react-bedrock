import { http as mock, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { apiUrl } from '@/mocks/api-url';
import { mockDb } from '@/mocks/db';
import { MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { server } from '@/mocks/server';

import { itemsApi } from './items-api';

describe('itemsApi', () => {
  beforeEach(() => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
  });

  it('sends only the list parameters that are set', async () => {
    let search = '';
    server.use(
      mock.get(apiUrl('/items'), ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({ items: [], total: 0, page: 2, pageSize: 10 });
      }),
    );

    await itemsApi.list({ page: 2, pageSize: 10, q: '', status: 'active' });

    expect(search).toBe('?page=2&pageSize=10&status=active');
  });

  it('rejects responses that break the contract', async () => {
    server.use(mock.get(apiUrl('/items/x'), () => HttpResponse.json({ id: 'x' })));
    await expect(itemsApi.get('x')).rejects.toThrow();
  });

  it('creates, reads and deletes against the mock backend', async () => {
    const created = await itemsApi.create({
      name: 'Brand new',
      description: '',
      status: 'draft',
      price: 5,
      quantity: 1,
    });

    await expect(itemsApi.get(created.id)).resolves.toMatchObject({ name: 'Brand new' });
    await itemsApi.remove(created.id);
    await expect(itemsApi.get(created.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('surfaces duplicate names as field errors', async () => {
    await expect(
      itemsApi.create({
        name: 'desk lamp',
        description: '',
        status: 'draft',
        price: 1,
        quantity: 1,
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { fields: { name: 'ALREADY_EXISTS' } },
    });
  });
});
