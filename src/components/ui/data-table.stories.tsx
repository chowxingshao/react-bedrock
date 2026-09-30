import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { createDataTableColumnHelper, DataTable } from './data-table';

interface Row {
  id: string;
  name: string;
  quantity: number;
}

const ALL_ROWS: Row[] = Array.from({ length: 23 }, (_, index) => ({
  id: String(index + 1),
  name: `Sample row ${String(index + 1).padStart(2, '0')}`,
  quantity: (index * 7) % 50,
}));

const column = createDataTableColumnHelper<Row>();
const columns = column.columns([
  column.accessor('name', { header: 'Name' }),
  column.accessor('quantity', { header: 'Quantity' }),
]);

/** Simulates a server: sorts and slices the rows the way an API would. */
function ServerDrivenDemo() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 });
  const [sorting, setSorting] = useState<SortingState>([]);

  const page = useMemo(() => {
    const [sort] = sorting;
    const sorted = sort
      ? [...ALL_ROWS].sort((a, b) => {
          const key = sort.id as keyof Row;
          const order = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
          return sort.desc ? -order : order;
        })
      : ALL_ROWS;
    const start = pagination.pageIndex * pagination.pageSize;
    return sorted.slice(start, start + pagination.pageSize);
  }, [pagination, sorting]);

  return (
    <DataTable
      caption="Sample rows"
      columns={columns}
      data={page}
      sorting={{ state: sorting, onChange: setSorting }}
      pagination={{
        state: pagination,
        onChange: setPagination,
        rowCount: ALL_ROWS.length,
        pageSizeOptions: [5, 10, 20],
      }}
    />
  );
}

const meta = { title: 'UI/DataTable', parameters: { layout: 'padded' } } satisfies Meta;

export default meta;
type Story = StoryObj;

export const ServerDriven: Story = { render: () => <ServerDrivenDemo /> };
export const Loading: Story = {
  render: () => <DataTable columns={columns} data={undefined} isLoading />,
};
export const Empty: Story = { render: () => <DataTable columns={columns} data={[]} /> };
