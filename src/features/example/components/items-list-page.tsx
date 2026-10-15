import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { z } from 'zod';

import { EmptyState, QueryState, TableSkeleton } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Add } from '@/components/ui/icons';
import { SEARCH_DEBOUNCE_MS } from '@/config/constants';
import { paths } from '@/config/paths';
import { Can } from '@/core/auth';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { PAGINATION_SHAPE, usePagination } from '@/hooks/use-pagination';
import { useUrlState } from '@/hooks/use-url-state';

import { ExportItemsButton } from './export-items-button';
import { ItemsTable } from './items-table';
import { ItemsToolbar } from './items-toolbar';
import { useItems } from '../hooks/use-items';
import { ITEM_SORT_FIELDS, ITEM_STATUSES, type ItemSortField } from '../types/item';

/** Everything the list keeps in the URL, so any view can be bookmarked or shared (spec §8). */
const FILTERS_SHAPE = {
  ...PAGINATION_SHAPE,
  q: z.string().default(''),
  status: z.enum(ITEM_STATUSES).optional(),
  sort: z.enum(ITEM_SORT_FIELDS).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
};

const isSortField = (value: string): value is ItemSortField =>
  (ITEM_SORT_FIELDS as readonly string[]).includes(value);

export function ItemsListPage() {
  const { t } = useTranslation('items');
  const [filters, setFilters] = useUrlState(FILTERS_SHAPE);
  const { pagination, setPagination } = usePagination();
  // Where focus goes after a delete when no row is left to take it.
  const titleRef = useRef<HTMLHeadingElement>(null);

  // The input answers every keystroke; the URL (and therefore the request) updates when typing pauses.
  const [search, setSearch] = useState(filters.q);
  const committedSearch = useRef(filters.q);
  const commitSearch = useDebouncedCallback((value: string) => {
    committedSearch.current = value.trim();
    setFilters({ q: committedSearch.current, page: null });
  }, SEARCH_DEBOUNCE_MS);
  // Back and Forward change the URL without going through the input: show what the URL now says.
  useEffect(() => {
    if (filters.q === committedSearch.current) return;
    committedSearch.current = filters.q;
    commitSearch.cancel();
    setSearch(filters.q);
  }, [filters.q, commitSearch]);

  const query = useItems({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    q: filters.q || undefined,
    status: filters.status,
    sort: filters.sort,
    order: filters.sort ? filters.order : undefined,
  });

  // A page past the end has no rows: a stale link, or the last row of the last page was just deleted.
  // Go to the last page that exists instead of leaving the user on an empty one.
  const lastPage = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.pageSize)) : 1;
  const isPastTheEnd =
    query.data !== undefined && !query.isPlaceholderData && filters.page > lastPage;
  useEffect(() => {
    if (isPastTheEnd) setFilters({ page: lastPage });
  }, [isPastTheEnd, lastPage, setFilters]);

  const sorting = filters.sort ? [{ id: filters.sort, desc: filters.order === 'desc' }] : [];
  const hasFilters = filters.q !== '' || filters.status !== undefined;

  const clearFilters = () => {
    commitSearch.cancel();
    setSearch('');
    committedSearch.current = '';
    setFilters({ q: null, status: null, page: null });
  };

  const createButton = (
    <Can permission="items.create">
      <Button asChild>
        <Link to={paths.items.create()}>
          <Add aria-hidden="true" />
          {t('actions.create')}
        </Link>
      </Button>
    </Can>
  );

  return (
    <>
      <PageHeader
        title={t('list.title')}
        titleRef={titleRef}
        description={t('list.description')}
        actions={
          <>
            <ExportItemsButton items={query.data?.items} />
            {createButton}
          </>
        }
      />
      <ItemsToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          commitSearch.run(value);
        }}
        status={filters.status}
        onStatusChange={(status) => {
          setFilters({ status: status ?? null, page: null });
        }}
        isFetching={query.isFetching && !query.isPending}
      />
      <QueryState
        query={query}
        loading={<TableSkeleton rows={pagination.pageSize} columns={6} />}
        isEmpty={(data) => data.total === 0}
        empty={
          hasFilters ? (
            <EmptyState
              title={t('list.noResultsTitle')}
              description={t('list.noResultsDescription')}
              action={
                <Button variant="outline" onClick={clearFilters}>
                  {t('list.clearFilters')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={t('list.emptyTitle')}
              description={t('list.emptyDescription')}
              action={createButton}
            />
          )
        }
      >
        {(data) =>
          // A page past the end has no rows, and the effect above is moving the user back: show the
          // skeleton meanwhile, not an empty table that sits next to "25 total".
          data.items.length === 0 && (isPastTheEnd || query.isPlaceholderData) ? (
            <TableSkeleton rows={pagination.pageSize} columns={6} />
          ) : (
            <ItemsTable
              data={data}
              pagination={pagination}
              onPaginationChange={setPagination}
              focusFallbackRef={titleRef}
              sorting={sorting}
              onSortingChange={(updater) => {
                const [next] = typeof updater === 'function' ? updater(sorting) : updater;
                setFilters({
                  sort: next && isSortField(next.id) ? next.id : null,
                  order: next?.desc ? 'desc' : 'asc',
                  page: null,
                });
              }}
            />
          )
        }
      </QueryState>
    </>
  );
}
