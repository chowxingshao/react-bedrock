import { DownloadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useFeature } from '@/hooks/use-feature';
import { toCsv } from '@/lib/csv';

import type { Item } from '../types/item';

/** Downloads the visible rows as CSV. Behind the `itemsExport` feature flag (spec §7.9). */
export function ExportItemsButton({ items }: { items: readonly Item[] | undefined }) {
  const { t } = useTranslation('items');
  const enabled = useFeature('itemsExport');
  if (!enabled) return null;

  const download = () => {
    const csv = toCsv([
      [t('fields.name'), t('fields.status'), t('fields.price'), t('fields.quantity')],
      ...(items ?? []).map((item) => [
        item.name,
        t(`status.${item.status}`),
        item.price,
        item.quantity,
      ]),
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'items.csv';
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  };

  return (
    <Button variant="outline" disabled={!items?.length} onClick={download}>
      <DownloadIcon aria-hidden="true" />
      {t('actions.export')}
    </Button>
  );
}
