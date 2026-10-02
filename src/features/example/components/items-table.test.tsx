import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { formatCurrency } from '@/lib/format';
import { createItemFixtures } from '@/mocks/fixtures/items';
import { render, screen, within } from '@/test/render';

import { ItemsTable } from './items-table';

const items = createItemFixtures().slice(0, 3);
const data = { items, total: 25, page: 1, pageSize: 3 };

const renderTable = (auth: 'admin' | 'viewer', onSortingChange = vi.fn()) =>
  render(
    <ItemsTable
      data={data}
      pagination={{ pageIndex: 0, pageSize: 3 }}
      onPaginationChange={vi.fn()}
      sorting={[]}
      onSortingChange={onSortingChange}
    />,
    { auth },
  );

describe('ItemsTable', () => {
  it('renders formatted rows that link to the details', async () => {
    renderTable('admin');

    const row = (await screen.findByRole('link', { name: 'Desk lamp' })).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText(formatCurrency(9.5))).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Desk lamp' })).toHaveAttribute(
      'href',
      '/items/item-001',
    );
    expect(screen.getByText('25 total')).toBeInTheDocument();
  });

  it('shows edit and delete only to users allowed to use them', async () => {
    renderTable('viewer');
    await screen.findByRole('link', { name: 'Desk lamp' });

    expect(screen.queryByRole('link', { name: 'Edit Desk lamp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Desk lamp' })).not.toBeInTheDocument();
  });

  it('asks for server-side sorting when a header is clicked', async () => {
    const onSortingChange = vi.fn();
    const user = userEvent.setup();
    renderTable('admin', onSortingChange);

    await user.click(await screen.findByRole('button', { name: /Price/ }));

    expect(onSortingChange).toHaveBeenCalledTimes(1);
  });
});
