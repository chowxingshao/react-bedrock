import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster as Sonner } from 'sonner';

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
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-info" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
    />
  );
}
