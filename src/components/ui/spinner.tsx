import { useTranslation } from 'react-i18next';

import { Spinner as SpinnerGlyph } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  const { t } = useTranslation();
  return (
    <SpinnerGlyph
      role="status"
      aria-label={t('status.loading')}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
