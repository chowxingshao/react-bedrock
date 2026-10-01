import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { act, renderHook } from '@/test/render';

import { usePagination } from './use-pagination';
import { useUrlState } from './use-url-state';

const FILTERS = { q: z.string().default('') };

describe('usePagination', () => {
  it('maps ?page=&pageSize= to DataTable pagination state and back', async () => {
    const { result, router } = renderHook(() => usePagination(), {
      route: '/items?page=3&pageSize=20',
    });
    expect(result.current.pagination).toEqual({ pageIndex: 2, pageSize: 20 });

    await act(() => {
      result.current.setPagination((old) => ({ ...old, pageIndex: old.pageIndex + 1 }));
      return Promise.resolve();
    });
    expect(router.state.location.search).toBe('?page=4&pageSize=20');

    await act(() => {
      result.current.resetPage();
      return Promise.resolve();
    });
    expect(router.state.location.search).toBe('?pageSize=20');
  });

  it('ignores unsupported page sizes', () => {
    const { result } = renderHook(() => usePagination(), { route: '/items?pageSize=7' });
    expect(result.current.pagination).toEqual({ pageIndex: 0, pageSize: 10 });
  });

  it('pushes a history entry for a page change', async () => {
    const { result, router } = renderHook(() => usePagination(), { route: '/items' });

    await act(() => {
      result.current.setPagination({ pageIndex: 1, pageSize: 10 });
      return Promise.resolve();
    });

    expect(router.state.historyAction).toBe('PUSH');
    expect(router.state.location.search).toBe('?page=2');
  });

  it('keeps a new search term when resetPage() is called in the same handler', async () => {
    const { result, router } = renderHook(
      () => ({ filters: useUrlState(FILTERS), paging: usePagination() }),
      { route: '/items?page=3&pageSize=20' },
    );

    await act(() => {
      result.current.filters[1]({ q: 'lamp' });
      result.current.paging.resetPage();
      return Promise.resolve();
    });

    expect(router.state.location.search).toBe('?pageSize=20&q=lamp');
    expect(result.current.paging.pagination).toEqual({ pageIndex: 0, pageSize: 20 });
  });

  it('keeps the reset when the search term is written after it', async () => {
    const { result, router } = renderHook(
      () => ({ filters: useUrlState(FILTERS), paging: usePagination() }),
      { route: '/items?page=3' },
    );

    await act(() => {
      result.current.paging.resetPage();
      result.current.filters[1]({ q: 'lamp' });
      return Promise.resolve();
    });

    expect(router.state.location.search).toBe('?q=lamp');
  });
});
