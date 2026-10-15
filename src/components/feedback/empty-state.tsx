import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Empty, type IconComponent } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: IconComponent;
  /** Optional call to action, e.g. <Button>Create item</Button>. */
  action?: ReactNode;
  /**
   * Level of the title: 2 under the page's own h1 (default), 1 when this view stands in for the
   * whole page and there is no other h1.
   */
  headingLevel?: 1 | 2;
  className?: string;
}

/** Icon, title, description and optional action for "no data" (spec §5.4). */
export function EmptyState({
  title,
  description,
  icon: Icon = Empty,
  action,
  headingLevel = 2,
  className,
}: EmptyStateProps) {
  const { t } = useTranslation();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

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
        <Heading className="text-lg font-semibold">{title ?? t('states.empty.title')}</Heading>
        <p className="text-sm text-muted-foreground">
          {description ?? t('states.empty.description')}
        </p>
      </div>
      {action}
    </div>
  );
}
