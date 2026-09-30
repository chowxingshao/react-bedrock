import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';

function SkeletonRegion({ children, className }: { children: ReactNode; className?: string }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" className={cn('w-full', className)}>
      <span className="sr-only">{t('status.loading')}</span>
      {children}
    </div>
  );
}

const range = (length: number) => Array.from({ length }, (_, index) => index);

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <SkeletonRegion className="overflow-hidden rounded-md border">
      <div className="flex gap-4 border-b bg-muted/50 p-3">
        {range(columns).map((column) => (
          <Skeleton key={column} className="h-4 flex-1" />
        ))}
      </div>
      {range(rows).map((row) => (
        <div key={row} className="flex gap-4 border-b p-3 last:border-b-0">
          {range(columns).map((column) => (
            <Skeleton key={column} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function CardSkeleton() {
  return (
    <SkeletonRegion className="grid gap-4 rounded-lg border bg-card p-6">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-9 w-24" />
    </SkeletonRegion>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <SkeletonRegion className="grid gap-4">
      {range(items).map((item) => (
        <div key={item} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <SkeletonRegion className="grid max-w-xl gap-6">
      {range(fields).map((field) => (
        <div key={field} className="grid gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-28" />
    </SkeletonRegion>
  );
}

export function DetailSkeleton() {
  return (
    <SkeletonRegion className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {range(6).map((cell) => (
          <div key={cell} className="grid gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
