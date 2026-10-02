import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { PencilIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { createDataTableColumnHelper, DataTable } from '@/components/ui/data-table';
import { paths } from '@/config/paths';
import { Can } from '@/core/auth';
import { formatCurrency, formatNumber, formatRelative } from '@/lib/format';

import { DeleteItemButton } from './delete-item-button';
import { ItemStatusBadge } from './item-status-badge';
import type { Item, ItemList } from '../types/item';

const column = createDataTableColumnHelper<Item>();

interface ItemsTableProps {
  data: ItemList;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}

export function ItemsTable({
  data,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
}: ItemsTableProps) {
  const { t } = useTranslation('items');

  // `t` changes with the language, so headers and formatted cells re-render in the new locale.
  const columns = useMemo(
    () =>
      column.columns([
        column.accessor('name', {
          header: () => t('fields.name'),
          cell: (info) => (
            <Link
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
          cell: (info) => (
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
                <DeleteItemButton item={info.row.original} />
              </Can>
            </div>
          ),
        }),
      ]),
    [t],
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
