import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from './confirm-provider';
import { useConfirm } from './use-confirm';

function DeleteButton({
  destructive = true,
  label = 'Delete',
}: {
  destructive?: boolean;
  label?: string;
}) {
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
        {label}
      </button>
      <output>{result}</output>
    </>
  );
}

/** A button that removes itself once the user confirms, like a delete action on a table row. */
function RemovableButton() {
  const confirm = useConfirm();
  const [removed, setRemoved] = useState(false);
  if (removed) return null;
  return (
    <button
      type="button"
      onClick={() => {
        void confirm({ title: 'Remove item?' }).then((ok) => {
          if (ok) setRemoved(true);
        });
      }}
    >
      Remove
    </button>
  );
}

/** Opens a confirmation and hands the pending promise to the test. */
function Opener({ onRequest }: { onRequest: (request: Promise<boolean>) => void }) {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={() => {
        onRequest(confirm({ title: 'Sure?' }));
      }}
    >
      Open
    </button>
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

  describe('focus', () => {
    it.each(['Cancel', 'Confirm', 'Escape'])(
      'returns to the button that opened the dialog after %s',
      async (action) => {
        const user = userEvent.setup();
        renderWithProvider();
        const trigger = screen.getByRole('button', { name: 'Delete' });

        await user.click(trigger);
        await screen.findByRole('alertdialog');
        if (action === 'Escape') await user.keyboard('{Escape}');
        else await user.click(screen.getByRole('button', { name: action }));

        await waitFor(() => {
          expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
          expect(trigger).toHaveFocus();
        });
      },
    );

    it('keeps the first opener when a second request replaces a pending one', async () => {
      const user = userEvent.setup();
      render(
        <ConfirmProvider>
          <DeleteButton />
          <DeleteButton label="Archive" />
        </ConfirmProvider>,
      );
      const first = screen.getByRole('button', { name: 'Delete' });

      await user.click(first);
      await screen.findByRole('alertdialog');
      // The dialog makes the page inert, so a real user cannot do this; a script can.
      fireEvent.click(screen.getByRole('button', { name: 'Archive', hidden: true }));
      await user.click(await screen.findByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(first).toHaveFocus();
      });
    });

    it('leaves focus alone when the app moved it while the dialog was closing', async () => {
      // Like a leave-page confirmation: the navigation it allows puts focus on the new page.
      function Page() {
        const confirm = useConfirm();
        const elsewhere = useRef<HTMLButtonElement>(null);
        return (
          <>
            <button
              type="button"
              onClick={() => {
                void confirm({ title: 'Leave?' }).then((ok) => {
                  if (ok) elsewhere.current?.focus();
                });
              }}
            >
              Leave
            </button>
            <button type="button" ref={elsewhere}>
              Elsewhere
            </button>
          </>
        );
      }
      const user = userEvent.setup();
      render(
        <ConfirmProvider>
          <Page />
        </ConfirmProvider>,
      );

      await user.click(screen.getByRole('button', { name: 'Leave' }));
      await user.click(await screen.findByRole('button', { name: 'Confirm' }));

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
    });

    it('does not fail when the opener is gone by the time the dialog closes', async () => {
      const user = userEvent.setup();
      render(
        <ConfirmProvider>
          <RemovableButton />
        </ConfirmProvider>,
      );

      await user.click(screen.getByRole('button', { name: 'Remove' }));
      await user.click(await screen.findByRole('button', { name: 'Confirm' }));

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
      });
      expect(document.body).toHaveFocus();
    });
  });

  describe('description', () => {
    it('renders without aria-describedby when there is no description', async () => {
      const user = userEvent.setup();
      render(
        <ConfirmProvider>
          <RemovableButton />
        </ConfirmProvider>,
      );

      await user.click(screen.getByRole('button', { name: 'Remove' }));

      const dialog = await screen.findByRole('alertdialog', { name: 'Remove item?' });
      expect(dialog).not.toHaveAttribute('aria-describedby');
    });

    it('describes the dialog with the description when there is one', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByRole('button', { name: 'Delete' }));

      expect(await screen.findByRole('alertdialog')).toHaveAccessibleDescription(
        'This cannot be undone.',
      );
    });
  });

  it('resolves a pending confirmation with false when the provider unmounts', async () => {
    const user = userEvent.setup();
    const settled = vi.fn();
    const { unmount } = render(
      <ConfirmProvider>
        <Opener
          onRequest={(request) => {
            void request.then(settled);
          }}
        />
      </ConfirmProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await screen.findByRole('alertdialog');
    expect(settled).not.toHaveBeenCalled();
    unmount();

    await waitFor(() => {
      expect(settled).toHaveBeenCalledExactlyOnceWith(false);
    });
  });

  it('fails loudly outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React logs the thrown error
    expect(() => render(<DeleteButton />)).toThrow(/ConfirmProvider/);
  });
});
