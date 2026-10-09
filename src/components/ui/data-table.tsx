import {
  type ColumnDef,
  createColumnHelper,
  type OnChangeFn,
  type PaginationState,
  type ReactTable,
  type RowData,
  type SortingState,
  useTable,
} from '@tanstack/react-table';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpDownIcon,
} from 'lucide-react';
import { type ReactNode, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState, TableSkeleton } from '@/components/feedback';
import { PAGE_SIZE_OPTIONS } from '@/config/constants';

import { Button } from './button';
import { dataTableFeatures, type DataTableFeatures } from './data-table-features';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

export type { DataTableFeatures } from './data-table-features';

/** Column helper bound to the DataTable feature set: `const col = createDataTableColumnHelper<Item>()`. */
export const createDataTableColumnHelper = <TData extends RowData>() =>
  createColumnHelper<DataTableFeatures, TData>();

export interface DataTablePaginationConfig {
  state: PaginationState;
  onChange: OnChangeFn<PaginationState>;
  /** Total number of rows on the server, used for the page count. */
  rowCount: number;
  pageSizeOptions?: readonly number[];
}

export interface DataTableSortingConfig {
  state: SortingState;
  onChange: OnChangeFn<SortingState>;
}

export interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: readonly TData[] | undefined;
  /** Shows <TableSkeleton /> instead of rows. */
  isLoading?: boolean;
  /** Shown when there are no rows. Default: <EmptyState />. */
  empty?: ReactNode;
  /** Server-side pagination. Omit it for an unpaginated table. */
  pagination?: DataTablePaginationConfig;
  /** Server-side sorting. Omit it to make every column non-sortable. */
  sorting?: DataTableSortingConfig;
  getRowId?: (row: TData, index: number) => string;
  /** Accessible caption (visually hidden). */
  caption?: string;
}

const EMPTY_ROWS: never[] = [];
const ARIA_SORT = { asc: 'ascending', desc: 'descending', none: 'none' } as const;

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUpIcon aria-hidden="true" />;
  if (direction === 'desc') return <ArrowDownIcon aria-hidden="true" />;
  return <ChevronsUpDownIcon aria-hidden="true" className="text-muted-foreground" />;
}

/**
 * Server-driven table (spec §5.3). Sorting and pagination state belong to the caller (usually the URL);
 * the table renders and reports changes. Define `columns` outside render (or memoise them).
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  isLoading = false,
  empty,
  pagination,
  sorting,
  getRowId,
  caption,
}: DataTableProps<TData>) {
  const rows = useMemo(() => (data ? [...data] : EMPTY_ROWS), [data]);

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: rows,
    getRowId,
    manualPagination: true,
    manualSorting: true,
    enableSorting: sorting !== undefined,
    rowCount: pagination?.rowCount,
    state: {
      ...(pagination ? { pagination: pagination.state } : {}),
      ...(sorting ? { sorting: sorting.state } : {}),
    },
    onPaginationChange: pagination?.onChange,
    onSortingChange: sorting?.onChange,
  });

  if (isLoading) {
    return <TableSkeleton rows={pagination?.state.pageSize ?? 5} columns={columns.length} />;
  }

  const visibleRows = table.getRowModel().rows;

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-md border">
        <Table>
          {caption ? <TableCaption className="sr-only">{caption}</TableCaption> : null}
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const direction = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      aria-sort={canSort ? ARIA_SORT[direction || 'none'] : undefined}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="-ml-3"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <table.FlexRender header={header} />
                          <SortIcon direction={direction} />
                        </Button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  {empty ?? <EmptyState className="border-0" />}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination ? (
        <DataTablePagination table={table} pageSizeOptions={pagination.pageSizeOptions} />
      ) : null}
    </div>
  );
}

function DataTablePagination<TData extends RowData>({
  table,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: {
  table: ReactTable<DataTableFeatures, TData>;
  pageSizeOptions?: readonly number[] | undefined;
}) {
  const { t } = useTranslation();
  const labelId = useId();
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = Math.max(table.getPageCount(), 1);
  // Unavailable pager buttons are `aria-disabled`, not `disabled`: a button that is disabled while it has
  // focus drops focus to the page, so an unavailable pager button stays focusable and does nothing.
  const canPreviousPage = table.getCanPreviousPage();
  const canNextPage = table.getCanNextPage();
  // The Select renders blank for a value it has no item for (e.g. a URL-driven ?pageSize=25).
  const sizes = [...new Set([...pageSizeOptions, pageSize])].sort((a, b) => a - b);

  return (
    <nav
      aria-label={t('pagination.label')}
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-muted-foreground">
        {t('pagination.total', { count: table.getRowCount() })}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span id={labelId} className="text-muted-foreground">
            {t('pagination.rowsPerPage')}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger size="sm" aria-labelledby={labelId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span aria-live="polite">{t('pagination.pageOf', { page: pageIndex + 1, pageCount })}</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-label={t('pagination.firstPage')}
            aria-disabled={!canPreviousPage}
            onClick={() => {
              if (canPreviousPage) table.firstPage();
            }}
          >
            <ChevronsLeftIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-label={t('pagination.previousPage')}
            aria-disabled={!canPreviousPage}
            onClick={() => {
              if (canPreviousPage) table.previousPage();
            }}
          >
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-label={t('pagination.nextPage')}
            aria-disabled={!canNextPage}
            onClick={() => {
              if (canNextPage) table.nextPage();
            }}
          >
            <ChevronRightIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-label={t('pagination.lastPage')}
            aria-disabled={!canNextPage}
            onClick={() => {
              if (canNextPage) table.lastPage();
            }}
          >
            <ChevronsRightIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
