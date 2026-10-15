import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Delete } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/spinner';
import { notify, useConfirm } from '@/core/notify';
import { focusIfLost } from '@/lib/focus';

import { useDeleteItem } from '../hooks/use-item-mutations';
import type { Item } from '../types/item';

interface DeleteItemButtonProps {
  item: Pick<Item, 'id' | 'name'>;
  /** Called after the server confirmed the delete, e.g. to leave the detail page. */
  onDeleted?: () => void;
  /** Called after the server refused the delete and the item is back (a locked item, say). */
  onRefused?: () => void;
  /**
   * Receives the button, and `null` when it goes away. A table row is removed while its delete is pending
   * and restored if the server refuses, so its caller needs the new button to give it focus.
   */
  buttonRef?: (element: HTMLButtonElement | null) => void;
  /** `icon` for table rows, `button` for page headers. */
  variant?: 'button' | 'icon';
}

/** Confirm → optimistic delete → toast (spec §8). If the server refuses, the row comes back. */
export function DeleteItemButton({
  item,
  onDeleted,
  onRefused,
  buttonRef,
  variant = 'icon',
}: DeleteItemButtonProps) {
  const { t } = useTranslation('items');
  const confirm = useConfirm();
  const deleteItem = useDeleteItem();
  const ownRef = useRef<HTMLButtonElement | null>(null);
  const attach = (element: HTMLButtonElement | null) => {
    ownRef.current = element;
    buttonRef?.(element);
  };

  // A refused delete leaves focus nowhere: this button was disabled while the request ran, so the
  // confirmation dialog could not give focus back to it. The render that reports the error enables it again.
  // (A table row that was removed and restored holds a new button: its caller handles that, see `onRefused`.)
  useEffect(() => {
    if (deleteItem.isError) focusIfLost(ownRef.current);
  }, [deleteItem.isError]);

  const handleClick = async () => {
    const confirmed = await confirm({
      title: t('delete.title', { name: item.name }),
      description: t('delete.description'),
      confirmLabel: t('delete.confirm'),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      // mutateAsync, not mutate(…, { onSuccess }): the row unmounts as soon as it is optimistically removed.
      await deleteItem.mutateAsync(item.id);
    } catch {
      // Rolled back; the global mutation handler already told the user why.
      onRefused?.();
      return;
    }
    notify.success(t('toast.deleted', { name: item.name }));
    onDeleted?.();
  };

  if (variant === 'button') {
    return (
      <Button
        ref={attach}
        variant="destructive"
        disabled={deleteItem.isPending}
        onClick={() => {
          void handleClick();
        }}
      >
        {deleteItem.isPending ? <Spinner aria-hidden="true" /> : <Delete aria-hidden="true" />}
        {t('delete.confirm')}
      </Button>
    );
  }
  return (
    <Button
      ref={attach}
      variant="ghost"
      size="icon"
      aria-label={t('actions.deleteItem', { name: item.name })}
      disabled={deleteItem.isPending}
      onClick={() => {
        void handleClick();
      }}
    >
      <Delete aria-hidden="true" />
    </Button>
  );
}
