import { http as mock, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { isAppError } from '@/core/api';
import { apiUrl } from '@/mocks/api-url';
import { mockDb } from '@/mocks/db';
import { MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { server } from '@/mocks/server';
import { act, renderHook, waitFor } from '@/test/render';

import { useCreateItem, useDeleteItem, useGetItem } from './generated/endpoints/items/items';

describe('Orval-generated client', () => {
  beforeEach(() => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
  });

  it('fetches through the shared instance, so the interceptors add their headers', async () => {
    let requestId: string | null = null;
    let language: string | null = null;
    server.use(
      mock.get(apiUrl('/items/:itemId'), ({ request, params }) => {
        requestId = request.headers.get('x-request-id');
        language = request.headers.get('accept-language');
        return HttpResponse.json({
          id: String(params.itemId),
          name: 'Generated',
          description: '',
          status: 'active',
          price: 1,
          quantity: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        });
      }),
    );

    const { result } = renderHook(() => useGetItem('item-001'));

    await waitFor(() => {
      expect(result.current.data?.name).toBe('Generated');
    });
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(language).toBe('en');
  });

  it('receives normalised AppErrors', async () => {
    const { result } = renderHook(() => useGetItem('does-not-exist'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(isAppError(result.current.error)).toBe(true);
    expect(result.current.error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('encodes path parameters, like the hand-written client', async () => {
    let path: string | null = null;
    server.use(
      mock.get(apiUrl('/items/:itemId'), ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
      }),
    );

    const { result } = renderHook(() => useGetItem('a/b?c#d'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(path).toBe('/api/items/a%2Fb%3Fc%23d');
  });

  it('sends a write only when the mutation is called, not when the hook mounts', async () => {
    let created = 0;
    server.use(
      mock.post(apiUrl('/items'), () => {
        created += 1;
        return HttpResponse.json({ code: 'VALIDATION_ERROR' }, { status: 422 });
      }),
    );

    const { result } = renderHook(() => useCreateItem({ mutation: { meta: { silent: true } } }));

    expect(result.current.isIdle).toBe(true);
    expect(created).toBe(0);
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          data: { name: 'Generated', description: '', status: 'draft', price: 1, quantity: 1 },
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 422 });
    });
    expect(created).toBe(1);
  });

  it('deletes through the shared instance and reports a refusal as an AppError', async () => {
    const { result } = renderHook(() => useDeleteItem({ mutation: { meta: { silent: true } } }));

    await act(async () => {
      await result.current.mutateAsync({ itemId: 'item-001' });
    });
    expect(mockDb.items.some((item) => item.id === 'item-001')).toBe(false);

    await act(async () => {
      await expect(result.current.mutateAsync({ itemId: 'item-locked' })).rejects.toSatisfy(
        (error: unknown) => isAppError(error) && error.code === 'ITEM_LOCKED',
      );
    });
  });
});
