import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { act, renderHook } from '@/test/render';

import { useUrlState } from './use-url-state';

const SHAPE = {
  q: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  status: z.enum(['draft', 'active']).optional(),
};

const OTHER_SHAPE = {
  sort: z.enum(['name', 'date']).default('name'),
};

describe('useUrlState', () => {
  it('reads typed values and falls back per key', () => {
    const { result } = renderHook(() => useUrlState(SHAPE), {
      route: '/items?q=lamp&page=oops&status=active',
    });
    expect(result.current[0]).toEqual({ q: 'lamp', page: 1, status: 'active' });
  });

  it('writes changes and drops default values from the URL', async () => {
    const { result, router } = renderHook(() => useUrlState(SHAPE), {
      route: '/items?q=lamp&page=3',
    });

    await act(() => {
      result.current[1]({ q: '', page: 2 });
      return Promise.resolve();
    });

    expect(router.state.location.search).toBe('?page=2');
    expect(result.current[0]).toMatchObject({ q: '', page: 2 });
  });

  it('removes a key set to null or undefined, and a key set back to its default', async () => {
    const { result, router } = renderHook(() => useUrlState(SHAPE), {
      route: '/items?q=lamp&page=3&status=draft',
    });

    await act(() => {
      result.current[1]({ status: null, q: undefined, page: 1 });
      return Promise.resolve();
    });

    expect(router.state.location.search).toBe('');
  });

  it('leaves unrelated query parameters alone', async () => {
    const { result, router } = renderHook(() => useUrlState(SHAPE), {
      route: '/items?utm=mail&page=3',
    });

    await act(() => {
      result.current[1]({ q: 'lamp' });
      return Promise.resolve();
    });

    expect(router.state.location.search).toBe('?utm=mail&page=3&q=lamp');
  });

  it('replaces the history entry by default and pushes one when asked', async () => {
    const { result, router } = renderHook(() => useUrlState(SHAPE), { route: '/items' });

    await act(() => {
      result.current[1]({ q: 'lamp' });
      return Promise.resolve();
    });
    expect(router.state.historyAction).toBe('REPLACE');

    await act(() => {
      result.current[1]({ page: 2 }, { replace: false });
      return Promise.resolve();
    });
    expect(router.state.historyAction).toBe('PUSH');
    expect(router.state.location.search).toBe('?q=lamp&page=2');
  });

  it('keeps two writes made in the same tick', async () => {
    const { result, router } = renderHook(() => useUrlState(SHAPE), { route: '/items' });

    await act(() => {
      result.current[1]({ q: 'lamp' });
      result.current[1]({ page: 2 });
      return Promise.resolve();
    });

    expect(router.state.location.search).toBe('?q=lamp&page=2');
    expect(result.current[0]).toMatchObject({ q: 'lamp', page: 2 });
  });

  it('keeps writes made in the same tick by two hook instances', async () => {
    const { result, router } = renderHook(() => ({
      items: useUrlState(SHAPE),
      other: useUrlState(OTHER_SHAPE),
    }));

    await act(() => {
      result.current.items[1]({ q: 'lamp' });
      result.current.other[1]({ sort: 'date' });
      result.current.items[1]({ page: 4 });
      return Promise.resolve();
    });

    expect(router.state.location.search).toBe('?q=lamp&sort=date&page=4');
  });

  it('builds on the current URL again once the tick has ended', async () => {
    const { result, router } = renderHook(() => useUrlState(SHAPE), { route: '/items' });

    await act(() => {
      result.current[1]({ q: 'lamp' });
      return Promise.resolve();
    });
    await act(() => router.navigate('/items?page=5'));
    await act(() => {
      result.current[1]({ q: 'desk' });
      return Promise.resolve();
    });

    expect(router.state.location.search).toBe('?page=5&q=desk');
  });

  describe('hostile values', () => {
    it.each(['-1', '0', 'NaN', 'Infinity', '%00', '1.5', '9007199254740993', ''])(
      'falls back to the default for page=%j',
      (page) => {
        const { result } = renderHook(() => useUrlState(SHAPE), { route: `/items?page=${page}` });
        expect(result.current[0].page).toBe(1);
      },
    );

    it.each(['__proto__', 'constructor', 'toString', 'ACTIVE', 'active%00'])(
      'falls back to the default for status=%j',
      (status) => {
        const { result } = renderHook(() => useUrlState(SHAPE), {
          route: `/items?status=${status}`,
        });
        expect(result.current[0].status).toBeUndefined();
      },
    );

    it('takes the first value of a repeated key', () => {
      const { result } = renderHook(() => useUrlState(SHAPE), {
        route: '/items?page=2&page=3&q=a&q=b',
      });
      expect(result.current[0]).toMatchObject({ page: 2, q: 'a' });
    });
  });
});
