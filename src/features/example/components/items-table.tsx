import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { PencilIcon } from 'lucide-react';
import { type RefObject, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { createDataTableColumnHelper, DataTable } from '@/components/ui/data-table';
import { paths } from '@/config/paths';
import { Can } from '@/core/auth';
import { formatCurrency, formatNumber, formatRelative } from '@/lib/format';

import { DeleteItemButton } from './delete-item-button';
import { ItemStatusBadge } from './item-status-badge';
import { useRowFocus } from '../hooks/use-row-focus';
import type { Item, ItemList } from '../types/item';

const column = createDataTableColumnHelper<Item>();

interface ItemsTableProps {
  data: ItemList;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  /** Gets focus after a delete when no row is left to take it, e.g. the page title. */
  focusFallbackRef?: RefObject<HTMLElement | null>;
}

export function ItemsTable({
  data,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  focusFallbackRef,
}: ItemsTableProps) {
  const { t } = useTranslation('items');
  const ownFallbackRef = useRef<HTMLElement | null>(null);
  const rowFocus = useRowFocus(focusFallbackRef ?? ownFallbackRef);

  // `t` changes with the language, so headers and formatted cells re-render in the new locale.
  const columns = useMemo(
    () =>
      column.columns([
        column.accessor('name', {
          header: () => t('fields.name'),
          cell: (info) => (
            <Link
              ref={rowFocus.trackLink(info.row.original.id)}
              to={paths.items.detail(info.row.original.id)}
              className="font-medium underline-offset-4 hover:underline"
            >
              {info.getValue()}
            </Link>
          ),
        }),
        column.accessor('status', {
          header: () => t('fields.status'),
          enableSorting: false,
          cell: (info) => <ItemStatusBadge status={info.getValue()} />,
        }),
        column.accessor('price', {
          header: () => t('fields.price'),
          cell: (info) => formatCurrency(info.getValue()),
        }),
        column.accessor('quantity', {
          header: () => t('fields.quantity'),
          cell: (info) => formatNumber(info.getValue()),
        }),
        column.accessor('updatedAt', {
          header: () => t('fields.updatedAt'),
          cell: (info) => formatRelative(info.getValue()),
        }),
        column.display({
          id: 'actions',
          header: () => <span className="sr-only">{t('fields.actions')}</span>,
          cell: (info) => {
            // The rows around this one now: once it is deleted, they are what focus can go to.
            const rows = info.table.getRowModel().rows;
            const position = rows.findIndex((row) => row.id === info.row.id);
            const neighbours = {
              id: info.row.original.id,
              nextId: position < 0 ? undefined : rows[position + 1]?.id,
              previousId: position < 0 ? undefined : rows[position - 1]?.id,
            };
            const restoreFocus = () => {
              rowFocus.focusAfterDelete(neighbours);
            };
            return (
              <div className="flex justify-end gap-1">
                <Can permission="items.update">
                  <Button asChild variant="ghost" size="icon">
                    <Link
                      to={paths.items.edit(info.row.original.id)}
                      aria-label={t('actions.editItem', { name: info.row.original.name })}
                    >
                      <PencilIcon aria-hidden="true" />
                    </Link>
                  </Button>
                </Can>
                <Can permission="items.delete">
                  <DeleteItemButton
                    item={info.row.original}
                    buttonRef={rowFocus.trackDeleteButton(neighbours.id)}
                    onDeleted={restoreFocus}
                    onRefused={restoreFocus}
                  />
                </Can>
              </div>
            );
          },
        }),
      ]),
    [t, rowFocus],
  );

  return (
    <DataTable
      caption={t('list.caption')}
      columns={columns}
      data={data.items}
      getRowId={(item) => item.id}
      sorting={{ state: sorting, onChange: onSortingChange }}
      pagination={{ state: pagination, onChange: onPaginationChange, rowCount: data.total }}
    />
  );
}
