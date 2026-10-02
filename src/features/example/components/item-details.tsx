import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { formatCurrency, formatDateTime, formatNumber, formatRelative } from '@/lib/format';

import { ItemStatusBadge } from './item-status-badge';
import type { Item } from '../types/item';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function ItemDetails({ item }: { item: Item }) {
  const { t } = useTranslation('items');
  const { copied, copy } = useCopyToClipboard();

  return (
    <Card>
      <CardContent className="grid gap-6">
        {item.description ? <p className="text-muted-foreground">{item.description}</p> : null}
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t('fields.status')}>
            <ItemStatusBadge status={item.status} />
          </Field>
          <Field label={t('fields.price')}>{formatCurrency(item.price)}</Field>
          <Field label={t('fields.quantity')}>{formatNumber(item.quantity)}</Field>
          <Field label={t('fields.createdAt')}>{formatDateTime(item.createdAt)}</Field>
          <Field label={t('fields.updatedAt')}>{formatRelative(item.updatedAt)}</Field>
          <Field label={t('fields.id')}>
            <span className="flex items-center gap-2">
              <span className="font-mono">{item.id}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void copy(item.id);
                }}
              >
                {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
                {copied ? t('actions.copied') : t('actions.copyId')}
              </Button>
            </span>
          </Field>
        </dl>
      </CardContent>
    </Card>
  );
}
