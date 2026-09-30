import { InboxIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** Optional call to action, e.g. <Button>Create item</Button>. */
  action?: ReactNode;
  className?: string;
}

/** Icon, title, description and optional action for "no data" (spec §5.4). */
export function EmptyState({
  title,
  description,
  icon: Icon = InboxIcon,
  action,
  className,
}: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">{title ?? t('states.empty.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {description ?? t('states.empty.description')}
        </p>
      </div>
      {action}
    </div>
  );
}
