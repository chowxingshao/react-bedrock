import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster as Sonner } from 'sonner';

import { Error, Info, Spinner, Success, Warning } from '@/components/ui/icons';
import { useThemeMode } from '@/stores/theme-store';

const TOKEN_STYLE = {
  '--normal-bg': 'var(--popover)',
  '--normal-text': 'var(--popover-foreground)',
  '--normal-border': 'var(--border)',
  '--border-radius': 'var(--radius)',
  zIndex: 'var(--z-toast)',
} as CSSProperties;

/** The single toast outlet (spec §7.5): mounted once in AppProviders and styled with design tokens. */
export function Toaster() {
  const mode = useThemeMode();
  const { t } = useTranslation();

  return (
    <Sonner
      theme={mode}
      className="toaster group"
      containerAriaLabel={t('notifications.label')}
      style={TOKEN_STYLE}
      icons={{
        success: <Success className="size-4 text-success" />,
        info: <Info className="size-4 text-info" />,
        warning: <Warning className="size-4 text-warning" />,
        error: <Error className="size-4 text-destructive" />,
        loading: <Spinner className="size-4 animate-spin" />,
      }}
    />
  );
}
