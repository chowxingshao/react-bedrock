import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';

import type { ItemStatus } from '../types/item';

const VARIANT = {
  draft: 'secondary',
  active: 'success',
  archived: 'outline',
} as const satisfies Record<ItemStatus, 'outline' | 'secondary' | 'success'>;

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const { t } = useTranslation('items');
  return <Badge variant={VARIANT[status]}>{t(`status.${status}`)}</Badge>;
}
