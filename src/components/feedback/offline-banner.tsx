import { WifiOffIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useOnlineStatus } from '@/hooks/use-online-status';

/** Shown under the header while the browser is offline (spec §7.8). */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const { t } = useTranslation();

  // The status region is always in the page, empty while online: a region that is inserted together with its
  // text is not announced by every screen reader.
  return (
    <div role="status">
      {online ? null : (
        <div className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-medium text-warning-foreground">
          <WifiOffIcon aria-hidden="true" className="size-4" />
          {t('status.offline')}
        </div>
      )}
    </div>
  );
}
