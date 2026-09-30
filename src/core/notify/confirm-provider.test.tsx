import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from './confirm-provider';
import { useConfirm } from './use-confirm';

function DeleteButton({ destructive = true }: { destructive?: boolean }) {
  const confirm = useConfirm();
  const [result, setResult] = useState('pending');
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void confirm({
            title: 'Delete item?',
            description: 'This cannot be undone.',
            destructive,
          }).then((ok) => {
            setResult(ok ? 'confirmed' : 'cancelled');
          });
        }}
      >
        Delete
      </button>
      <output>{result}</output>
    </>
  );
}

const renderWithProvider = (destructive?: boolean) =>
  render(
    <ConfirmProvider>
      <DeleteButton destructive={destructive} />
    </ConfirmProvider>,
  );

describe('useConfirm', () => {
  it('resolves true when the user confirms', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alertdialog', { name: 'Delete item?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('confirmed')).toBeInTheDocument();
  });

  it('resolves false when the user cancels or presses Escape', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('cancelled')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');
    expect(await screen.findByText('cancelled')).toBeInTheDocument();
  });

  it('styles the confirm button as destructive only when asked to', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProvider(true);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('button', { name: 'Confirm' })).toHaveAttribute(
      'data-variant',
      'destructive',
    );
    unmount();

    renderWithProvider(false);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('button', { name: 'Confirm' })).toHaveAttribute(
      'data-variant',
      'default',
    );
  });

  it('fails loudly outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React logs the thrown error
    expect(() => render(<DeleteButton />)).toThrow(/ConfirmProvider/);
  });
});
