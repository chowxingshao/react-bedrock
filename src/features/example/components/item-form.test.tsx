import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppError } from '@/core/api';
import { notify } from '@/core/notify';
import { render, screen, waitFor } from '@/test/render';

import { ItemForm } from './item-form';
import type { ItemFormValues } from '../schemas/item';

describe('ItemForm', () => {
  it('shows translated validation errors and does not submit', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ItemForm submitLabel="Create item" onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Create item' }));

    expect(await screen.findByText('Use at least 2 characters')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits typed values', async () => {
    const onSubmit = vi.fn<(values: ItemFormValues) => Promise<void>>(() => Promise.resolve());
    const user = userEvent.setup();
    render(<ItemForm submitLabel="Create item" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Desk fan');
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '24.5' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '7' } });
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Desk fan',
        description: '',
        status: 'draft',
        price: 24.5,
        quantity: 7,
      });
    });
  });

  it('maps server field errors onto the fields, translated', async () => {
    const onSubmit = vi.fn(() =>
      Promise.reject(
        new AppError({
          code: 'VALIDATION_ERROR',
          message: 'Invalid',
          status: 422,
          details: { fields: { name: 'ALREADY_EXISTS' } },
        }),
      ),
    );
    const user = userEvent.setup();
    render(<ItemForm submitLabel="Create item" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Desk lamp');
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    expect(await screen.findByText('This value is already in use')).toBeInTheDocument();
  });

  it('toasts errors that carry no field details', async () => {
    const toast = vi.spyOn(notify, 'error');
    const onSubmit = vi.fn(() =>
      Promise.reject(new AppError({ code: 'SERVER_ERROR', message: 'boom', status: 500 })),
    );
    const user = userEvent.setup();
    render(<ItemForm submitLabel="Create item" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Desk lamp');
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('The server ran into a problem. Please try again later.');
    });
  });

  it('toasts a server error for a field the form does not have', async () => {
    const toast = vi.spyOn(notify, 'error');
    const onSubmit = vi.fn(() =>
      Promise.reject(
        new AppError({
          code: 'VALIDATION_ERROR',
          message: 'Invalid',
          status: 422,
          details: { fields: { sku: 'ALREADY_EXISTS' } },
        }),
      ),
    );
    const user = userEvent.setup();
    render(<ItemForm submitLabel="Create item" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Desk lamp');
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Some fields need your attention.');
    });
  });
});
