import { SearchIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

import { ITEM_STATUSES, type ItemStatus } from '../types/item';

const ALL = 'all';
const isItemStatus = (value: string): value is ItemStatus =>
  (ITEM_STATUSES as readonly string[]).includes(value);

interface ItemsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: ItemStatus | undefined;
  onStatusChange: (value: ItemStatus | undefined) => void;
  /** A background refetch is running (e.g. the next page or a new search). */
  isFetching: boolean;
}

export function ItemsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  isFetching,
}: ItemsToolbarProps) {
  const { t } = useTranslation('items');

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-sm">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          className="ps-9"
          value={search}
          aria-label={t('list.searchLabel')}
          placeholder={t('list.searchPlaceholder')}
          onChange={(event) => {
            onSearchChange(event.target.value);
          }}
        />
      </div>
      <Select
        value={status ?? ALL}
        onValueChange={(value) => {
          onStatusChange(isItemStatus(value) ? value : undefined);
        }}
      >
        <SelectTrigger className="w-44" aria-label={t('list.statusLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('list.allStatuses')}</SelectItem>
          {ITEM_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`status.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isFetching ? (
        <Spinner className="text-muted-foreground" aria-label={t('list.refreshing')} />
      ) : null}
    </div>
  );
}
