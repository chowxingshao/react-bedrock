import type { PaginationState, SortingState, Updater } from '@tanstack/react-table';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/render';

import { createDataTableColumnHelper, DataTable } from './data-table';

interface Person {
  id: string;
  name: string;
  age: number;
}

const people: Person[] = [
  { id: '1', name: 'Ada', age: 36 },
  { id: '2', name: 'Grace', age: 45 },
];

const column = createDataTableColumnHelper<Person>();
const columns = column.columns([
  column.accessor('name', { header: 'Name' }),
  column.accessor('age', { header: 'Age', enableSorting: false }),
]);

const apply = <T,>(updater: Updater<T>, old: T): T =>
  typeof updater === 'function' ? (updater as (previous: T) => T)(old) : updater;

describe('DataTable', () => {
  it('renders headers and cells', () => {
    render(<DataTable columns={columns} data={people} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Grace' })).toBeInTheDocument();
  });

  it('shows the table skeleton while loading', () => {
    render(<DataTable columns={columns} data={undefined} isLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('shows the empty state when there are no rows', () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
  });

  it('reports sorting changes from sortable headers only', async () => {
    const onChange = vi.fn<(updater: Updater<SortingState>) => void>();
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={people} sorting={{ state: [], onChange }} />);

    expect(screen.queryByRole('button', { name: /Age/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Name/ }));

    const update = onChange.mock.calls[0]?.[0];
    expect(update && apply(update, [])).toEqual([expect.objectContaining({ id: 'name' })]);
  });

  it('reports page changes and shows the page position', async () => {
    const onChange = vi.fn<(updater: Updater<PaginationState>) => void>();
    const user = userEvent.setup();
    const state = { pageIndex: 0, pageSize: 2 };
    render(
      <DataTable columns={columns} data={people} pagination={{ state, onChange, rowCount: 4 }} />,
    );

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to next page' }));

    const update = onChange.mock.calls[0]?.[0];
    expect(update && apply(update, state)).toEqual({ pageIndex: 1, pageSize: 2 });
  });
});
