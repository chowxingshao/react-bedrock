import { Trash2Icon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { notify, useConfirm } from '@/core/notify';

import { useDeleteItem } from '../hooks/use-item-mutations';
import type { Item } from '../types/item';

interface DeleteItemButtonProps {
  item: Pick<Item, 'id' | 'name'>;
  /** Called after the server confirmed the delete, e.g. to leave the detail page. */
  onDeleted?: () => void;
  /** `icon` for table rows, `button` for page headers. */
  variant?: 'button' | 'icon';
}

/** Confirm → optimistic delete → toast (spec §8). If the server refuses, the row comes back. */
export function DeleteItemButton({ item, onDeleted, variant = 'icon' }: DeleteItemButtonProps) {
  const { t } = useTranslation('items');
  const confirm = useConfirm();
  const deleteItem = useDeleteItem();

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
      notify.success(t('toast.deleted', { name: item.name }));
      onDeleted?.();
    } catch {
      // Rolled back; the global mutation handler already told the user why.
    }
  };

  if (variant === 'button') {
    return (
      <Button
        variant="destructive"
        disabled={deleteItem.isPending}
        onClick={() => {
          void handleClick();
        }}
      >
        {deleteItem.isPending ? <Spinner aria-hidden="true" /> : <Trash2Icon aria-hidden="true" />}
        {t('delete.confirm')}
      </Button>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t('actions.deleteItem', { name: item.name })}
      disabled={deleteItem.isPending}
      onClick={() => {
        void handleClick();
      }}
    >
      <Trash2Icon aria-hidden="true" />
    </Button>
  );
}
