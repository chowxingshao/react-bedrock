import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui/icons';
import { SKELETON_DELAY_MS } from '@/config/constants';
import { cn } from '@/lib/cn';

import { Delayed } from './delayed';

interface PageLoaderProps {
  /** `page` fills the viewport (bootstrap, lazy routes); `section` fills its container. */
  variant?: 'page' | 'section';
  delayMs?: number;
}

/** Full-page or section loading indicator; the Suspense / HydrateFallback for lazy routes (spec §5.4). */
export function PageLoader({ variant = 'section', delayMs = SKELETON_DELAY_MS }: PageLoaderProps) {
  const { t } = useTranslation();

  return (
    <Delayed delayMs={delayMs}>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex w-full items-center justify-center text-muted-foreground',
          variant === 'page' ? 'min-h-svh' : 'min-h-48',
        )}
      >
        <Spinner aria-hidden="true" className="size-6 animate-spin" />
        <span className="sr-only">{t('status.loading')}</span>
      </div>
    </Delayed>
  );
}
