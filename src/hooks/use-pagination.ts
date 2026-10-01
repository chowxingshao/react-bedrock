import type { OnChangeFn, PaginationState } from '@tanstack/react-table';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/config/constants';

import { useUrlState } from './use-url-state';

const isPageSize = (size: number) => (PAGE_SIZE_OPTIONS as readonly number[]).includes(size);

const PAGINATION_SHAPE = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().refine(isPageSize).default(DEFAULT_PAGE_SIZE),
};

/** Page and page size synced with `?page=&pageSize=` (spec §7.8), shaped for <DataTable pagination>. */
export function usePagination() {
  const [params, setParams] = useUrlState(PAGINATION_SHAPE);

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: params.page - 1, pageSize: params.pageSize }),
    [params.page, params.pageSize],
  );

  const setPagination = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      setParams({ page: next.pageIndex + 1, pageSize: next.pageSize }, { replace: false });
    },
    [pagination, setParams],
  );

  /** Back to page 1; call it when filters or search change. */
  const resetPage = useCallback(() => {
    setParams({ page: 1 });
  }, [setParams]);

  return { pagination, setPagination, resetPage };
}
