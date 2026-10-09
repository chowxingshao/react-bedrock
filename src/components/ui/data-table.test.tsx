import type { PaginationState, SortingState, Updater } from '@tanstack/react-table';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { render, screen, within } from '@/test/render';

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

  it('keeps focus on a pager button that becomes unavailable', async () => {
    const onChange = vi.fn<(updater: Updater<PaginationState>) => void>();
    const user = userEvent.setup();

    function PagedTable() {
      const [state, setState] = useState<PaginationState>({ pageIndex: 0, pageSize: 2 });
      return (
        <DataTable
          columns={columns}
          data={people}
          pagination={{
            state,
            onChange: (updater) => {
              onChange(updater);
              setState((previous) => apply(updater, previous));
            },
            rowCount: 4,
          }}
        />
      );
    }

    render(<PagedTable />);

    const last = screen.getByRole('button', { name: 'Go to last page' });
    await user.click(last);

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    // A button that is disabled while it has focus drops focus to the page, so it stays focusable instead.
    expect(last).toHaveAttribute('aria-disabled', 'true');
    expect(last).not.toBeDisabled();
    expect(last).toHaveFocus();
    expect(onChange).toHaveBeenCalledTimes(1);

    await user.click(last);

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Go to first page' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });

  it.each([
    { name: 'Go to first page', pageIndex: 0 },
    { name: 'Go to previous page', pageIndex: 0 },
    { name: 'Go to next page', pageIndex: 1 },
    { name: 'Go to last page', pageIndex: 1 },
  ])('does nothing when "$name" is unavailable', async ({ name, pageIndex }) => {
    const onChange = vi.fn<(updater: Updater<PaginationState>) => void>();
    const user = userEvent.setup();
    const state = { pageIndex, pageSize: 2 };
    render(
      <DataTable columns={columns} data={people} pagination={{ state, onChange, rowCount: 4 }} />,
    );

    const button = screen.getByRole('button', { name });
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await user.click(button);
    await user.keyboard('{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('exposes the pager as a labelled navigation landmark', () => {
    const state = { pageIndex: 0, pageSize: 2 };
    render(
      <DataTable
        columns={columns}
        data={people}
        pagination={{ state, onChange: vi.fn(), rowCount: 4 }}
      />,
    );

    const pager = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(pager).getByRole('button', { name: 'Go to next page' })).toBeInTheDocument();
    expect(within(pager).getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('offers the current page size even when it is not one of the options', async () => {
    const user = userEvent.setup();
    const state = { pageIndex: 0, pageSize: 25 };
    render(
      <DataTable
        columns={columns}
        data={people}
        pagination={{ state, onChange: vi.fn(), rowCount: 100 }}
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Rows per page' });
    expect(trigger).toHaveTextContent('25');

    await user.click(trigger);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      '10',
      '20',
      '25',
      '50',
    ]);
  });

  it('sorts the page size options and does not duplicate the current size', async () => {
    const user = userEvent.setup();
    const state = { pageIndex: 0, pageSize: 20 };
    render(
      <DataTable
        columns={columns}
        data={people}
        pagination={{ state, onChange: vi.fn(), rowCount: 100, pageSizeOptions: [50, 20, 10] }}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Rows per page' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      '10',
      '20',
      '50',
    ]);
  });

  it('never submits an enclosing form from its sort and pager buttons', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const state = { pageIndex: 0, pageSize: 2 };
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <DataTable
          columns={columns}
          data={people}
          sorting={{ state: [], onChange: vi.fn() }}
          pagination={{ state, onChange: vi.fn(), rowCount: 4 }}
        />
      </form>,
    );

    await user.click(screen.getByRole('button', { name: /Name/ }));
    await user.click(screen.getByRole('button', { name: 'Go to next page' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
