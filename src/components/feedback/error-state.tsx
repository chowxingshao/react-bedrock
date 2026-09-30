import { RotateCwIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { env } from '@/config/env';
import { cn } from '@/lib/cn';
import { describeError } from '@/lib/describe-error';

export interface ErrorStateProps {
  /** The error being shown. Its technical details are listed only when `showDetails` is true. */
  error?: unknown;
  title?: string;
  /** A friendly message. Defaults to a translated generic message. */
  description?: string;
  /** Shows a "Try again" button, e.g. `() => void query.refetch()`. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Show technical details. Default: development only (spec Principle 7). */
  showDetails?: boolean;
  className?: string;
}

/** Friendly error message with "Try again"; technical details only in development (spec §5.4). */
export function ErrorState({
  error,
  title,
  description,
  onRetry,
  retryLabel,
  showDetails = env.isDev,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation(['common', 'errors']);

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border p-8 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlertIcon aria-hidden="true" className="size-6" />
      </div>
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">{title ?? t('errors:generic.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {description ?? t('errors:generic.description')}
        </p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          <RotateCwIcon aria-hidden="true" />
          {retryLabel ?? t('actions.retry')}
        </Button>
      ) : null}
      {showDetails && error !== undefined ? (
        <details className="w-full max-w-2xl text-left">
          <summary className="cursor-pointer text-sm font-medium">{t('errors:details')}</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
            {describeError(error)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
